// Extrae los rasgos de ánimo de una canción: ffmpeg decodifica 3 trozos de 10 s
// (al 25 %, 50 % y 75 %) a mono 11025 Hz y dsp.ts hace el resto. Sin IA.
import { spawn } from 'child_process';
import { setPriority } from 'os';
import { analyzeSegment, estimateKey, estimateTempo, toCamelot, MFCC_COUNT, SAMPLE_RATE, SegmentFeatures } from './dsp';

const ffmpegPath: string = require('@ffmpeg-installer/ffmpeg').path;

const SEGMENT_SECONDS = 10;
const SEGMENT_POSITIONS = [0.25, 0.5, 0.75];
const PROCESS_TIMEOUT_MS = 60_000;

/** Rasgos guardados por canción (valores redondeados para que el índice ocupe poco). */
export interface SongFeatures {
  duration: number;      // s
  loudness: number;      // dBFS de la RMS media
  dynamics: number;      // dB: desviación del volumen por bloques de 1 s
  attack: number;        // 0..1: lo percusivo (saltos) frente a un muro de sonido constante
  centroid: number;      // Hz: brillo
  rolloff: number;       // Hz por debajo del cual está el 85 % de la energía
  flatness: number;      // 0..1: ruido/distorsión frente a tonos limpios
  bassRatio: number;     // proporción de energía bajo 150 Hz
  onsetRate: number;     // ataques por segundo
  tempo: number;         // BPM
  pulseClarity: number;  // 0..1: lo marcado que está el pulso
  key: number;           // 0 = C … 11 = B
  mode: 'major' | 'minor';
  modeStrength: number;  // >0 mayor, <0 menor
  keyConfidence: number;
  camelot: string;
  /** Timbre: media y desviación de cada MFCC c1..c13, intercaladas (26 valores). */
  timbre: number[];
}

/** Ejecuta ffmpeg con prioridad mínima y devuelve stdout (y stderr). Nunca lanza. */
const runFfmpeg = (args: string[]): Promise<{ stdout: Buffer; stderr: string }> => new Promise(resolve => {
  try {
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    try { if (child.pid) setPriority(child.pid, 19); } catch { /* sin permiso: sigue igual */ }
    const out: Buffer[] = [];
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), PROCESS_TIMEOUT_MS);
    child.stdout.on('data', (d: Buffer) => out.push(d));
    child.stderr.on('data', (d: Buffer) => { if (err.length < 20_000) err += d.toString(); });
    child.on('error', () => { clearTimeout(timer); resolve({ stdout: Buffer.alloc(0), stderr: err }); });
    child.on('close', () => { clearTimeout(timer); resolve({ stdout: Buffer.concat(out), stderr: err }); });
  } catch {
    resolve({ stdout: Buffer.alloc(0), stderr: '' });
  }
});

/** Duración leyendo la cabecera con ffmpeg (no hay ffprobe en @ffmpeg-installer). */
export const getDuration = async (file: string): Promise<number> => {
  const { stderr } = await runFfmpeg(['-hide_banner', '-i', file]);
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
};

const decode = async (file: string, start: number, seconds: number): Promise<Float32Array> => {
  const { stdout } = await runFfmpeg([
    '-v', 'quiet', '-ss', start.toFixed(2), '-t', String(seconds), '-i', file,
    '-vn', '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', '-',
  ]);
  // Copia para alinear a 4 bytes (el Buffer puede venir de un pool desalineado)
  const aligned = new Uint8Array(stdout.length - (stdout.length % 4));
  aligned.set(stdout.subarray(0, aligned.length));
  return new Float32Array(aligned.buffer);
};

const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

/** Analiza una canción. Devuelve undefined si no se puede leer; nunca lanza. */
export const analyzeSong = async (file: string): Promise<SongFeatures | undefined> => {
  try {
    const duration = await getDuration(file);
    if (duration <= 0) return undefined;

    // Canciones cortas: un único trozo con todo lo que haya
    const starts = duration < SEGMENT_SECONDS * 3.5
      ? [0]
      : SEGMENT_POSITIONS.map(p => Math.max(0, duration * p - SEGMENT_SECONDS / 2));
    const length = starts.length === 1 ? Math.min(duration, SEGMENT_SECONDS * 3) : SEGMENT_SECONDS;

    const segments: SegmentFeatures[] = [];
    for (const s of starts) {
      const samples = await decode(file, s, length);
      const seg = analyzeSegment(samples);
      if (seg) segments.push(seg);
    }
    if (segments.length === 0) return undefined;

    const frames = segments.reduce((a, s) => a + s.frames, 0);
    const sum = (k: keyof SegmentFeatures) => segments.reduce((a, s) => a + (s[k] as number), 0);
    const rmsMean = sum('rmsSum') / frames;
    // Dinámica: desviación del volumen por bloques de 1 s entre todos los trozos
    // (los bloques casi en silencio no cuentan, p. ej. un fundido final)
    const blocks = segments.flatMap(s => s.blockDb).filter(db => db > -60);
    const blockMean = blocks.reduce((a, v) => a + v, 0) / (blocks.length || 1);
    const blockStd = Math.sqrt(blocks.reduce((a, v) => a + (v - blockMean) ** 2, 0) / (blocks.length || 1));
    const chroma = new Array(12).fill(0);
    segments.forEach(s => s.chroma.forEach((v, i) => { chroma[i] += v; }));
    const key = estimateKey(chroma);
    const mfccFrames = sum('mfccFrames') || 1;
    const timbre: number[] = [];
    for (let i = 0; i < MFCC_COUNT; i++) {
      const mean = segments.reduce((a, s) => a + s.mfccSum[i], 0) / mfccFrames;
      const sq = segments.reduce((a, s) => a + s.mfccSqSum[i], 0) / mfccFrames;
      timbre.push(round(mean, 2), round(Math.sqrt(Math.max(0, sq - mean * mean)), 2));
    }
    const tempo = estimateTempo(segments.map(s => s.tempoAc), segments.map(s => s.tempoAcRaw));

    return {
      duration: round(duration, 1),
      loudness: round(20 * Math.log10(rmsMean + 1e-9), 2),
      dynamics: round(blockStd, 2),
      attack: round(sum('attackStrength') / segments.length),
      centroid: Math.round(sum('centroidSum') / frames),
      rolloff: Math.round(sum('rolloffSum') / frames),
      flatness: round(sum('flatnessSum') / frames, 4),
      bassRatio: round(sum('bassSum') / frames),
      onsetRate: round(sum('onsets') / sum('seconds'), 2),
      tempo: round(tempo.bpm, 1),
      pulseClarity: round(tempo.pulseClarity),
      key: key.key,
      mode: key.mode,
      modeStrength: round(key.modeStrength),
      keyConfidence: round(key.confidence),
      camelot: toCamelot(key.key, key.mode),
      timbre,
    };
  } catch (err) {
    console.error('[musicMood] Error analizando', file, err);
    return undefined;
  }
};
