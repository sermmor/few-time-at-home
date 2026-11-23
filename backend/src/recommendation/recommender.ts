// Algoritmo de recomendación basado en contenido (sin disco ni red).
//
// Cada candidato (mensaje RSS) recibe una puntuación:
//   score = (0.6·texto + 0.25·fuente + 0.15·novedad) · (1 − penalización)
// - texto: similitud TF-IDF (coseno) con lo que le gusta al usuario (guardados +
//   enlaces de los escritorios); media de las 3 coincidencias más altas.
// - fuente: el autor/canal o el dominio aparecen en los gustos del usuario.
// - novedad: decae a la mitad cada RECENCY_HALF_LIFE_DAYS.
// - penalización: parecido con lo marcado como "No me interesa".
// Después se ordena de forma voraz penalizando repetir autor y categoría, y
// descartando casi-duplicados, para que la lista salga variada.

import { getDomain, normalizeUrl, parseRssMessage, tokenize } from './textUtils';

export type RecommendationSource = 'mastodon' | 'youtube' | 'blog' | 'news';

export interface RecommendationCandidate {
  message: string;
  source:  RecommendationSource;
  /** Texto extra para puntuar (p. ej. la descripción cacheada del unfurl); no se muestra. */
  extraText?: string;
}

/** Algo que al usuario le gusta (positivo) o no le interesa (negativo). */
export interface ProfileItem {
  title:   string;
  text:    string;
  author?: string;
  url?:    string;
}

export type RecommendationReason =
  | { kind: 'similar'; ref: string }
  | { kind: 'author';  ref: string }
  | { kind: 'domain';  ref: string }
  | { kind: 'recent' };

export interface RecommendedItem {
  message: string;
  source:  RecommendationSource;
  /** Clave única del elemento (URL normalizada o, si no hay, el propio mensaje). */
  key:     string;
  score:   number;
  reason:  RecommendationReason;
}

export interface RecommendInput {
  candidates:  RecommendationCandidate[];
  positives:   ProfileItem[];
  negatives:   ProfileItem[];
  /** Claves (URLs normalizadas) que nunca se recomiendan: ya guardadas, en el escritorio o descartadas. */
  excludeKeys: Set<string>;
  now:         number;
  limit:       number;
}

export const WEIGHT_TEXT     = 0.6;
export const WEIGHT_SOURCE   = 0.25;
export const WEIGHT_RECENCY  = 0.15;
const RECENCY_HALF_LIFE_DAYS = 7;
const RECENCY_NO_DATE        = 0.3;
const TEXT_SCALE             = 2.5;  // coseno 0.4 ≈ texto máximo
const TOP_MATCHES            = 3;
const SIMILAR_REASON_MIN     = 0.12; // coseno mínimo para decir "Parecido a"
const AUTHOR_REPEAT_FACTOR   = 0.6;  // cada vez que se repite autor en la lista
const SOURCE_REPEAT_FACTOR   = 0.9;  // cada vez que se repite categoría en la lista
const NEAR_DUPLICATE_COSINE  = 0.75;
const MAX_POOL               = 600;  // candidatos que entran en la ordenación final

/** Dominios demasiado genéricos para indicar una preferencia. */
const GENERIC_DOMAINS = new Set(['youtube.com', 'youtu.be', 'google.com', 'twitter.com', 'x.com', 't.co']);

type SparseVector = Map<string, number>;

export const getItemKey = (message: string, url: string): string => normalizeUrl(url) || message;

const countTerms = (tokens: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return counts;
};

const toTfIdf = (counts: Map<string, number>, idf: Map<string, number>): SparseVector => {
  const vector: SparseVector = new Map();
  let norm = 0;
  counts.forEach((count, term) => {
    const weight = (1 + Math.log(count)) * (idf.get(term) || 0);
    if (weight > 0) {
      vector.set(term, weight);
      norm += weight * weight;
    }
  });
  norm = Math.sqrt(norm);
  if (norm > 0) vector.forEach((weight, term) => vector.set(term, weight / norm));
  return vector;
};

const cosine = (a: SparseVector, b: SparseVector): number => {
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  small.forEach((weight, term) => {
    const other = big.get(term);
    if (other) dot += weight * other;
  });
  return dot;
};

/** Índice invertido sobre los vectores del perfil para no comparar término a término con todos. */
const buildInvertedIndex = (vectors: SparseVector[]): Map<string, { doc: number; weight: number }[]> => {
  const index = new Map<string, { doc: number; weight: number }[]>();
  vectors.forEach((vector, doc) => vector.forEach((weight, term) => {
    const postings = index.get(term) || [];
    postings.push({ doc, weight });
    index.set(term, postings);
  }));
  return index;
};

const similarities = (vector: SparseVector, index: Map<string, { doc: number; weight: number }[]>): Map<number, number> => {
  const scores = new Map<number, number>();
  vector.forEach((weight, term) => {
    for (const posting of index.get(term) || []) {
      scores.set(posting.doc, (scores.get(posting.doc) || 0) + weight * posting.weight);
    }
  });
  return scores;
};

/** 0 → 0, 1 → 0.5, 2 → 0.75, 3 → 0.875... */
const affinity = (count: number): number => 1 - Math.pow(0.5, count);

const normalizeName = (name: string): string => (name || '').trim().toLowerCase();

const documentTokens = (title: string, text: string, author?: string): string[] => {
  const titleTokens = tokenize(title);
  // El título pesa el doble que el cuerpo; el autor ayuda a casar nombres de canal
  return [...titleTokens, ...titleTokens, ...tokenize(text), ...tokenize(author || '')];
};

const truncate = (text: string, max = 80): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export const recommend = (input: RecommendInput): RecommendedItem[] => {
  const { positives, negatives, excludeKeys, now, limit } = input;

  // ── 1. Candidatos únicos y no excluidos ────────────────────────────────────
  const seen = new Set<string>();
  const candidates: { candidate: RecommendationCandidate; parsed: ReturnType<typeof parseRssMessage>; key: string }[] = [];
  for (const candidate of input.candidates) {
    if (!candidate.message) continue;
    const parsed = parseRssMessage(candidate.message);
    const key = getItemKey(candidate.message, parsed.url);
    if (seen.has(key) || excludeKeys.has(key)) continue;
    seen.add(key);
    candidates.push({ candidate, parsed, key });
  }
  if (candidates.length === 0) return [];

  // ── 2. TF-IDF sobre candidatos + perfil ────────────────────────────────────
  const candidateCounts = candidates.map(({ candidate, parsed }) =>
    countTerms(documentTokens(parsed.title, `${parsed.body} ${candidate.extraText || ''}`, parsed.author)));
  const positiveCounts  = positives.map(item => countTerms(documentTokens(item.title, item.text, item.author)));
  const negativeCounts  = negatives.map(item => countTerms(documentTokens(item.title, item.text, item.author)));
  const allCounts = [...candidateCounts, ...positiveCounts, ...negativeCounts];

  const documentFrequency = new Map<string, number>();
  for (const counts of allCounts) counts.forEach((_, term) => documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1));
  const idf = new Map<string, number>();
  documentFrequency.forEach((df, term) => idf.set(term, Math.log((allCounts.length + 1) / (df + 1)) + 1));

  const candidateVectors = candidateCounts.map(counts => toTfIdf(counts, idf));
  const positiveVectors  = positiveCounts.map(counts => toTfIdf(counts, idf));
  const negativeVectors  = negativeCounts.map(counts => toTfIdf(counts, idf));
  const positiveIndex = buildInvertedIndex(positiveVectors);
  const negativeIndex = buildInvertedIndex(negativeVectors);

  // ── 3. Afinidad de autor y dominio ─────────────────────────────────────────
  const authorCounts = new Map<string, number>();
  const domainCounts = new Map<string, number>();
  const negativeAuthorCounts = new Map<string, number>();
  for (const item of positives) {
    const author = normalizeName(item.author || '');
    if (author) authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
    const domain = getDomain(item.url || '');
    if (domain && !GENERIC_DOMAINS.has(domain)) domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
  }
  for (const item of negatives) {
    const author = normalizeName(item.author || '');
    if (author) negativeAuthorCounts.set(author, (negativeAuthorCounts.get(author) || 0) + 1);
  }

  // ── 4. Puntuación individual ───────────────────────────────────────────────
  const scored = candidates.map(({ candidate, parsed, key }, i) => {
    const vector = candidateVectors[i];

    const positiveSims = similarities(vector, positiveIndex);
    const topSims = Array.from(positiveSims.entries()).sort((a, b) => b[1] - a[1]).slice(0, TOP_MATCHES);
    const meanTop = topSims.length ? topSims.reduce((sum, [, sim]) => sum + sim, 0) / TOP_MATCHES : 0;
    const textScore = Math.min(1, meanTop * TEXT_SCALE);

    const author = normalizeName(parsed.author);
    const domain = getDomain(parsed.url);
    const authorAffinity = author ? affinity(authorCounts.get(author) || 0) : 0;
    const domainAffinity = domain && !GENERIC_DOMAINS.has(domain) ? affinity(domainCounts.get(domain) || 0) * 0.7 : 0;
    const sourceScore = Math.max(authorAffinity, domainAffinity);

    const recencyScore = parsed.date
      ? Math.pow(0.5, Math.max(0, now - parsed.date.getTime()) / (RECENCY_HALF_LIFE_DAYS * 86400000))
      : RECENCY_NO_DATE;

    let maxNegative = 0;
    similarities(vector, negativeIndex).forEach(sim => { maxNegative = Math.max(maxNegative, sim); });
    const negativeAuthor = author ? affinity(negativeAuthorCounts.get(author) || 0) * 0.5 : 0;
    const penalty = Math.min(0.9, Math.max(maxNegative * TEXT_SCALE * 0.8, negativeAuthor));

    const score = (WEIGHT_TEXT * textScore + WEIGHT_SOURCE * sourceScore + WEIGHT_RECENCY * recencyScore) * (1 - penalty);

    let reason: RecommendationReason = { kind: 'recent' };
    if (topSims.length && topSims[0][1] >= SIMILAR_REASON_MIN) {
      reason = { kind: 'similar', ref: truncate(positives[topSims[0][0]].title || positives[topSims[0][0]].text) };
    } else if (authorAffinity > 0) {
      reason = { kind: 'author', ref: parsed.author };
    } else if (domainAffinity > 0) {
      reason = { kind: 'domain', ref: domain };
    }

    return { index: i, message: candidate.message, source: candidate.source, key, author, score, reason };
  });

  // ── 5. Ordenación voraz con variedad ───────────────────────────────────────
  const pool = scored.sort((a, b) => b.score - a.score).slice(0, MAX_POOL);
  const picked: RecommendedItem[] = [];
  const pickedVectors: SparseVector[] = [];
  const authorUses = new Map<string, number>();
  const sourceUses = new Map<string, number>();

  while (picked.length < limit && pool.length > 0) {
    let bestIndex = -1;
    let bestValue = -1;
    for (let i = 0; i < pool.length; i++) {
      const item = pool[i];
      const value = item.score
        * Math.pow(AUTHOR_REPEAT_FACTOR, item.author ? authorUses.get(item.author) || 0 : 0)
        * Math.pow(SOURCE_REPEAT_FACTOR, sourceUses.get(item.source) || 0);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    const [best] = pool.splice(bestIndex, 1);
    const vector = candidateVectors[best.index];
    if (vector.size > 0 && pickedVectors.some(other => cosine(vector, other) > NEAR_DUPLICATE_COSINE)) continue;

    picked.push({ message: best.message, source: best.source, key: best.key, score: best.score, reason: best.reason });
    pickedVectors.push(vector);
    if (best.author) authorUses.set(best.author, (authorUses.get(best.author) || 0) + 1);
    sourceUses.set(best.source, (sourceUses.get(best.source) || 0) + 1);
  }

  return picked;
};
