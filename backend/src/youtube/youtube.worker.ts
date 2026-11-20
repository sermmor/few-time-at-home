// ── Proceso hijo que aloja youtubei.js ───────────────────────────────────────
// El backend principal lo lanza con child_process.fork() (ver youtubeLib.ts) y
// le pasa como argumento la carpeta de la versión instalada de la librería:
//   node youtube.worker.js <backend>/youtube-lib/<versión>
// Así youtubei.js nunca vive en el proceso principal: para actualizarla basta con
// instalar la nueva versión en otra carpeta, arrancar otro worker y matar este.
//
// Protocolo IPC:
//   padre → hijo: { type: 'resolve', id, videoId }
//   hijo → padre: { type: 'ready', version } | { type: 'init-error', error }
//                 { type: 'result', id, ok: true, result } | { type: 'result', id, ok: false, error }
import { readFileSync } from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import * as vm from 'vm';

const libDir = process.argv[2] ?? '';

const send = (msg: any): void => {
  try { process.send?.(msg); } catch { /* el padre ya no está */ }
};

// Si el padre muere o corta el canal IPC, este proceso no tiene razón de ser.
process.on('disconnect', () => process.exit(0));
process.on('unhandledRejection', (reason: any) => {
  console.warn('[YouTube worker] unhandledRejection:', reason?.message ?? reason);
});
process.on('uncaughtException', (err: any) => {
  console.error('[YouTube worker] uncaughtException:', err?.message ?? err);
  process.exit(1); // el padre lo relanzará en la siguiente petición
});

// ── Evaluador para descifrar las URLs ────────────────────────────────────────
// Todas las plataformas de youtubei.js traen un eval por defecto que lanza
// ("provide your own evaluator"). En Node usamos el módulo `vm`. El script que
// se extrae del reproductor termina con un `return` de nivel superior, así que
// se envuelve en una IIFE.
const nodeEval = (data: any, _env: any): any => {
  const wrapped = `(function(){${data.output}})()`;
  return vm.runInNewContext(wrapped, {}, { timeout: 10_000 });
};

// youtubei.js es ESM puro. Se importa a través de `loader.mjs` (lo escribe el
// instalador dentro de la carpeta de la versión) para que Node resuelva el
// paquete desde el node_modules de ESA carpeta, con sus condiciones de exports.
// El truco de new Function evita que TypeScript convierta import() en require().
const dynamicImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;

let innertube: any = null;

const installEval = (Platform: any): void => {
  if (!Platform) return;
  try { Platform.load({ ...Platform.shim, eval: nodeEval }); } catch { /* aún no cargada */ }
};

const init = async (): Promise<string> => {
  const pkg = JSON.parse(readFileSync(
    path.join(libDir, 'node_modules', 'youtubei.js', 'package.json'), 'utf8',
  )) as { version?: string };
  const mod = await dynamicImport(pathToFileURL(path.join(libDir, 'loader.mjs')).href);

  installEval(mod.Platform);
  const Innertube = mod.Innertube ?? mod.default?.Innertube ?? mod.default;
  innertube = await Innertube.create();
  // Segunda oportunidad: tras create() la plataforma ya está cargada seguro.
  installEval(mod.Platform);
  return pkg.version ?? 'unknown';
};

// ── Resolver URL de YouTube → URL directa del stream ─────────────────────────
// Se necesita un formato combinado vídeo+audio (Chromecast y /alexa no admiten
// DASH con pistas separadas). El cliente WEB por defecto ya no lo ofrece, así
// que se prueban varios clientes de Innertube en orden. ANDROID es el que da una
// URL reproducible; con MWEB algunas URLs responden 403. WEB es el último recurso.
const YOUTUBE_CLIENTS = ['ANDROID', 'MWEB', 'WEB'] as const;

const resolveStream = async (videoId: string) => {
  let lastError: unknown = null;
  for (const client of YOUTUBE_CLIENTS) {
    try {
      const info = await innertube.getInfo(videoId, { client });
      const title: string = (info.basic_info?.title as string | undefined) ?? videoId;
      const format = info.chooseFormat({ quality: 'best', type: 'video+audio' });
      const streamUrl: string = await format.decipher(innertube.session.player);
      const contentType: string = (format.mime_type as string | undefined) ?? 'video/mp4';
      console.log(`[YouTube worker] Resuelto "${title}" → ${contentType} (cliente ${client})`);
      return { streamUrl, title, contentType };
    } catch (err) {
      console.warn(`[YouTube worker] El cliente ${client} falló para ${videoId}:`, (err as Error)?.message ?? err);
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No matching formats found');
};

process.on('message', async (msg: any) => {
  if (msg?.type !== 'resolve') return;
  try {
    const result = await resolveStream(String(msg.videoId));
    send({ type: 'result', id: msg.id, ok: true, result });
  } catch (err: any) {
    send({ type: 'result', id: msg.id, ok: false, error: err?.message ?? String(err) });
  }
});

init()
  .then(version => {
    console.log(`[YouTube worker] youtubei.js v${version} listo (pid ${process.pid})`);
    send({ type: 'ready', version });
  })
  .catch((err: any) => {
    send({ type: 'init-error', error: err?.message ?? String(err) });
    setTimeout(() => process.exit(1), 100);
  });
