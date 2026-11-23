// Almacén de lo marcado como "No me interesa" en la categoría Recomiéndame.
//
// Pensado para la tarjeta micro SD de la Raspberry: el fichero se lee una sola
// vez (la primera vez que se necesita) y las escrituras se agrupan: tras un
// descarte se espera WRITE_DELAY_MS y se escribe una única vez aunque haya
// habido varios descartes seguidos. Este módulo no importa otros servicios para
// que `utils.ts` pueda usar la ruta (copia semanal) sin crear ciclos.

import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';

export const RECOMMENDATIONS_PATH = 'data/config/recomendaciones.json';

const WRITE_DELAY_MS = 30 * 1000;
const MAX_DISMISSED  = 300;

export interface DismissedRecommendation {
  /** URL normalizada (o el mensaje si no tiene URL). */
  key:     string;
  message: string;
  /** Fecha ISO del descarte. */
  date:    string;
}

interface RecommendationsFile {
  dismissed: DismissedRecommendation[];
}

export class RecommendationFeedback {
  private dismissed: DismissedRecommendation[] | null = null;
  private loading: Promise<DismissedRecommendation[]> | null = null;
  private writeTimer: NodeJS.Timeout | null = null;

  /** Descartes en memoria; lee el fichero solo la primera vez. Fichero ausente o corrupto = vacío. */
  getDismissed = async (): Promise<DismissedRecommendation[]> => {
    if (this.dismissed) return this.dismissed;
    if (!this.loading) {
      this.loading = (async () => {
        try {
          const data: RecommendationsFile = JSON.parse(await readFile(RECOMMENDATIONS_PATH, 'utf8'));
          this.dismissed = Array.isArray(data?.dismissed)
            ? data.dismissed.filter(item => item && typeof item.key === 'string' && typeof item.message === 'string')
            : [];
        } catch {
          this.dismissed = [];
        }
        this.loading = null;
        return this.dismissed;
      })();
    }
    return this.loading;
  };

  /** Añade un descarte (si no estaba) y programa una escritura agrupada. Devuelve false si ya existía. */
  addDismissed = async (item: DismissedRecommendation): Promise<boolean> => {
    const dismissed = await this.getDismissed();
    if (dismissed.some(existing => existing.key === item.key)) return false;
    dismissed.push(item);
    if (dismissed.length > MAX_DISMISSED) dismissed.splice(0, dismissed.length - MAX_DISMISSED);
    this.scheduleWrite();
    return true;
  };

  private scheduleWrite = (): void => {
    if (this.writeTimer) return; // ya hay una escritura pendiente que incluirá este cambio
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      this.flush();
    }, WRITE_DELAY_MS);
  };

  /** Escribe ya los cambios pendientes (si los hay). Nunca lanza. */
  flush = async (): Promise<void> => {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    if (!this.dismissed) return;
    try {
      await mkdir(dirname(RECOMMENDATIONS_PATH), { recursive: true });
      const data: RecommendationsFile = { dismissed: this.dismissed };
      await writeFile(RECOMMENDATIONS_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[Recommendations] Error al guardar los descartes:', err);
    }
  };

  /** Tras importar una sincronización: descarta lo pendiente y vuelve a leer del disco cuando haga falta. */
  reset = (): void => {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    this.dismissed = null;
    this.loading = null;
  };
}
