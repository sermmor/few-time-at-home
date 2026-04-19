/**
 * PlaylistExportService
 *
 * Creates YouTube or Spotify playlists from a list of local audio filenames.
 * Each filename is stripped of its audio extension before being used as the
 * search query — e.g. "Dark Side of the Moon.mp3" → search "Dark Side of the Moon".
 *
 * OAuth flow (popup-based, for a local desktop app):
 *   1. Frontend opens  GET /playlist/oauth/{platform}/start  in a popup window.
 *   2. Backend redirects the popup to the provider's consent screen.
 *   3. Provider redirects back to  GET /playlist/oauth/{platform}/callback.
 *   4. Backend exchanges the code for an access token and returns an HTML page
 *      that sends the token to the opener via postMessage, then closes itself.
 *   5. Frontend receives the token and uses it for  POST /playlist/create.
 *
 * Required keys in keys.json:
 *   youtube_playlist_client_id      ← Google OAuth client ID
 *   youtube_playlist_client_secret  ← Google OAuth client secret
 *   spotify_playlist_client_id      ← Spotify app client ID
 *   spotify_playlist_client_secret  ← Spotify app client secret
 *
 * Redirect URIs to register in each developer console:
 *   YouTube → http://localhost:{apiPort}/playlist/oauth/youtube/callback
 *   Spotify → http://127.0.0.1:{apiPort}/playlist/oauth/spotify/callback
 *
 * Note: Spotify's Developer Dashboard rejects http://localhost — only
 * http://127.0.0.1 is accepted, so the two providers use different hostnames.
 */

const fetch = require('node-fetch');

// ─── Constants ────────────────────────────────────────────────────────────────

const YOUTUBE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_API       = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_SCOPE     = 'https://www.googleapis.com/auth/youtube';

const SPOTIFY_AUTH_URL  = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API       = 'https://api.spotify.com/v1';
const SPOTIFY_SCOPE     = 'playlist-modify-public playlist-modify-private';

const AUDIO_EXTENSIONS  = [
  '.mp3', '.wma', '.wav', '.flac', '.aac', '.m4a',
  '.oga', '.opus', '.ogg', '.aiff', '.alac',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stripAudioExtension = (filename: string): string => {
  const lower = filename.toLowerCase();
  for (const ext of AUDIO_EXTENSIONS) {
    if (lower.endsWith(ext)) return filename.slice(0, -ext.length);
  }
  return filename;
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Reads the response body as text first, then parses it as JSON.
 * If the body isn't valid JSON (e.g. Spotify returned an HTML error page or a
 * plain-text message), throws a descriptive Error instead of a cryptic
 * "Unexpected token X" from node-fetch's .json().
 */
const safeJson = async (res: any): Promise<any> => {
  const text: string = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `La API devolvió una respuesta inesperada (HTTP ${res.status}): ${text.substring(0, 400)}`
    );
  }
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaylistResult {
  url:        string;
  totalAdded: number;
  notFound:   string[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class PlaylistExportService {
  static instance: PlaylistExportService;

  private youtubeRedirectUri: string;
  private spotifyRedirectUri: string;

  /** In-memory state map for CSRF protection (state → platform). */
  private oauthStates = new Map<string, string>();

  constructor(
    private youtubeClientId:     string,
    private youtubeClientSecret: string,
    private spotifyClientId:     string,
    private spotifyClientSecret: string,
    private port:                number,
  ) {
    PlaylistExportService.instance = this;
    // YouTube accepts http://localhost; Spotify only accepts http://127.0.0.1.
    this.youtubeRedirectUri = `http://localhost:${port}/playlist/oauth/youtube/callback`;
    this.spotifyRedirectUri = `http://127.0.0.1:${port}/playlist/oauth/spotify/callback`;
  }

  isConfigured = (platform: 'youtube' | 'spotify'): boolean =>
    platform === 'youtube'
      ? !!(this.youtubeClientId && this.youtubeClientSecret)
      : !!(this.spotifyClientId && this.spotifyClientSecret);

  // ─── OAuth helpers ──────────────────────────────────────────────────────────

  private generateState = (): string =>
    Math.random().toString(36).substring(2) + Date.now().toString(36);

  getYoutubeAuthUrl = (): string => {
    const state = this.generateState();
    this.oauthStates.set(state, 'youtube');
    const params = new URLSearchParams({
      client_id:     this.youtubeClientId,
      redirect_uri:  this.youtubeRedirectUri,
      response_type: 'code',
      scope:         YOUTUBE_SCOPE,
      access_type:   'online',
      state,
      prompt:        'consent',
    });
    return `${YOUTUBE_AUTH_URL}?${params}`;
  };

  exchangeYoutubeCode = async (code: string): Promise<string> => {
    const res = await fetch(YOUTUBE_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     this.youtubeClientId,
        client_secret: this.youtubeClientSecret,
        redirect_uri:  this.youtubeRedirectUri,
        grant_type:    'authorization_code',
      }),
    });
    const data = await safeJson(res);
    if (!data.access_token) throw new Error(`YouTube OAuth error: ${JSON.stringify(data)}`);
    return data.access_token as string;
  };

  getSpotifyAuthUrl = (): string => {
    const state = this.generateState();
    this.oauthStates.set(state, 'spotify');
    const params = new URLSearchParams({
      client_id:     this.spotifyClientId,
      redirect_uri:  this.spotifyRedirectUri,
      response_type: 'code',
      scope:         SPOTIFY_SCOPE,
      state,
    });
    return `${SPOTIFY_AUTH_URL}?${params}`;
  };

  exchangeSpotifyCode = async (code: string): Promise<string> => {
    const credentials = Buffer.from(
      `${this.spotifyClientId}:${this.spotifyClientSecret}`
    ).toString('base64');
    const res = await fetch(SPOTIFY_TOKEN_URL, {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        redirect_uri: this.spotifyRedirectUri,
        grant_type:   'authorization_code',
      }),
    });
    const data = await safeJson(res);
    if (!data.access_token) throw new Error(`Spotify OAuth error: ${JSON.stringify(data)}`);
    return data.access_token as string;
  };

  // ─── YouTube playlist creation ──────────────────────────────────────────────

  createYoutubePlaylist = async (
    token:       string,
    name:        string,
    description: string,
    songs:       string[],
  ): Promise<PlaylistResult> => {
    const authHeader  = { Authorization: `Bearer ${token}` };
    const jsonHeaders = { ...authHeader, 'Content-Type': 'application/json' };

    // 1. Create the playlist
    const plRes  = await fetch(`${YOUTUBE_API}/playlists?part=snippet,status`, {
      method:  'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        snippet: { title: name, description },
        status:  { privacyStatus: 'public' },
      }),
    });
    const plData = await safeJson(plRes);
    if (!plData.id) throw new Error(`Failed to create YouTube playlist: ${JSON.stringify(plData)}`);
    const playlistId = plData.id as string;

    // 2. Search for each song and add it to the playlist
    const notFound:    string[] = [];
    let   totalAdded = 0;

    for (const rawName of songs) {
      const query = stripAudioExtension(rawName);
      await sleep(120); // stay well within YouTube quota

      const searchRes  = await fetch(
        `${YOUTUBE_API}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1`,
        { headers: authHeader },
      );
      const searchData = await safeJson(searchRes);
      const videoId    = searchData.items?.[0]?.id?.videoId as string | undefined;

      if (!videoId) { notFound.push(query); continue; }

      await fetch(`${YOUTUBE_API}/playlistItems?part=snippet`, {
        method:  'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: { kind: 'youtube#video', videoId },
          },
        }),
      });
      totalAdded++;
    }

    return {
      url: `https://www.youtube.com/playlist?list=${playlistId}`,
      totalAdded,
      notFound,
    };
  };

  // ─── Spotify playlist creation ──────────────────────────────────────────────

  createSpotifyPlaylist = async (
    token:       string,
    name:        string,
    description: string,
    songs:       string[],
  ): Promise<PlaylistResult> => {
    const authHeader  = { Authorization: `Bearer ${token}` };
    const jsonHeaders = { ...authHeader, 'Content-Type': 'application/json' };

    // 1. Get the user's Spotify ID (GET — no Content-Type needed)
    const meRes  = await fetch(`${SPOTIFY_API}/me`, { headers: authHeader });
    const meData = await safeJson(meRes);
    if (!meData.id) throw new Error(`Failed to get Spotify user: ${JSON.stringify(meData)}`);
    const userId = meData.id as string;

    // 2. Create the playlist
    const plRes  = await fetch(`${SPOTIFY_API}/users/${userId}/playlists`, {
      method:  'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ name, description, public: true }),
    });
    const plData = await safeJson(plRes);
    if (!plData.id) throw new Error(`Failed to create Spotify playlist: ${JSON.stringify(plData)}`);
    const playlistId  = plData.id as string;
    const playlistUrl = (plData.external_urls?.spotify as string | undefined)
      ?? `https://open.spotify.com/playlist/${playlistId}`;

    // 3. Search for each track (GET — no Content-Type needed)
    const notFound:  string[] = [];
    const trackUris: string[] = [];

    for (const rawName of songs) {
      const query = stripAudioExtension(rawName);
      await sleep(120);

      const searchRes  = await fetch(
        `${SPOTIFY_API}/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
        { headers: authHeader },
      );
      const searchData = await safeJson(searchRes);
      const uri        = searchData.tracks?.items?.[0]?.uri as string | undefined;

      if (!uri) notFound.push(query);
      else       trackUris.push(uri);
    }

    // 4. Add tracks in batches of 100 (Spotify's limit per request)
    for (let i = 0; i < trackUris.length; i += 100) {
      await fetch(`${SPOTIFY_API}/playlists/${playlistId}/tracks`, {
        method:  'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ uris: trackUris.slice(i, i + 100) }),
      });
    }

    return { url: playlistUrl, totalAdded: trackUris.length, notFound };
  };

  // ─── Callback HTML ──────────────────────────────────────────────────────────

  /** Returns an HTML page that sends the token to the opener popup and closes itself. */
  makeCallbackHtml = (platform: string, token: string, error?: string): string => {
    const payload = JSON.stringify({
      type: 'playlist_oauth',
      platform,
      token: error ? '' : token,
      error: error ?? '',
    });
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage(${payload}, '*');
    }
  } finally {
    window.close();
  }
</script>
<p style="font-family:sans-serif;color:#555;margin:2rem">
  ${error ? `❌ ${error}` : '✅ Autenticación completada. Puedes cerrar esta ventana.'}
</p>
</body></html>`;
  };
}
