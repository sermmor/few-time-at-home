// Lista por ánimo (fase 2): elige canciones ya analizadas de una carpeta de la
// Cloud (y subcarpetas) que encajen con el ánimo pedido y las ordena para que
// enlacen bien (tempo y tonalidad parecidos, como haría un DJ). Sin IA.
import pathModule from 'path';
import { MoodIndex } from './moodIndex';
import { buildLibraryStats, buildProfile, moodDistance, MoodId, MOOD_LABELS, SongProfile, transitionCost } from './moods';
import { isIgnoredPath, normalizeCloudPath } from './moodSettings';
import { SongFeatures } from './audioFeatures';

export const MOOD_IDS = Object.keys(MOOD_LABELS) as MoodId[];
export const isMoodId = (v: unknown): v is MoodId => typeof v === 'string' && (MOOD_IDS as string[]).includes(v);

export const MAX_PLAYLIST_SONGS = 500;

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
}

interface Candidate {
  path: string;
  profile: SongProfile;
  distance: number;
}

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

/** Ordena empezando por la que mejor encaja con el ánimo y siguiendo siempre por
 *  la transición más suave desde la anterior. */
const orderForTransitions = (songs: Candidate[]): Candidate[] => {
  if (songs.length <= 2) return [...songs].sort((a, b) => a.distance - b.distance);
  const left = [...songs].sort((a, b) => a.distance - b.distance);
  const ordered = [left.shift()!];
  while (left.length > 0) {
    const last = ordered[ordered.length - 1].profile;
    let best = 0;
    let bestCost = Infinity;
    left.forEach((c, i) => {
      // Un poco de peso al ánimo para que la lista no derive hacia otra cosa
      const cost = transitionCost(last, c.profile) + c.distance;
      if (cost < bestCost) { bestCost = cost; best = i; }
    });
    ordered.push(left.splice(best, 1)[0]);
  }
  return ordered;
};

export const buildMoodPlaylist = (
  index: MoodIndex,
  ignoredPaths: string[],
  folderPath: string,
  mood: MoodId,
  count: number,
  random: () => number = Math.random,
): MoodPlaylistResult => {
  const folder = normalizeCloudPath(folderPath);
  const wanted = Math.max(1, Math.min(MAX_PLAYLIST_SONGS, Math.floor(count) || 1));

  // Canciones de la carpeta, una ruta por huella (los duplicados suenan igual)
  const byFingerprint = new Map<string, string>();
  Object.keys(index.files).sort().forEach(rel => {
    if (folder !== '' && rel !== folder && !rel.startsWith(`${folder}/`)) return;
    if (isIgnoredPath(rel, ignoredPaths)) return;
    const fp = index.files[rel][2];
    if (!byFingerprint.has(fp)) byFingerprint.set(fp, rel);
  });

  const analyzed: { path: string; f: SongFeatures }[] = [];
  byFingerprint.forEach((rel, fp) => {
    const f = index.songs[fp]?.f;
    if (f) analyzed.push({ path: rel, f });
  });
  const result: MoodPlaylistResult = { songs: [], analyzedInFolder: analyzed.length, totalInFolder: byFingerprint.size };
  if (analyzed.length === 0) return result;

  // Percentiles respecto a toda la biblioteca: "tranquilo" significa lo mismo en cualquier carpeta
  const library = Object.values(index.songs).map(s => s.f).filter((f): f is SongFeatures => !!f);
  const stats = buildLibraryStats(library);
  const candidates: Candidate[] = analyzed
    .map(({ path, f }) => {
      const profile = buildProfile(f, stats);
      return { path, profile, distance: moodDistance(profile.axes, mood) };
    })
    .sort((a, b) => a.distance - b.distance);

  const poolSize = Math.min(candidates.length, Math.max(wanted * 2, wanted + 5));
  const picked = weightedSample(candidates.slice(0, poolSize), wanted, random);
  result.songs = orderForTransitions(picked).map(c => ({ path: c.path, name: pathModule.posix.basename(c.path) }));
  return result;
};
