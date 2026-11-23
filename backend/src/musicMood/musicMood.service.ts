// Análisis nocturno de ánimos de la música de la Cloud.
// - Solo trabaja en la ventana nocturna (ajustable en /configuration > Otros; por
//   defecto 01:00–07:00) o cuando se pide "Analizar ahora".
// - Se pausa mientras haya otro trabajo pesado (actualización de RSS, conversores
//   de MP3) y continúa cuando termina. Los comprobadores se registran desde fuera
//   (bootstrap / api.service) para no crear dependencias circulares.
// - Escribe en la SD lo mínimo: solo si algo cambió, por lotes de 500 canciones.
import pathModule from 'path';
import { scheduleJob, Job } from 'node-schedule';
import { analyzeSong } from './audioFeatures';
import { loadIndex, MoodIndex, pendingSongs, saveIndex, walkCloud } from './moodIndex';
import { buildMoodPlaylist, buildSimilarPlaylist, MoodPlaylistResult } from './moodPlaylist';
import { MoodId } from './moods';
import { isHourInWindow, loadSettings, MusicMoodSettings, sanitizeSettings, saveSettings } from './moodSettings';

const FLUSH_EVERY_SONGS = 500;
const BUSY_POLL_MS = 30_000;
const FULL_WALK_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

export type MusicMoodState = 'idle' | 'scanning' | 'analyzing' | 'paused';

export interface MusicMoodStatus {
  state: MusicMoodState;
  /** Por qué está en pausa (p. ej. "Actualización de RSS"). */
  pausedBy?: string;
  /** Lanzado a mano (ignora la ventana nocturna). */
  isManual: boolean;
  /** Hay cambios en la Cloud pendientes de revisar. */
  isDirty: boolean;
  totalFiles: number;
  analyzed: number;
  failed: number;
  pending: number;
  /** Progreso del análisis en curso. */
  done: number;
  current?: string;
  lastWalk: number;
  lastRunEnd: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MusicMoodService {
  static Instance: MusicMoodService | undefined;

  private index?: MoodIndex;
  private loading?: Promise<MoodIndex>;
  /** Sube con cada recarga tras importar: un análisis antiguo ya no guarda su índice. */
  private generation = 0;
  private running?: Promise<void>;
  private stopRequested = false;
  private isDirty = false;
  private isManual = false;
  private state: MusicMoodState = 'idle';
  private pausedBy?: string;
  private done = 0;
  private current?: string;
  private lastRunEnd = 0;
  private busyChecks: { label: string; isBusy: () => boolean }[] = [];
  private job?: Job;
  private settings?: MusicMoodSettings;

  constructor(private getCloudRoot: () => string) {
    MusicMoodService.Instance = this;
  }

  /** Programa la pasada nocturna según los ajustes (leídos de forma perezosa; el índice se lee al usarlo). */
  start = () => {
    this.getSettings()
      .then(settings => this.schedule(settings))
      .catch(err => console.error('[musicMood] No se pudo programar el análisis nocturno:', err));
  };

  private schedule = (settings: MusicMoodSettings) => {
    try {
      this.job?.cancel();
      this.job = undefined;
      // inicio = fin: sin pasada nocturna, solo "Analizar ahora"
      if (settings.startHour === settings.endHour) return;
      this.job = scheduleJob('music mood nightly analysis', { hour: settings.startHour, minute: 5 }, () => {
        this.runIfNeeded(false).catch(err => console.error('[musicMood] Error en la pasada nocturna:', err));
      }) ?? undefined;
    } catch (err) {
      console.error('[musicMood] No se pudo programar el análisis nocturno:', err);
    }
  };

  /** Ajustes en RAM (se leen la primera vez). */
  getSettings = async (): Promise<MusicMoodSettings> => {
    if (!this.settings) this.settings = await loadSettings();
    return this.settings;
  };

  /** Guarda los ajustes de /configuration, reprograma el trabajo y, si cambiaron
   *  las carpetas ignoradas, revisa la Cloud en la próxima pasada. */
  setSettings = async (raw: unknown): Promise<{ ok: boolean; settings: MusicMoodSettings }> => {
    const previous = await this.getSettings();
    const settings = sanitizeSettings(raw);
    const ok = await saveSettings(settings);
    if (!ok) return { ok, settings: previous };
    this.settings = settings;
    this.schedule(settings);
    const samePaths = previous.ignoredPaths.length === settings.ignoredPaths.length
      && previous.ignoredPaths.every(p => settings.ignoredPaths.includes(p));
    if (!samePaths) this.markDirty();
    return { ok, settings };
  };

  /** Otro trabajo pesado durante el cual el análisis se pausa. */
  addBusyCheck = (label: string, isBusy: () => boolean) => {
    this.busyChecks.push({ label, isBusy });
  };

  /** Algo cambió en la Cloud (subida, borrado, movimiento…): revisar esta noche. Solo RAM. */
  markDirty = () => { this.isDirty = true; };

  /** Tras importar data/ desde otra máquina: olvidar el índice en RAM. */
  reloadFromDisk = () => {
    this.generation++;
    this.stopRequested = true;
    this.index = undefined;
    this.loading = undefined;
    // Los ajustes también pudieron llegar con la importación
    this.settings = undefined;
    this.start();
  };

  /** Índice en RAM (lo lee la primera vez). */
  getIndex = async (): Promise<MoodIndex> => {
    if (this.index) return this.index;
    if (!this.loading) {
      const generation = this.generation;
      this.loading = loadIndex().then(index => {
        if (generation === this.generation) this.index = index;
        return index;
      });
    }
    return this.loading;
  };

  getStatus = async (): Promise<MusicMoodStatus> => {
    const index = await this.getIndex();
    const songs = Object.values(index.songs);
    return {
      state: this.state,
      pausedBy: this.pausedBy,
      isManual: this.isManual,
      isDirty: this.isDirty,
      totalFiles: Object.keys(index.files).length,
      analyzed: songs.filter(s => s.f).length,
      failed: songs.filter(s => s.failed).length,
      pending: pendingSongs(index).length,
      done: this.done,
      current: this.current,
      lastWalk: index.lastWalk,
      lastRunEnd: this.lastRunEnd,
    };
  };

  /** "Analizar ahora": revisa la Cloud y analiza lo pendiente sin esperar a la noche
   *  (pero sigue cediendo el paso al RSS). Devuelve false si ya estaba en marcha. */
  analyzeNow = (): boolean => {
    if (this.running) return false;
    this.isDirty = true;
    this.runIfNeeded(true).catch(err => console.error('[musicMood] Error analizando:', err));
    return true;
  };

  /** Lista por ánimo con lo ya analizado de la carpeta (y subcarpetas). */
  buildPlaylist = async (folderPath: string, mood: MoodId, count: number): Promise<MoodPlaylistResult> => {
    const [index, settings] = await Promise.all([this.getIndex(), this.getSettings()]);
    return buildMoodPlaylist(index, settings.ignoredPaths, folderPath, mood, count);
  };

  /** "Como esta lista": canciones de la carpeta que suenan parecido a `seedPaths`
   *  (carpetas y/o canciones). */
  buildSimilarPlaylist = async (folderPath: string, seedPaths: string[], count: number, includeSeedSongs: boolean): Promise<MoodPlaylistResult> => {
    const [index, settings] = await Promise.all([this.getIndex(), this.getSettings()]);
    return buildSimilarPlaylist(index, settings.ignoredPaths, folderPath, seedPaths, count, includeSeedSongs);
  };

  stop = (): boolean => {
    if (!this.running) return false;
    this.stopRequested = true;
    return true;
  };

  private isInWindow = (date = new Date()) =>
    isHourInWindow(date.getHours(), this.settings ?? { startHour: 0, endHour: 0, ignoredPaths: [] });

  private shouldStop = () => this.stopRequested || (!this.isManual && !this.isInWindow());

  private busyReason = (): string | undefined => {
    for (const check of this.busyChecks) {
      try {
        if (check.isBusy()) return check.label;
      } catch { /* un comprobador roto no bloquea */ }
    }
    return undefined;
  };

  /** Espera mientras haya otro trabajo pesado. Devuelve false si hay que parar. */
  private waitWhileBusy = async (): Promise<boolean> => {
    let reason = this.busyReason();
    while (reason) {
      if (this.state !== 'paused') console.log(`[musicMood] En pausa: ${reason}`);
      this.state = 'paused';
      this.pausedBy = reason;
      await sleep(BUSY_POLL_MS);
      if (this.shouldStop()) return false;
      reason = this.busyReason();
    }
    this.pausedBy = undefined;
    return !this.shouldStop();
  };

  private runIfNeeded = (isManual: boolean): Promise<void> => {
    if (this.running) return this.running;
    this.isManual = isManual;
    this.stopRequested = false;
    this.running = this.run().finally(() => {
      this.running = undefined;
      this.state = 'idle';
      this.pausedBy = undefined;
      this.current = undefined;
      this.isManual = false;
      this.lastRunEnd = Date.now();
    });
    return this.running;
  };

  private run = async (): Promise<void> => {
    const generation = this.generation;
    await this.getSettings(); // la ventana nocturna depende de ellos
    const index = await this.getIndex();
    const save = async () => (generation === this.generation ? saveIndex(index) : false);
    this.done = 0;

    // 1) Revisar la Cloud: si hubo cambios hoy, si nunca se hizo o una vez por semana
    //    (atrapa lo copiado por otros medios, p. ej. Samba).
    const needsWalk = this.isDirty || index.lastWalk === 0 || Date.now() - index.lastWalk > FULL_WALK_EVERY_MS;
    if (needsWalk) {
      if (!(await this.waitWhileBusy())) return;
      this.state = 'scanning';
      const wasDirty = this.isDirty;
      this.isDirty = false;
      const { ignoredPaths } = await this.getSettings();
      const walk = await walkCloud(index, this.getCloudRoot(), ignoredPaths, () => this.shouldStop());
      if (walk.aborted) {
        this.isDirty = this.isDirty || wasDirty;
        return;
      }
      console.log(`[musicMood] Cloud revisada: ${walk.added} nuevas, ${walk.removed} quitadas`);
      if (walk.changed) await save();
    }

    // 2) Analizar lo pendiente, una canción cada vez y con prioridad mínima
    const pending = pendingSongs(index);
    if (pending.length === 0) return;
    console.log(`[musicMood] Analizando ${pending.length} canciones`);
    let unsaved = 0;
    for (const { fp, rel } of pending) {
      if (!(await this.waitWhileBusy())) break;
      this.state = 'analyzing';
      this.current = rel;
      // El fichero pudo moverse mientras tanto: si la huella ya no tiene ruta, se salta
      if (index.files[rel]?.[2] !== fp) continue;
      const features = await analyzeSong(pathModule.join(this.getCloudRoot(), rel));
      if (generation !== this.generation) return; // se importó otro data/: este índice ya no vale
      index.songs[fp] = features ? { f: features } : { failed: true };
      this.done++;
      unsaved++;
      if (unsaved >= FLUSH_EVERY_SONGS) {
        await save();
        unsaved = 0;
      }
    }
    if (unsaved > 0) await save();
    console.log(`[musicMood] Fin: ${this.done} canciones analizadas`);
  };
}
