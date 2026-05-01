import { fetchJsonSendAndReceive } from '../fetch-utils';
import {
  configurationListByTypeEndpoint,
  configurationEndpoint,
} from '../urls-and-end-points';

const CONFIG_TYPE = 'desktop';

export interface DesktopConfig {
  rows:       number;
  cols:       number;
  /** One cloud path per workspace (empty string = use default colour). */
  wallpapers: string[];
}

export const DEFAULT_DESKTOP_CONFIG: DesktopConfig = {
  rows:       4,
  cols:       4,
  wallpapers: Array(16).fill(''),
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
    };
  });

const saveDesktopConfig = (config: DesktopConfig): Promise<void> =>
  fetchJsonSendAndReceive<{ response: string }>(
    configurationEndpoint(),
    { type: CONFIG_TYPE, content: config },
    { response: '' },
  ).then(() => undefined);

export const DesktopActions = { getDesktopConfig, saveDesktopConfig };
