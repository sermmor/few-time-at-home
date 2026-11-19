import { execFile } from 'child_process';
import fetch from 'node-fetch';

// ── yt-dlp ───────────────────────────────────────────────────────────────────
// La URL directa del vídeo se resuelve con el ejecutable `yt-dlp`, que ya está
// instalado en la Raspberry (antes se usaba la librería youtubei.js, que había
// que actualizar cada poco). Se actualiza con `yt-dlp -U` (binario) o
// `pip install -U yt-dlp`, sin tocar el backend.
//
// Ruta del ejecutable: variable de entorno YT_DLP_PATH o `yt-dlp` en el PATH.
const getYtDlpCommand = (): string => process.env.YT_DLP_PATH || 'yt-dlp';

// YouTube exige un runtime de JavaScript para descifrar las firmas. yt-dlp solo
// activa deno por defecto; le añadimos el propio Node que ejecuta el backend,
// así funciona aunque deno no esté instalado.
const JS_RUNTIME_ARGS = ['--js-runtimes', `node:${process.execPath}`];

const COMMON_ARGS = ['--no-warnings', '--no-update', '--no-playlist'];

interface ExecResult { stdout: string; stderr: string; }

const runYtDlp = (args: string[], timeoutMs: number): Promise<ExecResult> =>
  new Promise((resolve, reject) => {
    execFile(
      getYtDlpCommand(),
      args,
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          const e = err as NodeJS.ErrnoException & { stderr?: string };
          e.stderr = String(stderr ?? '');
          reject(e);
          return;
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });

// Traduce los errores de yt-dlp a un mensaje legible para la UI.
const toReadableError = (err: any): Error => {
  if (err?.code === 'ENOENT') {
    return new Error('yt-dlp no está instalado o no está en el PATH (puedes indicar la ruta con YT_DLP_PATH).');
  }
  if (err?.killed) {
    return new Error('yt-dlp tardó demasiado en responder.');
  }
  const stderr: string = (err?.stderr ?? '').trim();
  const errorLine = stderr.split(/\r?\n/).reverse().find(l => l.startsWith('ERROR:'));
  return new Error(errorLine ?? (stderr || err?.message || 'yt-dlp falló'));
};

// ── URL helpers ──────────────────────────────────────────────────────────────

export const extractVideoId = (url: string): string | null => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/,
  );
  return match ? match[1] : null;
};

// ── Resolve YouTube URL → direct stream URL ──────────────────────────────────

export interface YoutubeResolveResult {
  streamUrl:   string;
  title:       string;
  contentType: string;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  mp4:  'video/mp4',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
};

export const resolveYoutubeStreamUrl = async (
  youtubeUrl: string,
): Promise<YoutubeResolveResult> => {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) throw new Error(`Invalid YouTube URL: ${youtubeUrl}`);
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Formato combinado vídeo+audio (un solo fichero): Chromecast y el <video>
  // del navegador no admiten manifiestos DASH con pistas separadas.
  const args = [
    '-f', 'best[vcodec!=none][acodec!=none]',
    ...COMMON_ARGS,
    '--print', '%(title)s',
    '--print', '%(ext)s',
    '-g',
    canonicalUrl,
  ];

  let stdout: string;
  try {
    ({ stdout } = await runYtDlp([...JS_RUNTIME_ARGS, ...args], 90_000));
  } catch (err: any) {
    // Versiones antiguas de yt-dlp no conocen --js-runtimes: reintento sin él.
    if (/no such option.*--js-runtimes/i.test(err?.stderr ?? '')) {
      try {
        ({ stdout } = await runYtDlp(args, 90_000));
      } catch (err2) {
        throw toReadableError(err2);
      }
    } else {
      throw toReadableError(err);
    }
  }

  // Salida: título, extensión y URL, una por línea.
  const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
  const streamUrl = lines.find(l => /^https?:\/\//.test(l));
  if (!streamUrl || lines.length < 3) {
    throw new Error('yt-dlp no devolvió ninguna URL reproducible.');
  }
  const title = lines[0] || videoId;
  const ext   = (lines[1] || '').toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext] ?? 'video/mp4';

  console.log(`[YouTube] Resolved "${title}" → ${contentType}`);
  return { streamUrl, title, contentType };
};

// ── Live-embed video ID (in-memory, no persistence) ─────────────────────────

let liveVideoId: string = '';

export const setLiveVideoId = (id: string): void => { liveVideoId = id; };
export const getLiveVideoId = (): string => liveVideoId;

// ── Version info (installed yt-dlp vs. latest GitHub release) ────────────────

export interface YoutubeVersionInfo {
  installed: string;
  latest:    string;
  hasUpdate: boolean;
}

export const getYtDlpVersionInfo = async (): Promise<YoutubeVersionInfo> => {
  // ── Installed version ────────────────────────────────────────────────────
  let installed = 'unknown';
  try {
    const { stdout } = await runYtDlp(['--version'], 15_000);
    installed = stdout.trim().split(/\r?\n/)[0] || 'unknown';
  } catch (err) {
    console.warn('[YouTube] Could not run yt-dlp --version:', toReadableError(err).message);
  }

  // ── Latest GitHub release ────────────────────────────────────────────────
  let latest    = installed;
  let hasUpdate = false;
  try {
    const resp = await fetch(
      'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest',
      {
        headers: {
          'User-Agent': 'few-time-at-home',
          'Accept':     'application/vnd.github+json',
        },
      },
    );
    if (resp.ok) {
      const data = await resp.json() as { tag_name?: string };
      latest = (data.tag_name ?? '').replace(/^v/, '');
      // Las versiones son fechas (AAAA.MM.DD[.n]): se comparan como texto.
      // Una nightly más nueva que la última release no cuenta como pendiente.
      hasUpdate =
        latest !== '' &&
        installed !== 'unknown' &&
        latest.localeCompare(installed, undefined, { numeric: true }) > 0;
    }
  } catch (err) {
    console.warn('[YouTube] Could not fetch latest yt-dlp release from GitHub:', err);
  }

  return { installed, latest, hasUpdate };
};
