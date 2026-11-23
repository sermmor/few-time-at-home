// Índice de ánimos en disco: data/music-mood/index.json, cargado en RAM.
// Las canciones se identifican por una huella del contenido (tamaño + hash del
// principio y del final), así que renombrar o mover un fichero no obliga a
// volver a analizarlo. Es regenerable: no va en la copia semanal (sí en la
// exportación de sincronización, que comprime todo data/).
import { createHash } from 'crypto';
import { mkdir, open, readdir, readFile, rename, stat, writeFile } from 'fs/promises';
import pathModule from 'path';
import { SongFeatures } from './audioFeatures';
import { isIgnoredPath } from './moodSettings';

export const MUSIC_MOOD_INDEX_PATH = 'data/music-mood/index.json';

export const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.oga', '.opus', '.wma', '.aac', '.aiff', '.aif'];
export const isAudioFile = (name: string) => AUDIO_EXTENSIONS.includes(pathModule.extname(name).toLowerCase());

/** Unidad de la Cloud que se recorre (la papelera no cuenta). */
const SCANNED_DRIVE = 'cloud';
const FINGERPRINT_CHUNK = 64 * 1024;

/** Canción analizada (f) o que no se pudo leer (failed: se reintenta solo si cambia el fichero). */
export interface IndexedSong {
  f?: SongFeatures;
  failed?: boolean;
}

/** [tamaño, mtimeMs, huella]: permite detectar cambios solo con stat, sin leer el fichero. */
export type IndexedFile = [number, number, string];

export interface MoodIndex {
  version: 1;
  /** Último recorrido de carpetas (ms). */
  lastWalk: number;
  /** Rutas relativas a la raíz de la Cloud (p. ej. "cloud/Música/x.mp3"). */
  files: Record<string, IndexedFile>;
  /** Por huella. */
  songs: Record<string, IndexedSong>;
}

export const emptyIndex = (): MoodIndex => ({ version: 1, lastWalk: 0, files: {}, songs: {} });

/** Lee el índice; si falta o está corrupto, uno vacío. Nunca lanza. */
export const loadIndex = async (): Promise<MoodIndex> => {
  try {
    const data = JSON.parse(await readFile(MUSIC_MOOD_INDEX_PATH, 'utf8'));
    if (data && typeof data === 'object' && data.files && data.songs) {
      return { version: 1, lastWalk: Number(data.lastWalk) || 0, files: data.files, songs: data.songs };
    }
  } catch { /* sin índice todavía */ }
  return emptyIndex();
};

/** Escritura atómica (tmp + rename) para no dejar un índice a medias en la SD. Nunca lanza. */
export const saveIndex = async (index: MoodIndex): Promise<boolean> => {
  try {
    await mkdir(pathModule.dirname(MUSIC_MOOD_INDEX_PATH), { recursive: true });
    const tmp = `${MUSIC_MOOD_INDEX_PATH}.tmp`;
    await writeFile(tmp, JSON.stringify(index));
    await rename(tmp, MUSIC_MOOD_INDEX_PATH);
    return true;
  } catch (err) {
    console.error('[musicMood] No se pudo guardar el índice:', err);
    return false;
  }
};

/** Huella del contenido: tamaño + sha1 de los primeros y últimos 64 KB. */
export const fingerprint = async (absPath: string, size: number): Promise<string | undefined> => {
  let handle;
  try {
    handle = await open(absPath, 'r');
    const hash = createHash('sha1');
    hash.update(String(size));
    const head = Buffer.alloc(Math.min(FINGERPRINT_CHUNK, size));
    await handle.read(head, 0, head.length, 0);
    hash.update(head);
    if (size > FINGERPRINT_CHUNK) {
      const tailLength = Math.min(FINGERPRINT_CHUNK, size - FINGERPRINT_CHUNK);
      const tail = Buffer.alloc(tailLength);
      await handle.read(tail, 0, tailLength, size - tailLength);
      hash.update(tail);
    }
    return hash.digest('hex').slice(0, 24);
  } catch {
    return undefined;
  } finally {
    await handle?.close().catch(() => {});
  }
};

/** Lista los audios de la Cloud (sin carpetas/ficheros ocultos) con su tamaño y fecha. */
const listAudioFiles = async (cloudRoot: string, ignoredPaths: string[], shouldStop: () => boolean): Promise<Map<string, { size: number; mtimeMs: number }>> => {
  const found = new Map<string, { size: number; mtimeMs: number }>();
  const pending = [SCANNED_DRIVE];
  while (pending.length > 0 && !shouldStop()) {
    const relDir = pending.pop()!;
    let entries;
    try {
      entries = await readdir(pathModule.join(cloudRoot, relDir), { withFileTypes: true });
    } catch {
      continue; // carpeta ilegible: se ignora
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // .DS_Store, ._x.mp3, .tmp-* del conversor…
      const rel = `${relDir}/${entry.name}`;
      if (isIgnoredPath(rel, ignoredPaths)) continue; // carpetas que el usuario excluye
      if (entry.isDirectory()) {
        pending.push(rel);
      } else if (entry.isFile() && isAudioFile(entry.name)) {
        try {
          const s = await stat(pathModule.join(cloudRoot, rel));
          found.set(rel, { size: s.size, mtimeMs: Math.round(s.mtimeMs) });
        } catch { /* desaparecido entre medias */ }
      }
    }
  }
  return found;
};

export interface WalkResult {
  changed: boolean;
  added: number;
  removed: number;
  aborted: boolean;
}

/**
 * Sincroniza el índice con lo que hay en disco. Solo lee contenido (128 KB) de
 * los ficheros nuevos o modificados; un renombrado conserva el análisis porque
 * la huella no cambia. Quita las canciones que ya no tiene ningún fichero.
 */
export const walkCloud = async (
  index: MoodIndex, cloudRoot: string, ignoredPaths: string[], shouldStop: () => boolean,
): Promise<WalkResult> => {
  const result: WalkResult = { changed: false, added: 0, removed: 0, aborted: false };
  const onDisk = await listAudioFiles(cloudRoot, ignoredPaths, shouldStop);
  if (shouldStop()) return { ...result, aborted: true };

  for (const rel of Object.keys(index.files)) {
    if (!onDisk.has(rel)) {
      delete index.files[rel];
      result.removed++;
      result.changed = true;
    }
  }
  for (const [rel, s] of onDisk) {
    const known = index.files[rel];
    if (known && known[0] === s.size && known[1] === s.mtimeMs) continue;
    if (shouldStop()) return { ...result, aborted: true };
    const fp = await fingerprint(pathModule.join(cloudRoot, rel), s.size);
    if (!fp) continue;
    if (!known) result.added++;
    index.files[rel] = [s.size, s.mtimeMs, fp];
    result.changed = true;
  }

  // Canciones huérfanas (ningún fichero las referencia ya)
  const referenced = new Set(Object.values(index.files).map(f => f[2]));
  for (const fp of Object.keys(index.songs)) {
    if (!referenced.has(fp)) {
      delete index.songs[fp];
      result.changed = true;
    }
  }
  index.lastWalk = Date.now();
  return result;
};

/** Huellas sin analizar, cada una con una ruta para leerla. */
export const pendingSongs = (index: MoodIndex): { fp: string; rel: string }[] => {
  const seen = new Set<string>();
  const pending: { fp: string; rel: string }[] = [];
  for (const [rel, file] of Object.entries(index.files)) {
    const fp = file[2];
    if (seen.has(fp) || index.songs[fp]) continue;
    seen.add(fp);
    pending.push({ fp, rel });
  }
  return pending;
};
