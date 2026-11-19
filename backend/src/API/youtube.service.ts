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
//
// Además, el resolvedor de esos retos (componente "ejs") viene dentro del
// ejecutable oficial, pero NO en una instalación con `pip install yt-dlp` sin
// extras. Sin él YouTube solo ofrece formatos sueltos (vídeo sin audio) y falla
// con "Requested format is not available". `--remote-components ejs:github`
// deja que yt-dlp lo descargue (y lo cachee) cuando le falte.
const OPTIONAL_ARGS: string[][] = [
  ['--js-runtimes', `node:${process.execPath}`],
  ['--remote-components', 'ejs:github'],
];

// Sin --no-warnings: los avisos (p. ej. "n challenge solving failed") son la
// pista para diagnosticar los fallos, así que se registran en el log.
const COMMON_ARGS = ['--no-update', '--no-playlist'];

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
const toReadableError = (err: any, stderrText?: string): Error => {
  if (err?.code === 'ENOENT') {
    return new Error('yt-dlp no está instalado o no está en el PATH (puedes indicar la ruta con YT_DLP_PATH).');
  }
  if (err?.killed) {
    return new Error('yt-dlp tardó demasiado en responder.');
  }
  const stderr: string = (stderrText ?? err?.stderr ?? '').trim();
  const lines = stderr.split(/\r?\n/);
  const errorLine = [...lines].reverse().find(l => l.startsWith('ERROR:'));
  let message = errorLine ?? (stderr || err?.message || 'yt-dlp falló');
  // "Requested format is not available" casi siempre se debe a que yt-dlp no
  // pudo resolver los retos JS de YouTube: se añade el aviso que lo explica.
  if (/Requested format is not available/i.test(message)) {
    const hint = lines.find(l => /WARNING:.*(JavaScript runtime|challenge|ejs|remote component)/i.test(l));
    if (hint) message += ` | ${hint.trim()}`;
  }
  return new Error(message);
};

const logWarnings = (stderr: string): void => {
  stderr.split(/\r?\n/)
    .filter(l => l.startsWith('WARNING:') && !/older than \d+ days/i.test(l))
    .forEach(l => console.warn(`[YouTube] yt-dlp ${l}`));
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

  // Las versiones antiguas de yt-dlp no conocen algunas opciones opcionales:
  // si se queja de una, se reintenta sin ella.
  let optional = [...OPTIONAL_ARGS];
  let result: ExecResult | null = null;
  while (!result) {
    try {
      result = await runYtDlp([...optional.flat(), ...args], 90_000);
    } catch (err: any) {
      const stderr: string = err?.stderr ?? '';
      const unknown = optional.find(([opt]) => new RegExp(`no such option:? ${opt}\\b`, 'i').test(stderr));
      if (unknown) {
        console.warn(`[YouTube] yt-dlp no admite ${unknown[0]}; reintento sin esa opción`);
        optional = optional.filter(o => o !== unknown);
        continue;
      }
      logWarnings(stderr);
      throw toReadableError(err, stderr);
    }
  }
  logWarnings(result.stderr);
  const { stdout } = result;

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
