// Resumen diario de "Recomiéndame" por Telegram (cada día a las 6:30).
//
// No toca la tarjeta SD: usa el ranking que ya está en memoria y recuerda lo
// enviado los últimos días solo en memoria (si se reinicia, como mucho se repite
// algún enlace).

import { scheduleJob } from 'node-schedule';
import { RecommendationService } from './recommendation.service';
import { RecommendedItem } from './recommender';
import { parseRssMessage } from './textUtils';

const DAILY_HOUR   = 6;
const DAILY_MINUTE = 30;
/** Enlaces por mensaje. */
const DAILY_AMOUNT = 7;
/** Se miran más candidatos para poder saltar los ya enviados. */
const LOOKAHEAD    = 40;
/** Días durante los que no se repite un enlace ya enviado. */
const NO_REPEAT_DAYS = 7;
const TITLE_MAX = 90;

const GREETINGS = [
  '☀️ ¡Buenos días! Aquí tienes tus 7 recomendaciones de hoy:',
  '🌅 ¡Arriba, que hoy va a ser un gran día! Para el café, estas 7 joyas:',
  '☕ ¡Buenos días! Te he guardado lo mejor del RSS para empezar con buen pie:',
  '🌞 ¡Hola, hola! Tu ración diaria de cosas interesantes está lista:',
  '🚀 ¡Buenos días! 7 enlaces recién seleccionados solo para ti:',
  '🌻 ¡Feliz día! Esto es lo que más te puede gustar hoy:',
];
const FAREWELLS = [
  '¡Que disfrutes del día! 😄',
  '¡A por el día! 💪',
  '¡Feliz lectura! 📚',
  '¡Que tengas un día estupendo! ✨',
];
const SOURCE_ICONS: Record<string, string> = {
  youtube: '🎬', blog: '📝', news: '📰', mastodon: '🐘',
};

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/** Título legible de un elemento (en Mastodon no hay título: se usa el inicio del texto). */
const getItemTitle = (item: RecommendedItem): string => {
  const parsed = parseRssMessage(item.message);
  const title = parsed.title || parsed.body || parsed.author || parsed.url;
  return truncate(title, TITLE_MAX);
};

/** Construye el mensaje (texto plano). Devuelve '' si no hay nada que enviar. */
export const formatDailyRecommendations = (items: RecommendedItem[]): string => {
  if (items.length === 0) return '';
  const lines = items.map((item, index) => {
    const parsed = parseRssMessage(item.message);
    const icon = SOURCE_ICONS[item.source] || '🔗';
    const author = parsed.author ? ` — ${truncate(parsed.author, 40)}` : '';
    return `${index + 1}. ${icon} ${getItemTitle(item)}${author}\n${parsed.url}`;
  });
  return `${pick(GREETINGS)}\n\n${lines.join('\n\n')}\n\n${pick(FAREWELLS)}`;
};

export class DailyRecommendations {
  /** Clave del elemento → fecha (ms) en que se envió. Solo en memoria. */
  private sent = new Map<string, number>();

  constructor(private sendMessageToTelegram?: (message: string) => void) {
    // Sin Telegram no se programa nada (modo dev o conexión desactivada)
    if (!sendMessageToTelegram) return;
    scheduleJob('rss-daily-recommendations', { hour: DAILY_HOUR, minute: DAILY_MINUTE }, () => {
      this.send().catch(err => console.error('[Recommendations] Error en el resumen diario:', err));
    });
    console.log(`> Recomiéndame: resumen diario por Telegram a las ${DAILY_HOUR}:${String(DAILY_MINUTE).padStart(2, '0')}`);
  }

  /** Elige los mejores enlaces aún no enviados estos días (solo los que tienen URL). */
  pickItems = async (now = Date.now()): Promise<RecommendedItem[]> => {
    const limit = now - NO_REPEAT_DAYS * 24 * 60 * 60 * 1000;
    for (const [key, date] of this.sent) if (date < limit) this.sent.delete(key);
    const ranked = await RecommendationService.Instance.getTopItems(LOOKAHEAD);
    return ranked
      .filter(item => parseRssMessage(item.message).url && !this.sent.has(item.key))
      .slice(0, DAILY_AMOUNT);
  };

  send = async (): Promise<void> => {
    if (!this.sendMessageToTelegram) return;
    const items = await this.pickItems();
    const message = formatDailyRecommendations(items);
    if (!message) return;
    this.sendMessageToTelegram(message);
    const now = Date.now();
    items.forEach(item => this.sent.set(item.key, now));
  };
}
