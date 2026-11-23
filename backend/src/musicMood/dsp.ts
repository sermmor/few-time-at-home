// Procesado de señal sin IA para el análisis de ánimo de canciones.
// Todo son funciones puras sobre muestras mono Float32 (sin dependencias).

export const SAMPLE_RATE = 11025;
const FRAME = 2048;      // ~186 ms: resolución de 5,4 Hz, suficiente para croma desde ~80 Hz
const HOP = 256;         // ~23 ms: ~43 tramas/s para la envolvente de ataques (tempo)
const MIN_BPM = 50;
const MAX_BPM = 220;
const ONSET_FLUX_RATIO = 0.5;

/** Rasgos crudos de un trozo de audio. Las sumas se combinan entre trozos. */
export interface SegmentFeatures {
  /** Cuánto del flujo espectral son saltos (ataques) y no ruido constante: 0..~1. */
  attackStrength: number;
  /** Volumen (dB) de cada bloque de 1 s. */
  blockDb: number[];
  frames: number;
  rmsSum: number;
  rmsSqSum: number;
  centroidSum: number;
  rolloffSum: number;
  flatnessSum: number;
  bassSum: number;
  onsets: number;
  seconds: number;
  chroma: number[];          // 12 clases de altura (C..B)
  mfccSum: number[];
  mfccSqSum: number[];
  mfccFrames: number;
  tempoAc: number[];         // autocorrelación ponderada por desfase (índice = lag)
  tempoAcRaw: number[];      // autocorrelación normalizada sin ponderar (claridad del pulso)
}

// ── FFT radix-2 iterativa ─────────────────────────────────────────────────
const fftCache: { [n: number]: { rev: Uint32Array; cos: Float64Array; sin: Float64Array } } = {};

const getFftTables = (n: number) => {
  if (fftCache[n]) return fftCache[n];
  const bits = Math.log2(n);
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos(-2 * Math.PI * i / n);
    sin[i] = Math.sin(-2 * Math.PI * i / n);
  }
  fftCache[n] = { rev, cos, sin };
  return fftCache[n];
};

/** FFT in situ (re/im de longitud potencia de 2). */
export const fft = (re: Float64Array, im: Float64Array): void => {
  const n = re.length;
  const { rev, cos, sin } = getFftTables(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const c = cos[k * step];
        const s = sin[k * step];
        const a = start + k;
        const b = a + half;
        const tr = re[b] * c - im[b] * s;
        const ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
};

// ── Tablas por bin (se calculan una vez) ──────────────────────────────────
const HANN = new Float64Array(FRAME).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FRAME - 1)));
const BINS = FRAME / 2 + 1;
const BIN_HZ = SAMPLE_RATE / FRAME;
/** Clase de altura (0 = C) de cada bin entre 80 Hz y 2 kHz; -1 fuera de rango. */
const PITCH_CLASS = new Int8Array(BINS).map((_, k) => {
  const f = k * BIN_HZ;
  if (f < 80 || f > 2000) return -1;
  const midi = Math.round(12 * Math.log2(f / 440) + 69);
  return ((midi % 12) + 12) % 12;
});
const BASS_LIMIT_BIN = Math.round(150 / BIN_HZ);

// ── Timbre: MFCC (banco de filtros mel + DCT), la técnica clásica de "suena parecido" ──
const MEL_BANDS = 26;
export const MFCC_COUNT = 13;          // se guardan c1..c13 (c0 es el volumen, ya medido)
const MFCC_FRAME_STEP = 4;             // una trama de cada 4 (~93 ms) basta para el timbre
const hzToMel = (f: number) => 2595 * Math.log10(1 + f / 700);
const melToHz = (m: number) => 700 * (10 ** (m / 2595) - 1);
/** Para cada banda mel: lista de [bin, peso] de su filtro triangular. */
const MEL_FILTERS: [number, number][][] = (() => {
  const lo = hzToMel(60), hi = hzToMel(SAMPLE_RATE / 2);
  const edges = Array.from({ length: MEL_BANDS + 2 }, (_, i) => melToHz(lo + (hi - lo) * i / (MEL_BANDS + 1)));
  return Array.from({ length: MEL_BANDS }, (_, b) => {
    const f: [number, number][] = [];
    for (let k = 0; k < BINS; k++) {
      const hz = k * BIN_HZ;
      const w = hz < edges[b] || hz > edges[b + 2] ? 0
        : hz <= edges[b + 1] ? (hz - edges[b]) / (edges[b + 1] - edges[b])
        : (edges[b + 2] - hz) / (edges[b + 2] - edges[b + 1]);
      if (w > 0) f.push([k, w]);
    }
    return f;
  });
})();
const DCT: number[][] = Array.from({ length: MFCC_COUNT }, (_, i) =>
  Array.from({ length: MEL_BANDS }, (_, b) => Math.cos(Math.PI * (i + 1) * (b + 0.5) / MEL_BANDS)));
const FLAT_FROM = Math.round(100 / BIN_HZ);
const FLAT_TO = Math.round(5000 / BIN_HZ);

/** Analiza un trozo de audio mono a SAMPLE_RATE. */
export const analyzeSegment = (x: Float32Array): SegmentFeatures | undefined => {
  const frames = Math.floor((x.length - FRAME) / HOP) + 1;
  if (frames < 64) return undefined; // menos de ~1,5 s: no da para nada fiable

  const re = new Float64Array(FRAME);
  const im = new Float64Array(FRAME);
  const prevLogMag = new Float64Array(BINS);
  const power = new Float64Array(BINS);
  const mfccSum = new Array(MFCC_COUNT).fill(0);
  const mfccSqSum = new Array(MFCC_COUNT).fill(0);
  let mfccFrames = 0;
  const flux = new Float64Array(frames);
  const chroma = new Array(12).fill(0);
  let rmsSum = 0, rmsSqSum = 0, centroidSum = 0, rolloffSum = 0, flatnessSum = 0, bassSum = 0;

  for (let t = 0; t < frames; t++) {
    const off = t * HOP;
    let energy = 0;
    for (let i = 0; i < FRAME; i++) {
      const v = x[off + i];
      energy += v * v;
      re[i] = v * HANN[i];
      im[i] = 0;
    }
    const rms = Math.sqrt(energy / FRAME);
    rmsSum += rms;
    rmsSqSum += rms * rms;

    fft(re, im);

    let pow = 0, weighted = 0, bass = 0, fluxT = 0, logSum = 0, linSum = 0;
    for (let k = 0; k < BINS; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      power[k] = p;
      const mag = Math.sqrt(p);
      pow += p;
      weighted += k * BIN_HZ * mag;
      if (k <= BASS_LIMIT_BIN) bass += p;
      const pc = PITCH_CLASS[k];
      if (pc >= 0) chroma[pc] += mag;
      // Flujo espectral con compresión logarítmica: base de la detección de ataques
      const lm = Math.log1p(100 * mag);
      const d = lm - prevLogMag[k];
      if (d > 0) fluxT += d;
      prevLogMag[k] = lm;
      if (k >= FLAT_FROM && k <= FLAT_TO) { logSum += Math.log(p + 1e-12); linSum += p; }
    }
    flux[t] = t === 0 ? 0 : fluxT;

    if (t % MFCC_FRAME_STEP === 0 && pow > 1e-9) {
      const logMel = MEL_FILTERS.map(f => Math.log(f.reduce((a, [k, w]) => a + w * power[k], 0) + 1e-10));
      for (let i = 0; i < MFCC_COUNT; i++) {
        let c = 0;
        for (let b = 0; b < MEL_BANDS; b++) c += DCT[i][b] * logMel[b];
        mfccSum[i] += c;
        mfccSqSum[i] += c * c;
      }
      mfccFrames++;
    }

    if (pow > 1e-9) {
      let magSum = 0;
      for (let k = 0; k < BINS; k++) magSum += Math.sqrt(power[k]);
      centroidSum += weighted / (magSum || 1);
      let acc = 0, k85 = 0;
      for (; k85 < BINS; k85++) { acc += power[k85]; if (acc >= 0.85 * pow) break; }
      rolloffSum += k85 * BIN_HZ;
      bassSum += bass / pow;
      const nFlat = FLAT_TO - FLAT_FROM + 1;
      flatnessSum += Math.exp(logSum / nFlat) / ((linSum / nFlat) || 1);
    }
  }

  // ── Envolvente de ataques: resta la media local (~0,5 s) y rectifica ──
  const fps = SAMPLE_RATE / HOP;
  const win = Math.round(fps * 0.5);
  const env = new Float64Array(frames);
  let run = 0;
  for (let t = 0; t < frames; t++) {
    run += flux[t];
    if (t >= win) run -= flux[t - win];
    const localMean = run / Math.min(t + 1, win);
    env[t] = Math.max(0, flux[t] - localMean);
  }
  // Picos de la envolvente = ataques (densidad de golpes por segundo)
  let envMean = 0, fluxMean = 0;
  for (let t = 0; t < frames; t++) { envMean += env[t]; fluxMean += flux[t]; }
  envMean /= frames;
  fluxMean /= frames;
  // Un tono sostenido también tiene "flujo" (ruido del códec), pero sin saltos: el
  // umbral relativo al flujo medio evita contar ese ruido como ataques.
  const onsetThreshold = Math.max(2 * envMean, ONSET_FLUX_RATIO * fluxMean);
  let onsets = 0, lastOnset = -999;
  const minGap = Math.round(fps * 0.1);
  for (let t = 1; t < frames - 1; t++) {
    if (env[t] > onsetThreshold && env[t] >= env[t - 1] && env[t] >= env[t + 1] && t - lastOnset >= minGap) {
      onsets++; lastOnset = t;
    }
  }

  // ── Autocorrelación de la envolvente para el tempo ──
  const maxLag = Math.ceil(fps * 60 / MIN_BPM);
  const tempoAc = new Array(maxLag + 1).fill(0);
  const tempoAcRaw = new Array(maxLag + 1).fill(0);
  let ac0 = 0;
  for (let t = 0; t < frames; t++) ac0 += env[t] * env[t];
  for (let lag = Math.floor(fps * 60 / MAX_BPM); lag <= maxLag && lag < frames; lag++) {
    let s = 0;
    for (let t = lag; t < frames; t++) s += env[t] * env[t - lag];
    const norm = ac0 > 0 ? s / ac0 : 0;
    tempoAcRaw[lag] = norm;
    // Ponderación perceptiva (log-gaussiana centrada en 120 BPM, 1 octava): reduce
    // los errores de mitad/doble tempo, como hacen los detectores clásicos.
    const bpm = fps * 60 / lag;
    const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120), 2));
    tempoAc[lag] = norm * w;
  }

  // Volumen por bloques de 1 s (dB): mide cambios entre partes de la canción
  // (estrofa tranquila frente a estribillo que explota), no el golpeo de la batería.
  const blockDb: number[] = [];
  for (let start = 0; start + SAMPLE_RATE <= x.length; start += SAMPLE_RATE) {
    let e = 0;
    for (let i = start; i < start + SAMPLE_RATE; i++) e += x[i] * x[i];
    blockDb.push(10 * Math.log10(e / SAMPLE_RATE + 1e-10));
  }

  return {
    blockDb,
    attackStrength: fluxMean > 0 ? envMean / fluxMean : 0,
    frames, rmsSum, rmsSqSum, centroidSum, rolloffSum, flatnessSum, bassSum,
    onsets, seconds: x.length / SAMPLE_RATE, chroma, tempoAc, tempoAcRaw,
    mfccSum, mfccSqSum, mfccFrames,
  };
};

// ── Tonalidad (perfiles de Krumhansl-Kessler) ─────────────────────────────
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const pearson = (a: number[], b: number[]): number => {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
};

export interface KeyEstimate {
  key: number;               // 0 = C … 11 = B
  mode: 'major' | 'minor';
  confidence: number;        // correlación con el mejor perfil (-1..1)
  modeStrength: number;      // >0 suena a mayor, <0 a menor
}

export const estimateKey = (chroma: number[]): KeyEstimate => {
  let bestMajor = { key: 0, r: -2 };
  let bestMinor = { key: 0, r: -2 };
  for (let k = 0; k < 12; k++) {
    const rotated = chroma.map((_, i) => chroma[(i + k) % 12]);
    const rMaj = pearson(rotated, MAJOR_PROFILE);
    const rMin = pearson(rotated, MINOR_PROFILE);
    if (rMaj > bestMajor.r) bestMajor = { key: k, r: rMaj };
    if (rMin > bestMinor.r) bestMinor = { key: k, r: rMin };
  }
  const isMajor = bestMajor.r >= bestMinor.r;
  return {
    key: isMajor ? bestMajor.key : bestMinor.key,
    mode: isMajor ? 'major' : 'minor',
    confidence: Math.max(bestMajor.r, bestMinor.r),
    modeStrength: bestMajor.r - bestMinor.r,
  };
};

/** Código de la rueda de Camelot (p. ej. "8B" = C mayor, "8A" = A menor). */
export const toCamelot = (key: number, mode: 'major' | 'minor'): string => {
  const majorKey = mode === 'major' ? key : (key + 3) % 12; // relativa mayor
  const num = ((majorKey * 7) % 12 + 7) % 12 + 1;
  return `${num}${mode === 'major' ? 'B' : 'A'}`;
};

/** Distancia armónica entre dos códigos Camelot: 0 igual, 1 compatible, más = choca. */
export const camelotDistance = (a: string, b: string): number => {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  const la = a.slice(-1), lb = b.slice(-1);
  const diff = Math.min(Math.abs(na - nb), 12 - Math.abs(na - nb));
  return diff + (la === lb ? 0 : 1);
};

/** Tempo a partir de las autocorrelaciones sumadas de varios trozos. */
export const estimateTempo = (acs: number[][], raws: number[][]): { bpm: number; pulseClarity: number } => {
  const len = Math.max(...acs.map(a => a.length));
  const sum = new Array(len).fill(0);
  const sumRaw = new Array(len).fill(0);
  acs.forEach(a => a.forEach((v, i) => { sum[i] += v; }));
  raws.forEach(a => a.forEach((v, i) => { sumRaw[i] += v; }));
  let best = 0, bestLag = 0;
  for (let lag = 1; lag < len - 1; lag++) {
    if (sum[lag] > best && sum[lag] >= sum[lag - 1] && sum[lag] >= sum[lag + 1]) { best = sum[lag]; bestLag = lag; }
  }
  if (!bestLag) return { bpm: 0, pulseClarity: 0 };
  // Interpolación parabólica para afinar el desfase
  const y0 = sum[bestLag - 1], y1 = sum[bestLag], y2 = sum[bestLag + 1];
  const denom = y0 - 2 * y1 + y2;
  const shift = denom !== 0 ? 0.5 * (y0 - y2) / denom : 0;
  const fps = SAMPLE_RATE / HOP;
  return {
    bpm: fps * 60 / (bestLag + shift),
    pulseClarity: sumRaw[bestLag] / raws.length,
  };
};
