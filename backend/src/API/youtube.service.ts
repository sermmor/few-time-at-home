import {
  getActiveYoutubeLibVersion,
  getLatestYoutubeLibVersion,
  isYoutubeLibUpdating,
  resolveInWorker,
  updateYoutubeLib,
  type YoutubeResolveResult,
  type YoutubeUpdateResult,
} from '../youtube/youtubeLib';

// youtubei.js ya no se carga en este proceso: vive en un proceso hijo que se
// puede actualizar en caliente. Ver src/youtube/youtubeLib.ts.
export type { YoutubeResolveResult, YoutubeUpdateResult };

// ── URL helpers ──────────────────────────────────────────────────────────────

export const extractVideoId = (url: string): string | null => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/,
  );
  return match ? match[1] : null;
};

// ── Resolve YouTube URL → direct stream URL ──────────────────────────────────

export const resolveYoutubeStreamUrl = async (
  youtubeUrl: string,
): Promise<YoutubeResolveResult> => {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) throw new Error(`Invalid YouTube URL: ${youtubeUrl}`);
  return resolveInWorker(videoId);
};

// ── Live-embed video ID (in-memory, no persistence) ─────────────────────────

let liveVideoId: string = '';

export const setLiveVideoId = (id: string): void => { liveVideoId = id; };
export const getLiveVideoId = (): string => liveVideoId;

// ── Version info (installed vs. latest on npm) ───────────────────────────────

export interface YoutubeVersionInfo {
  installed: string;   // 'none' si aún no hay ninguna versión instalada
  latest:    string;
  hasUpdate: boolean;
  updating:  boolean;
}

export const getYoutubeJsVersionInfo = async (): Promise<YoutubeVersionInfo> => {
  const installed = await getActiveYoutubeLibVersion();
  const latest    = (await getLatestYoutubeLibVersion()) ?? installed;
  const hasUpdate = latest !== 'none' && latest !== installed;
  return { installed, latest, hasUpdate, updating: isYoutubeLibUpdating() };
};

export const updateYoutubeJs = (): Promise<YoutubeUpdateResult> => updateYoutubeLib();
