import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';
import * as pathModule from 'path';
import { mkdir, readdir, rm, stat } from 'fs/promises';
import { zip, COMPRESSION_LEVEL } from 'zip-a-folder';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

/**
 * Trabajo "Pendrive del coche": recibe una selección de carpetas y ficheros de la
 * Cloud, recodifica todo el audio a MP3 con un bitrate menor, lo empaqueta en un
 * .zip dentro de `cloud/01_CONVERTIDOS` y deja el zip listo para descargar.
 *
 * Solo hay un trabajo a la vez (la Pi no da para más). El estado vive en memoria:
 * el frontend lo consulta con `getStatus()` y además recibe el progreso por websocket.
 */

export const CAR_USB_OUTPUT_FOLDER = 'cloud/01_CONVERTIDOS';
export const carUsbBitrateList = [64, 96, 112, 128, 144, 160, 192, 224, 256, 320] as const;
export type CarUsbBitrate = typeof carUsbBitrateList[number];

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.oga', '.opus', '.wma', '.aac', '.aiff', '.aif'];
const MAX_LOG_LINES = 5000;

export type CarUsbState = 'idle' | 'scanning' | 'converting' | 'zipping' | 'done' | 'error' | 'cancelled';

export interface CarUsbSnapshot {
  type: 'car_usb_progress';
  state: CarUsbState;
  /** Fichero que se está convirtiendo ahora (ruta dentro del zip). */
  currentFile: string;
  /** 0-100 del fichero actual, -1 si ffmpeg no conoce la duración. */
  currentPercent: number;
  /** Ficheros ya procesados (convertidos o fallidos). */
  done: number;
  total: number;
  errors: number;
  bitrate: number;
  /** Ruta relativa a la raíz de la Cloud del zip resultante (p. ej. `cloud/01_CONVERTIDOS/x.zip`). */
  zipPath: string;
  message: string;
  /** Identificador del trabajo (instante de arranque, 0 si no ha habido ninguno). Cambia con cada conversión. */
  jobId: number;
}

interface FileTask {
  /** Ruta absoluta del fichero original. */
  from: string;
  /** Ruta relativa dentro del zip, ya con extensión .mp3. */
  zipRelative: string;
}

const isAudioFile = (name: string) => AUDIO_EXTENSIONS.includes(pathModule.extname(name).toLowerCase());
const toMp3Name = (name: string) => `${name.slice(0, name.length - pathModule.extname(name).length)}.mp3`;
const pad = (n: number) => n.toString().padStart(2, '0');
const stampNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
};

/** Mensaje de error de ffmpeg en una sola línea y sin la ruta absoluta del servidor. */
const cleanFfmpegError = (err: unknown): string => {
  const raw = String((err as Error)?.message ?? err ?? '');
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] ?? 'error desconocido';
  // ffmpeg suele terminar con "<ruta absoluta>: <motivo>"; nos quedamos con el motivo.
  const reason = last.replace(/^ffmpeg exited with code \d+:\s*/, '').replace(/^.*[\\/][^\\/]*:\s+/, '');
  return reason || last;
};

export class CarUsbMp3Job {
  static Instance: CarUsbMp3Job;

  private snapshot: CarUsbSnapshot = CarUsbMp3Job.emptySnapshot();
  private logLines: string[] = [];
  /** Número de líneas descartadas por el tope MAX_LOG_LINES (para que los índices sigan siendo válidos). */
  private logOffset = 0;
  private currentCommand: FfmpegCommand | null = null;
  private isCancelRequested = false;

  constructor(
    private getCloudRootPath: () => string,
    private broadcast: (data: CarUsbSnapshot) => void = () => {},
  ) {
    CarUsbMp3Job.Instance = this;
  }

  private static emptySnapshot(): CarUsbSnapshot {
    return { type: 'car_usb_progress', state: 'idle', currentFile: '', currentPercent: 0, done: 0, total: 0, errors: 0, bitrate: 0, zipPath: '', message: '', jobId: 0 };
  }

  isRunning = (): boolean => ['scanning', 'converting', 'zipping'].includes(this.snapshot.state);

  getStatus = (logFrom: number = 0) => {
    const start = Math.max(0, logFrom - this.logOffset);
    return {
      ...this.snapshot,
      log: this.logLines.slice(start),
      logNext: this.logOffset + this.logLines.length,
    };
  };

  // Utils. --------------------------------------------------------------------

  private log = (line: string) => {
    this.logLines.push(line);
    if (this.logLines.length > MAX_LOG_LINES) {
      const toDrop = this.logLines.length - MAX_LOG_LINES;
      this.logLines.splice(0, toDrop);
      this.logOffset += toDrop;
    }
  };

  private update = (partial: Partial<CarUsbSnapshot>) => {
    this.snapshot = { ...this.snapshot, ...partial };
    try { this.broadcast(this.snapshot); } catch { /* el websocket nunca debe romper el trabajo */ }
  };

  /** Convierte una ruta relativa de la Cloud en absoluta, rechazando las que se salgan de la raíz. */
  private toSafeAbsolute = (relativePath: string): string | null => {
    const root = pathModule.resolve(this.getCloudRootPath());
    const absolute = pathModule.resolve(root, relativePath);
    if (absolute !== root && !absolute.startsWith(root + pathModule.sep)) return null;
    return absolute;
  };

  // Escaneo. ------------------------------------------------------------------

  /** Recorre una carpeta y añade sus ficheros de audio, manteniendo la estructura bajo `zipPrefix`. */
  private scanFolder = async (absoluteFolder: string, zipPrefix: string, tasks: FileTask[]): Promise<void> => {
    let entries: string[] = [];
    try {
      entries = (await readdir(absoluteFolder)).sort((a, b) => a.localeCompare(b));
    } catch (err) {
      this.log(`⚠ No se pudo leer la carpeta ${zipPrefix}: ${err}`);
      return;
    }
    for (const entry of entries) {
      if (this.isCancelRequested) return;
      if (entry.startsWith('.')) continue; // Ficheros ocultos fuera.
      const absolute = `${absoluteFolder}/${entry}`;
      try {
        const info = await stat(absolute);
        if (info.isDirectory()) {
          await this.scanFolder(absolute, `${zipPrefix}/${entry}`, tasks);
        } else if (isAudioFile(entry)) {
          tasks.push({ from: absolute, zipRelative: `${zipPrefix}/${toMp3Name(entry)}` });
        } else {
          this.log(`· Ignorado (no es audio): ${zipPrefix}/${entry}`);
        }
      } catch (err) {
        this.log(`⚠ No se pudo leer ${zipPrefix}/${entry}: ${err}`);
      }
    }
  };

  private buildTaskList = async (relativeItems: string[]): Promise<FileTask[]> => {
    const tasks: FileTask[] = [];
    const usedTopNames = new Set<string>();
    // Evita que dos elementos con el mismo nombre (de carpetas distintas) se pisen en el zip.
    const uniqueTopName = (name: string) => {
      const ext = pathModule.extname(name);
      const base = name.slice(0, name.length - ext.length);
      let candidate = name;
      for (let i = 2; usedTopNames.has(candidate.toLowerCase()); i++) candidate = `${base} (${i})${ext}`;
      usedTopNames.add(candidate.toLowerCase());
      return candidate;
    };

    for (const relativeItem of relativeItems) {
      if (this.isCancelRequested) break;
      const absolute = this.toSafeAbsolute(relativeItem);
      if (!absolute) { this.log(`⚠ Ruta no válida: ${relativeItem}`); continue; }
      try {
        const info = await stat(absolute);
        const name = pathModule.basename(absolute);
        if (info.isDirectory()) {
          await this.scanFolder(absolute, uniqueTopName(name), tasks);
        } else if (isAudioFile(name)) {
          tasks.push({ from: absolute, zipRelative: uniqueTopName(toMp3Name(name)) });
        } else {
          this.log(`· Ignorado (no es audio): ${relativeItem}`);
        }
      } catch (err) {
        this.log(`⚠ No existe o no se puede leer: ${relativeItem}`);
      }
    }
    return tasks;
  };

  // Conversión. ---------------------------------------------------------------

  private convertFile = (task: FileTask, outputPath: string, bitrate: number): Promise<void> => new Promise<void>((resolve, reject) => {
    const command = ffmpeg(task.from)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(bitrate)
      .audioFrequency(44100)
      // Conserva las etiquetas y usa ID3v2.3, que es lo que mejor leen las radios de coche.
      .outputOptions('-map_metadata', '0', '-id3v2_version', '3')
      .format('mp3')
      .on('progress', (prog: any) => {
        const raw = prog?.percent;
        const currentPercent = (typeof raw === 'number' && !isNaN(raw)) ? Math.min(100, Math.max(0, Math.round(raw))) : -1;
        this.update({ currentPercent });
      })
      .on('error', (err: Error) => { this.currentCommand = null; reject(err); })
      .on('end', () => { this.currentCommand = null; resolve(); });
    this.currentCommand = command;
    command.save(outputPath);
  });

  private cleanTemp = async (tempFolder: string) => {
    try { await rm(tempFolder, { recursive: true, force: true }); } catch (err) { console.log(`[CarUsb] No se pudo borrar ${tempFolder}: ${err}`); }
  };

  private run = async (relativeItems: string[], bitrate: number) => {
    const root = this.getCloudRootPath();
    const outputFolder = `${root}/${CAR_USB_OUTPUT_FOLDER}`;
    const stamp = stampNow();
    const tempFolder = `${outputFolder}/.tmp-${stamp}`;
    const zipName = `pendrive_${stamp}.zip`;

    try {
      this.log(`Analizando ${relativeItems.length} elemento(s) seleccionado(s)...`);
      const tasks = await this.buildTaskList(relativeItems);
      if (this.isCancelRequested) return this.finishCancelled(tempFolder);
      if (tasks.length === 0) {
        this.log('No se ha encontrado ningún fichero de audio en la selección.');
        this.update({ state: 'error', message: 'Sin ficheros de audio' });
        return;
      }

      this.log(`Encontrados ${tasks.length} fichero(s) de audio. Bitrate de salida: ${bitrate}k.`);
      await mkdir(tempFolder, { recursive: true });
      ffmpeg.setFfmpegPath(ffmpegPath);
      this.update({ state: 'converting', total: tasks.length, done: 0, errors: 0 });

      for (let i = 0; i < tasks.length; i++) {
        if (this.isCancelRequested) return this.finishCancelled(tempFolder);
        const task = tasks[i];
        const outputPath = `${tempFolder}/${task.zipRelative}`;
        this.update({ currentFile: task.zipRelative, currentPercent: 0 });
        try {
          await mkdir(pathModule.dirname(outputPath), { recursive: true });
          await this.convertFile(task, outputPath, bitrate);
          this.log(`✓ [${i + 1}/${tasks.length}] ${task.zipRelative}`);
          this.update({ done: i + 1, currentPercent: 100 });
        } catch (err) {
          if (this.isCancelRequested) return this.finishCancelled(tempFolder);
          this.log(`✗ [${i + 1}/${tasks.length}] Error en ${task.zipRelative}: ${cleanFfmpegError(err)}`);
          this.update({ done: i + 1, errors: this.snapshot.errors + 1 });
        }
      }

      if (this.snapshot.errors >= tasks.length) {
        this.log('No se ha podido convertir ningún fichero; no se genera el zip.');
        await this.cleanTemp(tempFolder);
        this.update({ state: 'error', currentFile: '', message: 'Ningún fichero convertido' });
        return;
      }

      this.log(`Comprimiendo en ${CAR_USB_OUTPUT_FOLDER}/${zipName}...`);
      this.update({ state: 'zipping', currentFile: zipName, currentPercent: -1 });
      // Sin compresión: el MP3 no se comprime más y así va mucho más rápido en la Pi.
      const zipError = await zip(tempFolder, `${outputFolder}/${zipName}`, { compression: COMPRESSION_LEVEL.uncompressed });
      await this.cleanTemp(tempFolder);
      if (zipError instanceof Error) throw zipError;

      const zipPath = `${CAR_USB_OUTPUT_FOLDER}/${zipName}`;
      const errorsText = this.snapshot.errors > 0 ? ` (${this.snapshot.errors} con error)` : '';
      this.log(`✅ Terminado: ${zipPath}${errorsText}`);
      this.update({ state: 'done', currentFile: '', currentPercent: 100, zipPath, message: zipName });
    } catch (err) {
      console.log(`[CarUsb] Error: ${err}`);
      this.log(`✗ Error: ${(err as Error)?.message ?? err}`);
      await this.cleanTemp(tempFolder);
      this.update({ state: 'error', currentFile: '', message: `${(err as Error)?.message ?? err}` });
    }
  };

  private finishCancelled = async (tempFolder: string) => {
    await this.cleanTemp(tempFolder);
    this.log('⏹ Conversión cancelada.');
    this.update({ state: 'cancelled', currentFile: '', currentPercent: 0 });
  };

  // API pública. --------------------------------------------------------------

  /** Arranca el trabajo. Devuelve un mensaje de error si no se puede arrancar. */
  start = (relativeItems: string[], bitrate: number): string | null => {
    if (this.isRunning()) return 'Ya hay una conversión en marcha';
    if (!Array.isArray(relativeItems) || relativeItems.length === 0) return 'No hay nada seleccionado';
    if (!carUsbBitrateList.includes(bitrate as CarUsbBitrate)) return 'Bitrate no válido';

    this.isCancelRequested = false;
    this.logLines = [];
    this.logOffset = 0;
    this.snapshot = { ...CarUsbMp3Job.emptySnapshot(), state: 'scanning', bitrate, jobId: Date.now() };
    this.update({});
    this.run(relativeItems.filter(item => typeof item === 'string' && item !== ''), bitrate)
      .catch(err => console.log(`[CarUsb] Error inesperado: ${err}`));
    return null;
  };

  cancel = (): boolean => {
    // Durante la compresión ya no se cancela: queda poco y el zip quedaría a medias.
    if (!this.isRunning() || this.snapshot.state === 'zipping') return false;
    this.isCancelRequested = true;
    this.log('Cancelando...');
    try { this.currentCommand?.kill('SIGKILL'); } catch { /* ffmpeg ya había terminado */ }
    return true;
  };
}
