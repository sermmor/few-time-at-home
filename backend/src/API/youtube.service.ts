import { readFile } from 'fs/promises';
import fetch from 'node-fetch';
import * as path from 'path';
import * as vm from 'vm';

// ── Innertube singleton (lazy init) ─────────────────────────────────────────
// youtubei.js is an ESM-only package (type:"module") so we must use a dynamic
// import() at runtime — TypeScript's "module":"commonjs" would otherwise
// compile import() into require(), which fails for ESM packages. The Function
// trick keeps the string opaque to the TS compiler while still producing valid
// native ESM import() in the compiled JS.
//
// Platform.shim.eval is also overridden BEFORE Innertube.create() is called:
// every platform (node, web, deno) ships the default evaluator that deliberately
// throws ("provide your own evaluator"). For Node.js we use the built-in `vm`
// module. The extracted player script ends with a top-level `return`, so it
// must be wrapped in an IIFE before passing to vm.runInNewContext.
let innertubeInstance: any = null;

const nodeEval = (data: any, _env: any): any => {
  // data.output is a self-contained JS snippet (extracted from YouTube's player)
  // that ends with `return process(n, sp, s)`. Top-level `return` is not valid
  // outside a function, so we wrap it in an IIFE.
  const wrapped = `(function(){${data.output}})()`;
  return vm.runInNewContext(wrapped, {}, { timeout: 10_000 });
};

const loadInnertube = async (): Promise<any> => {
  if (!innertubeInstance) {
    console.log('[YouTube] Initialising Innertube…');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const load = new Function('return import("youtubei.js")') as () => Promise<any>;
    const mod  = await load();

    // youtubei.js exports Platform (re-exported from utils) alongside Innertube.
    // We override the default eval (which throws) with our vm-based evaluator
    // BEFORE creating the session so decipher() works.
    const Platform  = mod.Platform;
    if (Platform) {
      try {
        const currentShim = Platform.shim;
        Platform.load({ ...currentShim, eval: nodeEval });
        console.log('[YouTube] vm evaluator installed');
      } catch (_) {
        // Platform may not have loaded yet — try again after Innertube.create()
      }
    }

    const Innertube = mod.Innertube ?? mod.default?.Innertube ?? mod.default;
    innertubeInstance = await Innertube.create();

    // Second chance: after create() the platform is definitely loaded
    if (Platform) {
      try {
        const currentShim = Platform.shim;
        Platform.load({ ...currentShim, eval: nodeEval });
      } catch (_) { /* ignore */ }
    }

    console.log('[YouTube] Innertube ready');
  }
  return innertubeInstance;
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

export const resolveYoutubeStreamUrl = async (
  youtubeUrl: string,
): Promise<YoutubeResolveResult> => {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) throw new Error(`Invalid YouTube URL: ${youtubeUrl}`);

  const yt   = await loadInnertube();
  const info = await yt.getInfo(videoId);

  const title: string = (info.basic_info?.title as string | undefined) ?? videoId;

  // Prefer a combined video+audio format for Chromecast (which does not
  // support DASH manifests from DefaultMediaReceiver).
  const format = info.chooseFormat({ quality: 'best', type: 'video+audio' });
  const streamUrl: string = await format.decipher(yt.session.player);
  const contentType: string = (format.mime_type as string | undefined) ?? 'video/mp4';

  console.log(`[YouTube] Resolved "${title}" → ${contentType}`);
  return { streamUrl, title, contentType };
};

// ── Version info (installed vs. latest GitHub release) ───────────────────────

export interface YoutubeVersionInfo {
  installed: string;
  latest:    string;
  hasUpdate: boolean;
}

export const getYoutubeJsVersionInfo = async (): Promise<YoutubeVersionInfo> => {
  // ── Installed version ────────────────────────────────────────────────────
  let installed = 'unknown';
  try {
    const pkgPath = path.join(
      __dirname, '..', '..', 'node_modules', 'youtubei.js', 'package.json',
    );
    const raw = await readFile(pkgPath, 'utf8');
    installed = (JSON.parse(raw) as { version?: string }).version ?? 'unknown';
  } catch (_) {
    console.warn('[YouTube] Could not read youtubei.js package.json');
  }

  // ── Latest GitHub release ────────────────────────────────────────────────
  let latest    = installed;
  let hasUpdate = false;
  try {
    const resp = await fetch(
      'https://api.github.com/repos/LuanRT/YouTube.js/releases/latest',
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
      hasUpdate =
        latest !== '' &&
        installed !== 'unknown' &&
        latest !== installed;
    }
  } catch (err) {
    console.warn('[YouTube] Could not fetch latest release from GitHub:', err);
  }

  return { installed, latest, hasUpdate };
};
