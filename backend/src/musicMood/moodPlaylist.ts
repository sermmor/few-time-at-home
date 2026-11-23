// Listas generadas con lo ya analizado de una carpeta de la Cloud (y subcarpetas),
// ordenadas para que enlacen bien (tempo y tonalidad parecidos, como haría un DJ). Sin IA.
// - Por ánimo (fase 2): canciones que encajan con el ánimo pedido.
// - "Como esta lista" (fase 3): canciones que suenan parecido a una carpeta o
//   canción patrón (p. ej. una D4rky).
import pathModule from 'path';
import { MoodIndex } from './moodIndex';
import {
  buildLibraryStats, buildProfile, LibraryStats, moodDistance, MoodId, MOOD_LABELS, SongProfile, songDistance, transitionCost,
} from './moods';
import { isIgnoredPath, normalizeCloudPath } from './moodSettings';
import { SongFeatures } from './audioFeatures';

export const MOOD_IDS = Object.keys(MOOD_LABELS) as MoodId[];
export const isMoodId = (v: unknown): v is MoodId => typeof v === 'string' && (MOOD_IDS as string[]).includes(v);

/** Modo "Como esta lista" (se pide con mood = SIMILAR_MODE y seedPath). */
export const SIMILAR_MODE = 'comoLista';

export const MAX_PLAYLIST_SONGS = 500;

/** Con cuántas canciones del patrón se compara cada candidata (las más cercanas). */
const SEED_NEIGHBOURS = 3;
/** En "Como esta lista" pesa más el timbre: con 18 carpetas de la Cloud, quitando la
 *  mitad de cada una, 0,25 recuperó en el top 30 un 41 % de la otra mitad (0,5: 32 %). */
const SEED_AXES_WEIGHT = 0.25;

export interface MoodPlaylistSong {
  /** Ruta relativa a la raíz de la Cloud (p. ej. "cloud/Música/x.mp3"). */
  path: string;
  name: string;
}

export interface MoodPlaylistResult {
  songs: MoodPlaylistSong[];
  /** Canciones distintas de la carpeta ya analizadas / en total (para avisar si falta análisis). */
  analyzedInFolder: number;
  totalInFolder: number;
  /** Solo en "Como esta lista": canciones del patrón ya analizadas / en total. */
  analyzedInSeed?: number;
  totalInSeed?: number;
}

interface Candidate {
  path: string;
  fingerprint: string;
  profile: SongProfile;
  distance: number;
}

interface FolderSongs {
  /** Huella -> ruta (una por huella: los duplicados suenan igual). */
  byFingerprint: Map<string, string>;
  analyzed: { path: string; fingerprint: string; f: SongFeatures }[];
}

/** Canciones del índice bajo `folderPath` (o esa canción, si es un fichero). */
const collectSongs = (index: MoodIndex, ignoredPaths: string[], folderPath: string): FolderSongs => {
  const folder = normalizeCloudPath(folderPath);
  const byFingerprint = new Map<string, string>();
  Object.keys(index.files).sort().forEach(rel => {
    if (folder !== '' && rel !== folder && !rel.startsWith(`${folder}/`)) return;
    if (isIgnoredPath(rel, ignoredPaths)) return;
    const fp = index.files[rel][2];
    if (!byFingerprint.has(fp)) byFingerprint.set(fp, rel);
  });
  const analyzed: FolderSongs['analyzed'] = [];
  byFingerprint.forEach((rel, fp) => {
    const f = index.songs[fp]?.f;
    if (f) analyzed.push({ path: rel, fingerprint: fp, f });
  });
  return { byFingerprint, analyzed };
};

/** Une varias selecciones sin repetir huellas (una carpeta y una canción suya, p. ej.). */
const mergeSongs = (parts: FolderSongs[]): FolderSongs => {
  const byFingerprint = new Map<string, string>();
  const analyzed: FolderSongs['analyzed'] = [];
  parts.forEach(part => {
    part.byFingerprint.forEach((rel, fp) => { if (!byFingerprint.has(fp)) byFingerprint.set(fp, rel); });
    part.analyzed.forEach(s => { if (!analyzed.some(a => a.fingerprint === s.fingerprint)) analyzed.push(s); });
  });
  return { byFingerprint, analyzed };
};

/** Percentiles respecto a toda la biblioteca: "tranquilo" significa lo mismo en cualquier carpeta. */
const libraryStats = (index: MoodIndex): LibraryStats =>
  buildLibraryStats(Object.values(index.songs).map(s => s.f).filter((f): f is SongFeatures => !!f));

const clampCount = (count: number) => Math.max(1, Math.min(MAX_PLAYLIST_SONGS, Math.floor(count) || 1));

/** Elige `count` elementos de `pool` (ordenado de mejor a peor) sin repetir, dando
 *  más probabilidad a los primeros: así pedir dos veces la misma lista da variedad. */
const weightedSample = <T>(pool: T[], count: number, random: () => number): T[] => {
  const left = pool.map((item, rank) => ({ item, weight: 1 - 0.7 * (rank / pool.length) }));
  const picked: T[] = [];
  while (picked.length < count && left.length > 0) {
    const total = left.reduce((a, c) => a + c.weight, 0);
    let r = random() * total;
    let i = 0;
    while (i < left.length - 1 && r >= left[i].weight) { r -= left[i].weight; i++; }
    picked.push(left[i].item);
    left.splice(i, 1);
  }
  return picked;
};

/** Ordena empezando por la que mejor encaja y siguiendo siempre por la transición
 *  más suave desde la anterior. */
const orderForTransitions = (songs: Candidate[]): Candidate[] => {
  if (songs.length <= 2) return [...songs].sort((a, b) => a.distance - b.distance);
  const left = [...songs].sort((a, b) => a.distance - b.distance);
  const ordered = [left.shift()!];
  while (left.length > 0) {
    const last = ordered[ordered.length - 1].profile;
    let best = 0;
    let bestCost = Infinity;
    left.forEach((c, i) => {
      // Un poco de peso al objetivo para que la lista no derive hacia otra cosa
      const cost = transitionCost(last, c.profile) + c.distance;
      if (cost < bestCost) { bestCost = cost; best = i; }
    });
    ordered.push(left.splice(best, 1)[0]);
  }
  return ordered;
};

/** Toma las mejores candidatas (con algo de azar) y las ordena tipo DJ. */
const pickAndOrder = (candidates: Candidate[], wanted: number, random: () => number): MoodPlaylistSong[] => {
  const sorted = [...candidates].sort((a, b) => a.distance - b.distance);
  const poolSize = Math.min(sorted.length, Math.max(wanted * 2, wanted + 5));
  const picked = weightedSample(sorted.slice(0, poolSize), wanted, random);
  return orderForTransitions(picked).map(c => ({ path: c.path, name: pathModule.posix.basename(c.path) }));
};

export const buildMoodPlaylist = (
  index: MoodIndex,
  ignoredPaths: string[],
  folderPath: string,
  mood: MoodId,
  count: number,
  random: () => number = Math.random,
): MoodPlaylistResult => {
  const { byFingerprint, analyzed } = collectSongs(index, ignoredPaths, folderPath);
  const result: MoodPlaylistResult = { songs: [], analyzedInFolder: analyzed.length, totalInFolder: byFingerprint.size };
  if (analyzed.length === 0) return result;

  const stats = libraryStats(index);
  const candidates: Candidate[] = analyzed.map(({ path, fingerprint, f }) => {
    const profile = buildProfile(f, stats);
    return { path, fingerprint, profile, distance: moodDistance(profile.axes, mood) };
  });
  result.songs = pickAndOrder(candidates, clampCount(count), random);
  return result;
};

/** Distancia de una canción al patrón: media de sus SEED_NEIGHBOURS canciones más
 *  cercanas del patrón. Mejor que un único "centro" para listas variadas (un centro
 *  de rock + baladas cae en medio y no se parece a ninguna). */
const distanceToSeed = (profile: SongProfile, seed: SongProfile[]): number => {
  const nearest = seed.map(s => songDistance(profile, s, SEED_AXES_WEIGHT)).sort((a, b) => a - b).slice(0, SEED_NEIGHBOURS);
  return nearest.reduce((a, d) => a + d, 0) / nearest.length;
};

export const buildSimilarPlaylist = (
  index: MoodIndex,
  ignoredPaths: string[],
  folderPath: string,
  seedPaths: string[],
  count: number,
  includeSeedSongs = false,
  random: () => number = Math.random,
): MoodPlaylistResult => {
  const folder = collectSongs(index, ignoredPaths, folderPath);
  // El patrón puede estar en una ruta ignorada: no se analiza, así que saldrá sin datos
  const seed = mergeSongs(seedPaths.map(p => collectSongs(index, [], p)));
  const result: MoodPlaylistResult = {
    songs: [],
    analyzedInFolder: folder.analyzed.length,
    totalInFolder: folder.byFingerprint.size,
    analyzedInSeed: seed.analyzed.length,
    totalInSeed: seed.byFingerprint.size,
  };
  if (folder.analyzed.length === 0 || seed.analyzed.length === 0) return result;

  const stats = libraryStats(index);
  const seedProfiles = seed.analyzed.map(s => buildProfile(s.f, stats));
  const seedFingerprints = new Set(seed.analyzed.map(s => s.fingerprint));
  const candidates: Candidate[] = folder.analyzed
    .filter(s => includeSeedSongs || !seedFingerprints.has(s.fingerprint))
    .map(({ path, fingerprint, f }) => {
      const profile = buildProfile(f, stats);
      return { path, fingerprint, profile, distance: distanceToSeed(profile, seedProfiles) };
    });
  result.songs = pickAndOrder(candidates, clampCount(count), random);
  return result;
};
