// Ánimos por reglas (sin IA). Los rasgos se comparan con la propia biblioteca:
// cada valor se pasa a percentil (0..1) dentro de las canciones analizadas, así
// "energía alta" significa "más que la mayoría de TUS canciones".
import { camelotDistance } from './dsp';
import { SongFeatures } from './audioFeatures';

export type MoodId = 'energetico' | 'fiesta' | 'tranquilo' | 'melancolico' | 'oscuro' | 'epico';

export const MOOD_LABELS: Record<MoodId, string> = {
  energetico: 'Energético',
  fiesta: 'Fiesta',
  tranquilo: 'Tranquilo',
  melancolico: 'Melancólico',
  oscuro: 'Oscuro / intenso',
  epico: 'Épico',
};

/** Ejes derivados, todos en 0..1. */
export interface MoodAxes {
  energia: number;
  valencia: number;   // alegre (1) frente a triste (0)
  baile: number;
  dinamica: number;   // cambios de intensidad (crescendos, estribillos que explotan)
  brillo: number;
}

type AxisKey = keyof MoodAxes;

/** Objetivo de cada ánimo: valor ideal y peso por eje. */
const MOOD_TARGETS: Record<MoodId, Partial<Record<AxisKey, { v: number; w: number }>>> = {
  energetico: { energia: { v: 0.9, w: 1 }, valencia: { v: 0.6, w: 0.3 }, baile: { v: 0.6, w: 0.3 } },
  fiesta: { baile: { v: 0.9, w: 1 }, energia: { v: 0.7, w: 0.6 }, valencia: { v: 0.8, w: 0.7 } },
  tranquilo: { energia: { v: 0.1, w: 1 }, dinamica: { v: 0.4, w: 0.2 }, brillo: { v: 0.3, w: 0.3 } },
  melancolico: { valencia: { v: 0.1, w: 1 }, energia: { v: 0.3, w: 0.7 } },
  oscuro: { energia: { v: 0.8, w: 0.8 }, valencia: { v: 0.1, w: 1 } },
  epico: { dinamica: { v: 0.9, w: 1 }, energia: { v: 0.65, w: 0.6 } },
};

type NumericKey = 'loudness' | 'dynamics' | 'attack' | 'centroid' | 'flatness' | 'bassRatio' | 'onsetRate' | 'tempo' | 'pulseClarity' | 'modeStrength';
const NUMERIC_KEYS: NumericKey[] = ['loudness', 'dynamics', 'attack', 'centroid', 'flatness', 'bassRatio', 'onsetRate', 'tempo', 'pulseClarity', 'modeStrength'];

/** Valores ordenados de cada rasgo en la biblioteca (para calcular percentiles)
 *  y media/desviación del timbre (para normalizarlo). */
export type LibraryStats = Record<NumericKey, number[]> & { timbreMean: number[]; timbreStd: number[] };

export const buildLibraryStats = (songs: SongFeatures[]): LibraryStats => {
  const stats = {} as LibraryStats;
  NUMERIC_KEYS.forEach(k => { stats[k] = songs.map(s => s[k]).sort((a, b) => a - b); });
  const n = songs[0]?.timbre.length ?? 0;
  stats.timbreMean = [];
  stats.timbreStd = [];
  for (let i = 0; i < n; i++) {
    const vals = songs.map(s => s.timbre[i] ?? 0);
    const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
    stats.timbreMean.push(mean);
    stats.timbreStd.push(Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) || 1);
  }
  return stats;
};

/** Lo que se usa para comparar canciones: ejes de ánimo + timbre normalizado. */
export interface SongProfile {
  f: SongFeatures;
  axes: MoodAxes;
  timbreZ: number[];
}

export const buildProfile = (f: SongFeatures, stats: LibraryStats): SongProfile => ({
  f,
  axes: computeAxes(f, stats),
  timbreZ: stats.timbreMean.map((m, i) => ((f.timbre[i] ?? m) - m) / stats.timbreStd[i]),
});

/** Percentil (0..1) de v dentro de una lista ordenada, por búsqueda binaria. */
const percentile = (sorted: number[], v: number): number => {
  if (sorted.length < 2) return 0.5;
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < v) lo = mid + 1; else hi = mid; }
  let up = lo;
  while (up < sorted.length && sorted[up] === v) up++;
  return ((lo + up) / 2) / sorted.length;
};

/** Campana para el tempo "bailable" (máximo entre 100 y 130 BPM). */
const danceTempo = (bpm: number): number => {
  if (bpm >= 100 && bpm <= 130) return 1;
  const dist = bpm < 100 ? (100 - bpm) / 30 : (bpm - 130) / 40;
  return Math.max(0, 1 - dist);
};

export const computeAxes = (f: SongFeatures, stats: LibraryStats): MoodAxes => {
  const p = (k: NumericKey) => percentile(stats[k], f[k]);
  return {
    energia: 0.3 * p('loudness') + 0.2 * p('onsetRate') + 0.25 * p('centroid') + 0.25 * p('flatness'),
    valencia: 0.5 * p('modeStrength') + 0.2 * p('tempo') + 0.15 * p('centroid') + 0.15 * (1 - p('flatness')),
    baile: 0.35 * p('pulseClarity') + 0.25 * danceTempo(f.tempo) + 0.2 * p('bassRatio') + 0.2 * p('attack'),
    dinamica: p('dynamics'),
    brillo: p('centroid'),
  };
};

/** Distancia (0 = perfecto) de una canción al ánimo pedido. */
export const moodDistance = (axes: MoodAxes, mood: MoodId): number => {
  const target = MOOD_TARGETS[mood];
  let sum = 0, weights = 0;
  (Object.keys(target) as AxisKey[]).forEach(k => {
    const t = target[k]!;
    sum += t.w * (axes[k] - t.v) ** 2;
    weights += t.w;
  });
  return Math.sqrt(sum / (weights || 1));
};

/** Distancia entre ejes de ánimo (media entre pares de canciones ≈ 0,54). */
export const axesDistance = (a: MoodAxes, b: MoodAxes): number =>
  Math.sqrt(
    (a.energia - b.energia) ** 2 + (a.valencia - b.valencia) ** 2 + (a.baile - b.baile) ** 2
    + 0.5 * (a.dinamica - b.dinamica) ** 2 + 0.5 * (a.brillo - b.brillo) ** 2,
  );

/** Distancia de timbre (media entre pares de canciones ≈ 1,37). */
export const timbreDistance = (a: number[], b: number[]): number => {
  if (a.length === 0 || a.length !== b.length) return TIMBRE_TYPICAL;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / a.length);
};

// Escalas medidas con las listas D4rky para que ejes y timbre pesen lo mismo
const AXES_TYPICAL = 0.54;
const TIMBRE_TYPICAL = 1.37;

/** Parecido sonoro (para ordenar y para "Como esta lista"): ~1 = distancia típica.
 *  `axesWeight`: peso de los ejes de ánimo frente al timbre (0-1). */
export const songDistance = (a: SongProfile, b: SongProfile, axesWeight = 0.5): number =>
  axesWeight * axesDistance(a.axes, b.axes) / AXES_TYPICAL
  + (1 - axesWeight) * timbreDistance(a.timbreZ, b.timbreZ) / TIMBRE_TYPICAL;

/** Coste de transición tipo DJ: parecido + tempo cercano + tonalidades compatibles. */
export const transitionCost = (a: SongProfile, b: SongProfile): number => {
  const tempoRatio = a.f.tempo > 0 && b.f.tempo > 0 ? Math.abs(Math.log2(b.f.tempo / a.f.tempo)) : 0.5;
  // Medio tempo / doble tempo también enlazan bien
  const tempoCost = Math.min(tempoRatio, Math.abs(tempoRatio - 1));
  const keyCost = Math.min(camelotDistance(a.f.camelot, b.f.camelot), 3) / 3;
  return songDistance(a, b) + 0.5 * tempoCost + 0.3 * keyCost;
};
