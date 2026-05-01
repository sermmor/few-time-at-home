import { fetchJsonSendAndReceive } from '../fetch-utils';
import {
  configurationListByTypeEndpoint,
  configurationEndpoint,
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
}

export interface DesktopConfig {
  rows:       number;
  cols:       number;
  /** One cloud path per workspace (empty string = use default colour). */
  wallpapers: string[];
  notes:      StickyNote[];
}

export const DEFAULT_DESKTOP_CONFIG: DesktopConfig = {
  rows:       4,
  cols:       4,
  wallpapers: Array(16).fill(''),
  notes:      [],
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
    };
  });

const saveDesktopConfig = (config: DesktopConfig): Promise<void> =>
  fetchJsonSendAndReceive<{ response: string }>(
    configurationEndpoint(),
    { type: CONFIG_TYPE, content: config },
    { response: '' },
  ).then(() => undefined);

export const DesktopActions = { getDesktopConfig, saveDesktopConfig };
