// "¿Es la misma canción?" a partir del nombre del fichero, para no meter en una lista
// dos versiones de un mismo tema (la del disco y la en vivo, una demo, un single
// edit, el mismo mp3 recodificado en otra carpeta…). La huella del índice no sirve
// aquí: cada versión o codificación tiene una huella distinta. Sin IA.
import pathModule from 'path';

/** Palabras de "versión" que no forman parte del título. */
const VERSION_WORDS = new Set([
  'live', 'en', 'vivo', 'directo', 'concierto', 'remaster', 'remastered', 'remasterizado', 'remasterizada',
  'edit', 'single', 'radio', 'version', 'album', 'original', 'acoustic', 'acustico', 'acustica', 'unplugged',
  'demo', 'mix', 'remix', 'instrumental', 'extended', 'mono', 'stereo', 'bonus', 'track', 'explicit',
  'clean', 'official', 'video', 'audio', 'lyrics', 'letra', 'hq', 'hd', 'take', 'alternate', 'rehearsal',
  'session', 'sessions', 'reprise', 'cover',
]);

/** Títulos sin nada propio ("Track 03", "Intro"): no se pueden comparar por nombre. */
const GENERIC_TITLE = /^((track|pista|audio|unknown|desconocido|untitled|sin titulo|intro|outro|interlude|interludio|skit|hidden track)( \d+)?|\d*)$/;

const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Quita palabras de versión, años y números largos (ids de descarga); deja letras y
 *  números con espacios. Los números cortos se quedan: "Battle 1" y "Battle 2" son distintas. */
const cleanPart = (part: string): string => (/www|\.(com|net|org)\b/.test(part) ? '' : part)
  .replace(/[^a-z0-9ñ]+/g, ' ')
  .split(' ')
  .filter(w => w !== '' && !VERSION_WORDS.has(w) && !/^\d{3,}$/.test(w))
  .join(' ');

/** Trozos de un nombre separados por " - " ya limpios, sin el número de pista. */
const titleParts = (filePath: string): string[] => {
  let name = pathModule.posix.basename(filePath.replace(/\\/g, '/'));
  name = name.slice(0, name.length - pathModule.extname(name).length);
  name = stripAccents(name.toLowerCase())
    .replace(/[([{][^)\]}]*[)\]}]/g, ' ')   // (Live), [Single Edit], {Demo}
    .replace(/_/g, ' ')
    .replace(/\s(feat|ft|featuring)\.?\s.*$/, ' ');
  // Número de pista al principio: "03. ", "03 - ", "1-03 ", "cd2 05 ", "a1. "
  name = name.replace(/^\s*(cd\s*\d+\s*)?([a-d]?\d{1,3}([-.]\d{1,3})?)(\s*[-.)]\s*|\s+)/, '');
  return name.split(/\s+-\s+|\s*–\s*/).map(cleanPart).filter(p => p !== '' && !/^\d+$/.test(p));
};

/**
 * Trozos que se repiten en la mayoría de nombres de una carpeta: el artista, el disco
 * o la web de descarga ("Pearl Jam - 01 - Once - Ten.mp3"), que no son el título.
 */
export const folderCommonParts = (namesInFolder: string[]): Set<string> => {
  const common = new Set<string>();
  if (namesInFolder.length < 3) return common;
  const counts = new Map<string, number>();
  namesInFolder.forEach(n => new Set(titleParts(n)).forEach(p => counts.set(p, (counts.get(p) ?? 0) + 1)));
  counts.forEach((c, part) => { if (c >= namesInFolder.length * 0.6) common.add(part); });
  return common;
};

/**
 * Clave de título normalizada, o '' si el nombre no tiene un título utilizable.
 * "06. So Much Is Lost.mp3", "03 - So Much Is Lost (Live).mp3" y
 * "Artista - So Much Is Lost [Single Edit].flac" dan "so much is lost".
 * `commonParts` (de `folderCommonParts`) quita artista/disco repetidos en la carpeta.
 */
export const songTitleKey = (filePath: string, commonParts?: Set<string>): string => {
  const parts = titleParts(filePath);
  const own = commonParts ? parts.filter(p => !commonParts.has(p)) : parts;
  // "Artista - Título - Live": el título es el último trozo propio
  // (sin trozo propio, p. ej. "Apocalyptica - Track 01": no hay título)
  const key = own.length > 0 ? own[own.length - 1] : '';
  return GENERIC_TITLE.test(key) ? '' : key;
};

/** ¿Distancia de edición (Levenshtein) ≤ max? Corta en cuanto una fila la supera
 *  (casi siempre en las primeras letras), que se llama miles de veces por lista. */
const withinEditDistance = (a: string, b: string, max: number): boolean => {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    let rowMin = row[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
      if (row[j] < rowMin) rowMin = row[j];
    }
    if (rowMin > max) return false;
  }
  return row[b.length] <= max;
};

/** Longitud mínima para comparar de forma aproximada (con "Fear" solo vale igual). */
const MIN_FUZZY_LENGTH = 6;
const MAX_EDIT_RATIO = 0.15;

/**
 * ¿Dos claves de `songTitleKey` son la misma canción? Iguales; una contenida en la
 * otra como palabras completas ("so much is lost" en "so much is lost single
 * mix"); o casi iguales, por erratas ("so mach is lost").
 */
export const isSameTitle = (a: string, b: string): boolean => {
  if (a === '' || b === '') return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < MIN_FUZZY_LENGTH) return false;
  // Contenida: solo si no es una palabra suelta dentro de otro título ("heaven" en
  // "stairway to heaven" son canciones distintas)
  if (` ${long} `.includes(` ${short} `) && (short.includes(' ') || short.length >= long.length * 0.6)) return true;
  const max = Math.floor(long.length * MAX_EDIT_RATIO);
  if (long.length - short.length > max) return false;
  return withinEditDistance(short, long, max);
};
