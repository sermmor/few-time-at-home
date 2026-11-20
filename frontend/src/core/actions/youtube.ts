import { fetchJsonReceive, fetchJsonSendAndReceive } from '../fetch-utils';
import { youtubePageResolveEndpoint, youtubePageVersionEndpoint, youtubePageUpdateEndpoint, youtubePageLiveEndpoint } from '../urls-and-end-points';

// ── Types ────────────────────────────────────────────────────────────────────

export interface YoutubeResolveResult {
  streamUrl:   string;
  title:       string;
  contentType: string;
  error?:      string;
}

export interface YoutubeVersionInfo {
  installed: string;    // 'none' si el backend aún no tiene ninguna versión instalada
  latest:    string;
  hasUpdate: boolean;
  updating?: boolean;   // hay una actualización en curso en el backend
}

export interface YoutubeUpdateResult {
  ok:       boolean;
  previous: string;
  version:  string;
  changed:  boolean;
  error?:   string;
}

// ── Actions ──────────────────────────────────────────────────────────────────

const resolveUrl = (url: string): Promise<YoutubeResolveResult> =>
  fetchJsonSendAndReceive<YoutubeResolveResult>(
    youtubePageResolveEndpoint(),
    { url },
    { streamUrl: '', title: '', contentType: 'video/mp4' },
  );

const getVersionInfo = (): Promise<YoutubeVersionInfo> =>
  fetchJsonReceive<YoutubeVersionInfo>(
    youtubePageVersionEndpoint(),
    { installed: '…', latest: '…', hasUpdate: false },
  );

// Puede tardar (npm install en el backend): el backend no se para mientras tanto.
const updateLib = (): Promise<YoutubeUpdateResult> =>
  fetchJsonSendAndReceive<YoutubeUpdateResult>(
    youtubePageUpdateEndpoint(),
    {},
    { ok: false, previous: '', version: '', changed: false, error: 'mock' },
  );

const setLiveVideo = (videoId: string): Promise<{ ok: boolean }> =>
  fetchJsonSendAndReceive<{ ok: boolean }>(
    youtubePageLiveEndpoint(),
    { videoId },
    { ok: false },
  );

const getLiveVideo = (): Promise<{ videoId: string }> =>
  fetchJsonReceive<{ videoId: string }>(
    youtubePageLiveEndpoint(),
    { videoId: '' },
  );

export const YoutubePageActions = { resolveUrl, getVersionInfo, updateLib, setLiveVideo, getLiveVideo };
