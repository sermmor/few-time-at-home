// Listas por ánimo de la música de la Cloud (análisis nocturno en el backend).

export type MoodId = 'energetico' | 'fiesta' | 'tranquilo' | 'melancolico' | 'oscuro' | 'epico';
export const MOOD_IDS: MoodId[] = ['energetico', 'fiesta', 'tranquilo', 'melancolico', 'oscuro', 'epico'];

export interface MusicMoodSettings {
  /** Hora (0-23) de inicio de la ventana nocturna de análisis. */
  startHour: number;
  /** Hora (0-23) de fin; si es menor que startHour cruza la medianoche. Igual = sin análisis nocturno. */
  endHour: number;
  /** Rutas de la Cloud que no se analizan (p. ej. "cloud/01_CONVERTIDOS"). */
  ignoredPaths: string[];
}

export interface MusicMoodSaveSettingsResponse {
  ok: boolean;
  settings: MusicMoodSettings;
}

export type MusicMoodState = 'idle' | 'scanning' | 'analyzing' | 'paused';

export interface MusicMoodStatus {
  state: MusicMoodState;
  pausedBy?: string;
  isManual: boolean;
  isDirty: boolean;
  totalFiles: number;
  analyzed: number;
  failed: number;
  pending: number;
  done: number;
  current?: string;
  lastWalk: number;
  lastRunEnd: number;
}

/** "Como esta lista": canciones parecidas a una carpeta o canción patrón. */
export const SIMILAR_MODE = 'comoLista';
export type PlaylistMood = MoodId | typeof SIMILAR_MODE;

export interface MoodPlaylistRequest {
  folderPath: string;
  mood: PlaylistMood;
  count: number;
  /** Solo con SIMILAR_MODE: carpetas y/o canciones patrón. */
  seedPaths?: string[];
  /** Solo con SIMILAR_MODE: incluir también las canciones del patrón (por defecto no). */
  includeSeedSongs?: boolean;
}

export interface MoodPlaylistResponse {
  songs: { path: string; name: string }[];
  analyzedInFolder: number;
  totalInFolder: number;
  /** Solo con SIMILAR_MODE. */
  analyzedInSeed?: number;
  totalInSeed?: number;
}

export const musicMoodSettingsMock = (): MusicMoodSettings => ({ startHour: 1, endHour: 7, ignoredPaths: ['cloud/01_CONVERTIDOS'] });

export const musicMoodStatusMock = (): MusicMoodStatus => ({
  state: 'idle', isManual: false, isDirty: false, totalFiles: 0, analyzed: 0, failed: 0,
  pending: 0, done: 0, lastWalk: 0, lastRunEnd: 0,
});

export const moodPlaylistMock = (): MoodPlaylistResponse => ({ songs: [], analyzedInFolder: 0, totalInFolder: 0 });
