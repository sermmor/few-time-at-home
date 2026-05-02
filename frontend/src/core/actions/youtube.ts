import { fetchJsonReceive, fetchJsonSendAndReceive } from '../fetch-utils';
import { youtubePageResolveEndpoint, youtubePageVersionEndpoint } from '../urls-and-end-points';

// ── Types ────────────────────────────────────────────────────────────────────

export interface YoutubeResolveResult {
  streamUrl:   string;
  title:       string;
  contentType: string;
  error?:      string;
}

export interface YoutubeVersionInfo {
  installed: string;
  latest:    string;
  hasUpdate: boolean;
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

export const YoutubePageActions = { resolveUrl, getVersionInfo };
