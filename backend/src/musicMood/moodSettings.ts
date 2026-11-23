// Ajustes del análisis de ánimos que el usuario edita en /configuration > Otros:
// horario nocturno y carpetas de la Cloud que no se analizan.
// Fichero data/config/musicMood.json; si no existe se usan los valores por defecto
// (y no se escriben hasta que el usuario guarde).
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import pathModule from 'path';

export const MUSIC_MOOD_SETTINGS_PATH = 'data/config/musicMood.json';

export interface MusicMoodSettings {
  /** Hora (0-23) a la que empieza la ventana de análisis. */
  startHour: number;
  /** Hora (0-23) a la que termina. Si es menor que startHour cruza la medianoche. */
  endHour: number;
  /** Carpetas o ficheros relativos a la raíz de la Cloud (p. ej. "cloud/01_CONVERTIDOS"). */
  ignoredPaths: string[];
}

export const defaultMusicMoodSettings = (): MusicMoodSettings => ({
  startHour: 1,
  endHour: 7,
  // Copias del conversor "Pendrive del coche": serían canciones repetidas
  ignoredPaths: ['cloud/01_CONVERTIDOS'],
});

const clampHour = (v: unknown, fallback: number): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 23 ? n : fallback;
};

/** "/cloud/x/" o "cloud\\x" -> "cloud/x". */
export const normalizeCloudPath = (p: string): string =>
  p.replace(/\\/g, '/').split('/').filter(part => part !== '' && part !== '.').join('/');

/** Valida lo leído o recibido: lo que no encaje vuelve al valor por defecto. */
export const sanitizeSettings = (raw: any): MusicMoodSettings => {
  const def = defaultMusicMoodSettings();
  const paths = Array.isArray(raw?.ignoredPaths)
    ? raw.ignoredPaths.filter((p: unknown) => typeof p === 'string').map(normalizeCloudPath).filter((p: string) => p !== '')
    : def.ignoredPaths;
  return {
    startHour: clampHour(raw?.startHour, def.startHour),
    endHour: clampHour(raw?.endHour, def.endHour),
    ignoredPaths: Array.from(new Set<string>(paths)),
  };
};

export const loadSettings = async (): Promise<MusicMoodSettings> => {
  try {
    return sanitizeSettings(JSON.parse(await readFile(MUSIC_MOOD_SETTINGS_PATH, 'utf8')));
  } catch {
    return defaultMusicMoodSettings();
  }
};

export const saveSettings = async (settings: MusicMoodSettings): Promise<boolean> => {
  try {
    await mkdir(pathModule.dirname(MUSIC_MOOD_SETTINGS_PATH), { recursive: true });
    const tmp = `${MUSIC_MOOD_SETTINGS_PATH}.tmp`;
    await writeFile(tmp, JSON.stringify(settings, null, 2));
    await rename(tmp, MUSIC_MOOD_SETTINGS_PATH);
    return true;
  } catch (err) {
    console.error('[musicMood] No se pudieron guardar los ajustes:', err);
    return false;
  }
};

/** ¿La ruta (relativa a la Cloud) está dentro de alguna carpeta ignorada? */
export const isIgnoredPath = (rel: string, ignoredPaths: string[]): boolean =>
  ignoredPaths.some(ignored => rel === ignored || rel.startsWith(`${ignored}/`));

/** ¿La hora está dentro de la ventana? Admite ventanas que cruzan la medianoche;
 *  inicio = fin significa "sin análisis nocturno" (solo "Analizar ahora"). */
export const isHourInWindow = (hour: number, s: MusicMoodSettings): boolean => {
  if (s.startHour === s.endHour) return false;
  return s.startHour < s.endHour
    ? hour >= s.startHour && hour < s.endHour
    : hour >= s.startHour || hour < s.endHour;
};
