// Servicio de la categoría "Recomiéndame" del RSS.
//
// Minimiza el acceso a la tarjeta SD:
// - Los RSS (MediaRSSAutoupdate) y los escritorios (DesktopProfilesService) ya
//   están en memoria: no se leen del disco.
// - Los guardados se leen del disco una sola vez; después se actualizan en
//   memoria con cada alta/baja (ReadLaterMessagesRSS.onChange).
// - La descripción del unfurl solo se usa si su caché ya está cargada en memoria.
// - El ranking calculado vive solo en memoria (se recalcula, no se guarda).
// - Lo único persistente son los descartes (recomendaciones.json), con escritura agrupada.

import { readFile } from 'fs/promises';
import { ConfigurationService } from '../API/configuration.service';
import { DesktopProfilesService } from '../API/desktopProfiles.service';
import { ReadLaterMessage, ReadLaterMessagesRSS } from '../API/readLaterMessagesRSS.service';
import { MediaRSSAutoupdate } from '../processAutoupdate/mediaRSSAutoupdate';
import { UnfurlCacheService } from '../unfurl/unfurlCache.service';
import { RecommendationFeedback } from './recommendationFeedback';
import {
  getItemKey, ProfileItem, recommend, RecommendationCandidate, RecommendationReason, RecommendedItem,
} from './recommender';
import { cleanLinkName, normalizeUrl, parseRssMessage } from './textUtils';

const SAVED_PATH = 'data/readLaterMessagesRSS.json';
/** Subcategorías de YouTube que nunca se recomiendan. */
const EXCLUDED_YOUTUBE_TAGS = new Set(['abandonados']);
/** Últimos mensajes de cada lista que se tienen en cuenta (las listas guardan hasta 1000). */
const CANDIDATES_PER_LIST = 300;
/** Tamaño del ranking que se guarda en memoria; las peticiones toman un prefijo. */
const RANKED_LIMIT = 200;

export interface RecommendationsResponse {
  messages: string[];
  reasons:  RecommendationReason[];
}

const toProfileItem = (message: string): ProfileItem => {
  const parsed = parseRssMessage(message);
  return { title: parsed.title, text: parsed.body, author: parsed.author, url: parsed.url };
};

export class RecommendationService {
  private static instance: RecommendationService | undefined;

  /** Se crea bajo demanda; el constructor no toca disco ni red. */
  static get Instance(): RecommendationService {
    if (!RecommendationService.instance) RecommendationService.instance = new RecommendationService();
    return RecommendationService.instance;
  }

  private feedback = new RecommendationFeedback();
  private saved: ReadLaterMessage[] | null = null;
  private ranked: RecommendedItem[] | null = null;
  private desktopFingerprint = '';
  /** Se incrementa en cada invalidación para no guardar un ranking calculado con datos ya viejos. */
  private version = 0;

  private constructor() {}

  // ── Avisos de otros servicios ─────────────────────────────────────────────

  /** Los RSS se han actualizado: se recalcula ya, en segundo plano. */
  onRssUpdated = (): void => {
    this.invalidate();
    setImmediate(() => { this.ensureRanked().catch(err => console.error('[Recommendations] Error al recalcular:', err)); });
  };

  /** Los guardados han cambiado: se actualiza la copia en memoria y se recalcula en la próxima petición. */
  onSavedChanged = (messages: ReadLaterMessage[]): void => {
    this.saved = [...messages];
    this.invalidate();
  };

  /** Tras importar una sincronización (zip) se vuelve a leer todo del disco cuando haga falta. */
  reloadFromDisk = (): void => {
    this.feedback.reset();
    this.saved = null;
    this.invalidate();
  };

  private invalidate = (): void => {
    this.ranked = null;
    this.version++;
  };

  // ── API pública ───────────────────────────────────────────────────────────

  getRecommendations = async (amount: number): Promise<RecommendationsResponse> => {
    try {
      const ranked = await this.ensureRanked();
      const items = ranked.slice(0, Math.max(0, amount));
      return { messages: items.map(item => item.message), reasons: items.map(item => item.reason) };
    } catch (err) {
      console.error('[Recommendations] Error al obtener recomendaciones:', err);
      return { messages: [], reasons: [] };
    }
  };

  /** "No me interesa": se guarda (escritura agrupada) y se quita del ranking sin recalcular. */
  dismiss = async (message: string): Promise<void> => {
    if (!message) return;
    const key = getItemKey(message, parseRssMessage(message).url);
    await this.feedback.addDismissed({ key, message, date: new Date().toISOString() });
    if (this.ranked) this.ranked = this.ranked.filter(item => item.key !== key);
  };

  // ── Cálculo ───────────────────────────────────────────────────────────────

  private ensureRanked = async (): Promise<RecommendedItem[]> => {
    const fingerprint = this.getDesktopFingerprint();
    if (this.ranked && fingerprint === this.desktopFingerprint) return this.ranked;
    const version = this.version;

    const [saved, dismissed] = await Promise.all([this.getSaved(), this.feedback.getDismissed()]);
    const desktopLinks = this.getDesktopLinks();

    const positives: ProfileItem[] = [
      ...saved.map(item => toProfileItem(item.message)),
      ...desktopLinks.map(link => ({ title: cleanLinkName(link.name), text: '', url: link.url })),
    ];
    const negatives: ProfileItem[] = dismissed.map(item => toProfileItem(item.message));
    const excludeKeys = new Set<string>([
      ...saved.map(item => getItemKey(item.message, parseRssMessage(item.message).url)),
      ...desktopLinks.map(link => normalizeUrl(link.url)).filter(Boolean),
      ...dismissed.map(item => item.key),
    ]);

    const start = Date.now();
    const ranked = recommend({
      candidates: this.getCandidates(),
      positives,
      negatives,
      excludeKeys,
      now: Date.now(),
      limit: RANKED_LIMIT,
    });
    console.log(`[Recommendations] Ranking calculado: ${ranked.length} elementos en ${Date.now() - start} ms.`);

    if (version === this.version) {
      this.ranked = ranked;
      this.desktopFingerprint = fingerprint;
    }
    return ranked;
  };

  private getCandidates = (): RecommendationCandidate[] => {
    const data = MediaRSSAutoupdate.instance?.currentCompleteData;
    if (!data) return [];
    const last = (messages?: string[]): string[] => (messages || []).slice(-CANDIDATES_PER_LIST);
    const descriptions = this.getUnfurlDescriptions();
    const withExtra = (message: string): string | undefined =>
      descriptions ? descriptions.get(normalizeUrl(parseRssMessage(message).url)) : undefined;

    const candidates: RecommendationCandidate[] = [
      ...last(data.messagesMasto).map(message => ({ message, source: 'mastodon' as const })),
      ...last(data.messagesBlog).map(message => ({ message, source: 'blog' as const })),
      ...last(data.messagesNewsFeed).map(message => ({ message, source: 'news' as const })),
    ];
    const enabledTags = new Set(ConfigurationService.Instance?.rssConfig?.optionTagsYoutube || []);
    for (const group of data.messagesYoutube || []) {
      if (EXCLUDED_YOUTUBE_TAGS.has((group.tag || '').toLowerCase())) continue;
      if (enabledTags.size > 0 && !enabledTags.has(group.tag)) continue;
      for (const message of last(group.content)) {
        candidates.push({ message, source: 'youtube', extraText: withExtra(message) });
      }
    }
    return candidates;
  };

  /** Descripciones del unfurl por URL normalizada, solo si la caché ya está en memoria (no fuerza lecturas). */
  private getUnfurlDescriptions = (): Map<string, string> | undefined => {
    const cache = UnfurlCacheService._instance;
    if (!cache?.isLoadedUnfurlCache) return undefined;
    const map = new Map<string, string>();
    for (const item of cache.unfurlCache) {
      if (item?.url && item.description) map.set(normalizeUrl(item.url), item.description);
    }
    return map;
  };

  private getDesktopLinks = (): { url: string; name: string }[] => {
    const service = DesktopProfilesService.Instance;
    if (!service) return [];
    const links: { url: string; name: string }[] = [];
    for (const profile of service.listProfiles()) {
      for (const link of service.getProfileConfig(profile)?.links || []) {
        if (link && typeof link.url === 'string' && link.url) {
          links.push({ url: link.url, name: typeof link.name === 'string' ? link.name : '' });
        }
      }
    }
    return links;
  };

  /** Huella barata de los enlaces del escritorio (en memoria) para notar si han cambiado. */
  private getDesktopFingerprint = (): string => {
    const links = this.getDesktopLinks();
    return `${links.length}|${links.map(link => link.url).join('|').length}`;
  };

  /** Guardados: una sola lectura del disco; luego se mantienen con onSavedChanged. */
  private getSaved = async (): Promise<ReadLaterMessage[]> => {
    if (this.saved) return this.saved;
    try {
      const data = JSON.parse(await readFile(SAVED_PATH, 'utf8'));
      this.saved = Array.isArray(data) ? data.filter(item => item && typeof item.message === 'string') : [];
    } catch {
      this.saved = [];
    }
    return this.saved;
  };
}

// Enganches: se registran al cargar el módulo (sin disco ni red).
ReadLaterMessagesRSS.onChange = messages => RecommendationService.Instance.onSavedChanged(messages);
MediaRSSAutoupdate.onUpdated = () => RecommendationService.Instance.onRssUpdated();
MediaRSSAutoupdate.extraSupabaseFeeds = async () => {
  const { messages } = await RecommendationService.Instance.getRecommendations(60);
  return [{ feedKey: 'recommended', messages }];
};
