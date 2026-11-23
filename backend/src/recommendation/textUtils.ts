// Utilidades de texto para el recomendador: parseo de los mensajes RSS,
// limpieza de HTML, normalización, tokenización y un "stemming" ligero.
// Todo es puro (sin disco ni red) para poder probarlo de forma aislada.

export interface ParsedRssMessage {
  title:  string;
  author: string;
  date?:  Date;
  /** Texto libre (descripción / cuerpo) ya sin HTML. */
  body:   string;
  url:    string;
}

const DAY_NAMES = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
// "autor - Thu Jun 12 2025" (la fecha es siempre lo último de la línea)
const HEADER_REGEX = new RegExp(`^(.*)\\s-\\s(${DAY_NAMES} \\w{3} \\d{1,2} \\d{4})\\s*$`);

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

export const decodeEntities = (text: string): string =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(+code))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);

export const stripHtml = (text: string): string =>
  decodeEntities(
    text
      .replace(/<span class="invisible">[^<]*<\/span>/g, '') // trozos ocultos de URLs de Mastodon
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();

const parseDate = (text: string): Date | undefined => {
  const date = new Date(text);
  return isNaN(date.getTime()) ? undefined : date;
};

/**
 * Formatos que se manejan:
 *  - blog / noticias / youtube / guardados: `título\nautor - fecha\ndescripción\nurl`
 *  - mastodon: `@usuario - fecha\n<html>\nurl`
 */
export const parseRssMessage = (message: string): ParsedRssMessage => {
  const lines = (message || '').split('\n');
  const lastLine = (lines[lines.length - 1] || '').trim();
  const url = /^https?:\/\//i.test(lastLine) ? lastLine : '';
  const contentLines = url ? lines.slice(0, -1) : lines;

  let title = '';
  let author = '';
  let date: Date | undefined;
  let bodyLines: string[];

  const header0 = (contentLines[0] || '').trim().match(HEADER_REGEX);
  const header1 = (contentLines[1] || '').trim().match(HEADER_REGEX);
  if (header0) {
    // Mastodon: no hay título, la primera línea es "@usuario - fecha"
    author = header0[1].trim();
    date = parseDate(header0[2]);
    bodyLines = contentLines.slice(1);
  } else if (header1) {
    title = (contentLines[0] || '').trim();
    author = header1[1].trim();
    date = parseDate(header1[2]);
    bodyLines = contentLines.slice(2);
  } else {
    title = (contentLines[0] || '').trim();
    bodyLines = contentLines.slice(1);
  }

  return {
    title:  stripHtml(title),
    author: stripHtml(author),
    date,
    body:   stripHtml(bodyLines.join(' ')),
    url,
  };
};

/** Normaliza una URL para comparar enlaces (sin protocolo, www, barra final ni parámetros de seguimiento). */
export const normalizeUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, '');
    // YouTube: el vídeo lo identifica solo el parámetro v (o la ruta en youtu.be)
    if (host === 'youtube.com' && url.searchParams.get('v')) return `youtube.com/watch?v=${url.searchParams.get('v')}`;
    if (host === 'youtu.be') return `youtube.com/watch?v=${url.pathname.slice(1)}`;
    return `${host}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
};

export const getDomain = (rawUrl: string): string => {
  try {
    return new URL(rawUrl.trim()).hostname.toLowerCase().replace(/^www\.|^m\./, '');
  } catch {
    return '';
  }
};

/** Quita sufijos de título de página habituales en los enlaces del escritorio ("... - YouTube"). */
export const cleanLinkName = (name: string): string =>
  (name || '').replace(/\s[-|–]\s(YouTube|Twitter|X|Reddit|Wikipedia.*)$/i, '').trim();

const STOPWORDS = new Set(`
a al algo algunas algunos ante antes aqui asi aun cada como con contra cual cuales cuando de del desde donde dos e el ella ellas ellos en entre era eran es esa esas ese eso esos esta estaba estado estan estar este esto estos fue fueron ha hace hacer han hasta hay la las le les lo los mas me mi mis mucho muy nada ni no nos nuestra nuestro o os otra otro otros para pero poco por porque que quien se sea ser si sin sobre son su sus tambien te tiene tienen todo todos tu tus un una uno unos y ya yo vez sido solo cosa cosas parte puede pueden hoy dia dias ano anos nuevo nueva gran bien
the a an and or of to in on for with at by from as is are was were be been it its this that these those you your we our they their he she his her i me my not no but so if then than there here what which who how why when where all any can will would should could about into over more most new just also via
https http www com html amp
`.trim().split(/\s+/));

/** Recorta terminaciones frecuentes (plurales, género, adverbios...) en español e inglés. */
export const lightStem = (token: string): string => {
  if (token.length <= 4) return token;
  const suffixes = ['amente', 'mente', 'aciones', 'iciones', 'ciones', 'cion', 'ing', 'es', 'os', 'as', 's', 'o', 'a', 'e'];
  for (const suffix of suffixes) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 4) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
};

export const tokenize = (text: string): string[] =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/[^a-z0-9ñ]+/)
    .filter(token => token.length >= 3 && !/^\d+$/.test(token) && !STOPWORDS.has(token))
    .map(lightStem);
