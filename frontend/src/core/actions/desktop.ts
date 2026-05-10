import { fetchJsonSendAndReceive } from '../fetch-utils';
import {
  configurationListByTypeEndpoint,
  configurationEndpoint,
  desktopGetFaviconEndpoint,
  desktopFlushEndpoint,
  desktopProfilesEndpoint,
  desktopProfileCreateEndpoint,
  desktopProfileDuplicateEndpoint,
  desktopProfileActivateEndpoint,
  desktopProfileMakeRemoteEndpoint,
  desktopProfileDeleteEndpoint,
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

export interface DesktopImage {
  id:             string;
  workspaceIndex: number;
  x:              number;
  y:              number;
  width:          number;   // starts at 300, then auto-corrected to aspect ratio
  height:         number;   // 0 = "not yet measured"
  cloudPath:      string;
}

export interface DesktopPanel {
  id:             string;
  workspaceIndex: number;
  x:              number;
  y:              number;
  width:          number;
  height:         number;
}

export interface DesktopConfig {
  rows:        number;
  cols:        number;
  /** One cloud path per workspace (empty string = use default colour). */
  wallpapers:  string[];
  notes:       StickyNote[];
  links:       DesktopLink[];
  /** When true, links are rendered as a touch-friendly grid instead of free-floating icons. */
  tabletMode?: boolean;
  images?:     DesktopImage[];
  panels?:     DesktopPanel[];
}

export const DEFAULT_DESKTOP_CONFIG: DesktopConfig = {
  rows:       4,
  cols:       4,
  wallpapers: Array(16).fill(''),
  notes:      [],
  links:      [],
  tabletMode: false,
  images:     [],
  panels:     [],
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
      tabletMode: d.tabletMode ?? false,
      images:     Array.isArray(d.images) ? d.images : [],
      panels:     Array.isArray(d.panels) ? d.panels : [],
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

/** Vuelca el config de escritorio de la RAM del backend al fichero desktop.json.
 *  Llamar al navegar a otra página (el componente se desmonta) o en beforeunload. */
const flushDesktopConfig = (): Promise<void> =>
  fetchJsonSendAndReceive<Record<string, never>>(
    desktopFlushEndpoint(),
    {},
    {},
  ).then(() => undefined)
  .catch(() => undefined); // Los errores de flush no son críticos

// ── Desktop profile management ────────────────────────────────────────────────

export interface DesktopProfileMeta {
  name:       string;
  tabletMode: boolean;
  isRemote:   boolean;
}

export interface DesktopProfilesInfo {
  profiles: DesktopProfileMeta[];
  active:   string;
}

const listProfiles = (): Promise<DesktopProfilesInfo> =>
  fetch(desktopProfilesEndpoint())
    .then(r => r.json() as Promise<DesktopProfilesInfo>);

const createProfile = (name: string, tabletMode = false, isRemote = false): Promise<DesktopProfilesInfo> =>
  fetch(desktopProfileCreateEndpoint(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, tabletMode, isRemote }),
  }).then(async r => {
    const body = await r.json();
    if (!r.ok) throw new Error(body.error ?? 'create_failed');
    return body as DesktopProfilesInfo;
  });

const activateProfile = (name: string): Promise<DesktopProfilesInfo> =>
  fetch(desktopProfileActivateEndpoint(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name }),
  }).then(async r => {
    const body = await r.json();
    if (!r.ok) throw new Error(body.error ?? 'activate_failed');
    return body as DesktopProfilesInfo;
  });

const deleteProfile = (name: string): Promise<DesktopProfilesInfo> =>
  fetch(desktopProfileDeleteEndpoint(name), {
    method: 'DELETE',
  }).then(async r => {
    const body = await r.json();
    if (!r.ok) throw new Error(body.error ?? 'delete_failed');
    return body as DesktopProfilesInfo;
  });

const duplicateProfile = (sourceName: string, newName: string): Promise<DesktopProfilesInfo> =>
  fetch(desktopProfileDuplicateEndpoint(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ sourceName, newName }),
  }).then(async r => {
    const body = await r.json();
    if (!r.ok) throw new Error(body.error ?? 'duplicate_failed');
    return body as DesktopProfilesInfo;
  });

const makeProfileRemote = (name: string): Promise<DesktopProfilesInfo> =>
  fetch(desktopProfileMakeRemoteEndpoint(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name }),
  }).then(async r => {
    const body = await r.json();
    if (!r.ok) throw new Error(body.error ?? 'make_remote_failed');
    return body as DesktopProfilesInfo;
  });

export const DesktopActions = {
  getDesktopConfig,
  saveDesktopConfig,
  getFavicon,
  flushDesktopConfig,
  listProfiles,
  createProfile,
  duplicateProfile,
  activateProfile,
  makeProfileRemote,
  deleteProfile,
};

