import { fetchJsonReceive, fetchJsonSendAndReceive } from '../fetch-utils';
import { youtubePageResolveEndpoint, youtubePageVersionEndpoint, youtubePageLiveEndpoint } from '../urls-and-end-points';

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

export const YoutubePageActions = { resolveUrl, getVersionInfo, setLiveVideo, getLiveVideo };
