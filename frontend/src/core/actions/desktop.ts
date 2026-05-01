import { fetchJsonSendAndReceive } from '../fetch-utils';
import {
  configurationListByTypeEndpoint,
  configurationEndpoint,
  desktopGetFaviconEndpoint,
} from '../urls-and-end-points';

const CONFIG_TYPE = 'desktop';

export interface StickyNote {
  id:             string;
  workspaceIndex: number;
  x:              number;
  y:              number;
  width:          number;
  height:         number;
  content:        string;
  /** Color de fondo del post-it (hex). Omitido = amarillo por defecto. */
  color?:         string;
  /** Tamaño de fuente en px. Omitido = 13. */
  fontSize?:      number;
  /** Opacidad (0.1 – 1.0). Omitido = 1 (totalmente opaco). */
  alpha?:         number;
}

export interface DesktopLink {
  id:             string;
  workspaceIndex: number;
  x:              number;
  y:              number;
  url:            string;
  name:           string;
  /** Nombre del fichero de favicon en data/favicon/ (sin extensión). Omitido = icono por defecto. */
  favicon?:       string;
}

export interface DesktopConfig {
  rows:       number;
  cols:       number;
  /** One cloud path per workspace (empty string = use default colour). */
  wallpapers: string[];
  notes:      StickyNote[];
  links:      DesktopLink[];
}

export const DEFAULT_DESKTOP_CONFIG: DesktopConfig = {
  rows:       4,
  cols:       4,
  wallpapers: Array(16).fill(''),
  notes:      [],
  links:      [],
};

const getDesktopConfig = (): Promise<DesktopConfig> =>
  fetchJsonSendAndReceive<{ data: DesktopConfig | null }>(
    configurationListByTypeEndpoint(),
    { type: CONFIG_TYPE },
    { data: null },
  ).then(res => {
    const d = res.data;
    if (!d || typeof d.rows !== 'number') return { ...DEFAULT_DESKTOP_CONFIG };
    const total = (d.rows ?? 4) * (d.cols ?? 4);
    return {
      rows:       d.rows ?? DEFAULT_DESKTOP_CONFIG.rows,
      cols:       d.cols ?? DEFAULT_DESKTOP_CONFIG.cols,
      wallpapers: Array.from({ length: total }, (_, i) => d.wallpapers?.[i] ?? ''),
      notes:      Array.isArray(d.notes) ? d.notes : [],
      links:      Array.isArray(d.links) ? d.links : [],
    };
  });

const saveDesktopConfig = (config: DesktopConfig): Promise<void> =>
  fetchJsonSendAndReceive<{ response: string }>(
    configurationEndpoint(),
    { type: CONFIG_TYPE, content: config },
    { response: '' },
  ).then(() => undefined);

/** Solicita al backend que descargue (o recupere de caché) el favicon de una URL.
 *  Devuelve el nombre del fichero (sin extensión) o null si no se pudo obtener. */
const getFavicon = (url: string): Promise<string | null> =>
  fetchJsonSendAndReceive<{ name?: string | null }>(
    desktopGetFaviconEndpoint(),
    { url },
    {},
  ).then(res => res.name ?? null)
  .catch(() => null);

export const DesktopActions = { getDesktopConfig, saveDesktopConfig, getFavicon };
