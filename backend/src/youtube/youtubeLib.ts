import { ChildProcess, exec, fork } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'fs/promises';
import fetch from 'node-fetch';
import * as path from 'path';

// ── Gestor de youtubei.js en un proceso hijo ─────────────────────────────────
// youtubei.js hay que actualizarla a menudo (YouTube cambia su reproductor). Para
// no tener que parar todo el backend, la librería NO es dependencia del backend:
//   - Cada versión se instala en su propia carpeta: <backend>/youtube-lib/<versión>/
//     (gitignorada; tiene su propio package.json/lock, no toca el lock del backend).
//   - `youtube-lib/active.json` guarda qué versión está en uso.
//   - Las peticiones se resuelven en un proceso hijo (youtube.worker.ts) que carga
//     esa carpeta. Actualizar = instalar la nueva versión en otra carpeta, arrancar
//     un worker nuevo y, si arranca bien, cambiar a él y retirar el viejo.
//   - El worker se arranca bajo demanda y se para tras un rato sin uso (RAM de la Pi).
// Nada de esto puede tumbar el backend: los fallos se registran y la página de
// YouTube responde con error, el resto de la app sigue igual.

const LIB_ROOT    = path.resolve(process.cwd(), 'youtube-lib');
const ACTIVE_PATH = path.join(LIB_ROOT, 'active.json');
const WORKER_PATH = path.join(__dirname, 'youtube.worker.js');

const INSTALL_TIMEOUT_MS = 10 * 60_000;
const READY_TIMEOUT_MS   = 90_000;
const REQUEST_TIMEOUT_MS = 90_000;
const IDLE_STOP_MS       = 15 * 60_000;
const RETIRE_GRACE_MS    = 60_000;

const LOADER_SOURCE =
  "// Generado por few-time-at-home: punto de entrada para que el worker resuelva\n" +
  "// youtubei.js desde el node_modules de esta carpeta.\n" +
  "export * from 'youtubei.js';\n";

// ── Utilidades de versiones / carpetas ───────────────────────────────────────

const isValidVersion = (v: string): boolean => /^\d+\.\d+\.\d+([-+][\w.]+)?$/.test(v);

const compareVersions = (a: string, b: string): number => {
  const pa = a.split(/[.-]/).map(n => parseInt(n, 10) || 0);
  const pb = b.split(/[.-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

const versionDir = (version: string): string => path.join(LIB_ROOT, version);

const readInstalledVersion = async (dir: string): Promise<string | null> => {
  try {
    const pkg = JSON.parse(await readFile(
      path.join(dir, 'node_modules', 'youtubei.js', 'package.json'), 'utf8',
    )) as { version?: string };
    return pkg.version ?? null;
  } catch { return null; }
};

const isUsableDir = async (dir: string): Promise<boolean> =>
  existsSync(path.join(dir, 'loader.mjs')) && (await readInstalledVersion(dir)) !== null;

const readActiveVersion = async (): Promise<string | null> => {
  try {
    const { version } = JSON.parse(await readFile(ACTIVE_PATH, 'utf8')) as { version?: string };
    if (version && isValidVersion(version) && await isUsableDir(versionDir(version))) return version;
  } catch { /* sin fichero o corrupto */ }
  // Sin active.json válido: usar la versión instalada más alta que haya.
  try {
    const dirs = (await readdir(LIB_ROOT)).filter(isValidVersion).sort(compareVersions).reverse();
    for (const d of dirs) if (await isUsableDir(versionDir(d))) return d;
  } catch { /* no existe youtube-lib */ }
  return null;
};

const writeActiveVersion = async (version: string): Promise<void> => {
  try {
    await mkdir(LIB_ROOT, { recursive: true });
    await writeFile(ACTIVE_PATH, JSON.stringify({ version }, null, 2));
  } catch (e: any) {
    console.warn('[YouTube] No se pudo guardar active.json:', e?.message ?? e);
  }
};

const runNpm = (args: string, cwd: string): Promise<void> =>
  new Promise((resolve, reject) => {
    exec(`npm ${args}`, { cwd, timeout: INSTALL_TIMEOUT_MS, windowsHide: true }, (err, _out, stderr) =>
      err ? reject(new Error(`npm ${args} falló: ${(stderr || err.message).toString().slice(-500)}`)) : resolve(),
    );
  });

/** Borra carpetas temporales y versiones que ya no se usan (best-effort). */
const cleanupOldVersions = async (keep: string[]): Promise<void> => {
  try {
    for (const d of await readdir(LIB_ROOT)) {
      if (d === 'active.json' || keep.includes(d)) continue;
      if (!isValidVersion(d) && !d.startsWith('_tmp-')) continue;
      // En Windows los ficheros pueden seguir bloqueados unos instantes tras matar el
      // worker: se reintenta, y si aun así falla se borra en el próximo arranque.
      try { await rm(path.join(LIB_ROOT, d), { recursive: true, force: true, maxRetries: 10, retryDelay: 500 }); }
      catch (e: any) { console.warn(`[YouTube] No se pudo borrar youtube-lib/${d} (se reintentará al arrancar):`, e?.message ?? e); }
    }
  } catch { /* no existe youtube-lib */ }
};

/**
 * Instala youtubei.js@<spec> en una carpeta temporal y la renombra a
 * youtube-lib/<versión>. Devuelve la versión instalada.
 */
const installVersion = async (spec: string): Promise<string> => {
  if (spec !== 'latest' && !isValidVersion(spec)) throw new Error(`Versión no válida: ${spec}`);
  const tmp = path.join(LIB_ROOT, `_tmp-${Date.now()}`);
  try {
    await mkdir(tmp, { recursive: true });
    await writeFile(path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'ftah-youtube-lib', private: true }, null, 2));
    console.log(`[YouTube] Instalando youtubei.js@${spec}…`);
    await runNpm(`install youtubei.js@${spec} --omit=dev --ignore-scripts --no-audit --no-fund`, tmp);
    await writeFile(path.join(tmp, 'loader.mjs'), LOADER_SOURCE);

    const version = await readInstalledVersion(tmp);
    if (!version || !isValidVersion(version)) throw new Error('No se pudo leer la versión instalada');

    const target = versionDir(version);
    if (await isUsableDir(target)) {
      await rm(tmp, { recursive: true, force: true });   // ya la teníamos
    } else {
      await rm(target, { recursive: true, force: true });
      await rename(tmp, target);
    }
    console.log(`[YouTube] youtubei.js v${version} instalada en ${target}`);
    return version;
  } catch (e) {
    try { await rm(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
    throw e;
  }
};

// ── Workers ──────────────────────────────────────────────────────────────────

interface Pending { resolve: (v: any) => void; reject: (e: Error) => void; timer: NodeJS.Timeout; }

interface WorkerHandle {
  child:   ChildProcess;
  version: string;
  pending: Map<number, Pending>;
  exited:  boolean;
}

let current:   WorkerHandle | null = null;
let starting:  Promise<WorkerHandle> | null = null;
let installing: Promise<string> | null = null;
let updating:  Promise<YoutubeUpdateResult> | null = null;
let idleTimer: NodeJS.Timeout | null = null;
let nextId = 1;

const failPending = (h: WorkerHandle, reason: string): void => {
  for (const [, p] of h.pending) { clearTimeout(p.timer); p.reject(new Error(reason)); }
  h.pending.clear();
};

const stopWorker = (h: WorkerHandle): void => {
  if (h.exited) return;
  try { h.child.kill(); } catch { /* ya muerto */ }
};

/** Arranca un worker con la versión dada y espera a que avise de que está listo. */
const startWorker = (version: string): Promise<WorkerHandle> =>
  new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = fork(WORKER_PATH, [versionDir(version)], {
        execArgv: ['--max-old-space-size=384'],
        stdio: 'inherit',
      });
    } catch (e: any) {
      reject(new Error(`No se pudo lanzar el worker de YouTube: ${e?.message ?? e}`));
      return;
    }

    const h: WorkerHandle = { child, version, pending: new Map(), exited: false };
    let ready = false;

    const readyTimer = setTimeout(() => {
      if (ready) return;
      stopWorker(h);
      reject(new Error('El worker de YouTube no arrancó a tiempo'));
    }, READY_TIMEOUT_MS);

    child.on('message', (msg: any) => {
      if (msg?.type === 'ready') {
        ready = true;
        clearTimeout(readyTimer);
        h.version = msg.version ?? version;
        resolve(h);
      } else if (msg?.type === 'init-error') {
        clearTimeout(readyTimer);
        stopWorker(h);
        reject(new Error(`youtubei.js v${version} no pudo iniciarse: ${msg.error}`));
      } else if (msg?.type === 'result') {
        const p = h.pending.get(msg.id);
        if (!p) return;
        h.pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.ok) p.resolve(msg.result); else p.reject(new Error(msg.error ?? 'Error desconocido'));
      }
    });
    child.on('error', (e) => console.warn('[YouTube] Error del worker:', e?.message ?? e));
    child.on('exit', (code) => {
      h.exited = true;
      clearTimeout(readyTimer);
      failPending(h, 'El worker de YouTube terminó');
      if (current === h) current = null;
      if (!ready) reject(new Error(`El worker de YouTube terminó al arrancar (código ${code})`));
    });
  });

/** Retira un worker viejo: espera a que acabe lo pendiente (con un límite) y lo para. */
const retireWorker = (h: WorkerHandle): Promise<void> =>
  new Promise(resolve => {
    if (h.exited) { resolve(); return; }
    const deadline = Date.now() + RETIRE_GRACE_MS;
    const check = () => {
      if (h.exited) { resolve(); return; }
      if (h.pending.size === 0 || Date.now() > deadline) {
        h.child.once('exit', () => resolve());
        stopWorker(h);
        setTimeout(resolve, 5_000); // por si 'exit' no llega
        return;
      }
      setTimeout(check, 500);
    };
    check();
  });

const touchIdleTimer = (): void => {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const h = current;
    if (h && h.pending.size === 0) {
      console.log('[YouTube] Worker inactivo: se detiene para liberar memoria');
      current = null;
      stopWorker(h);
    }
  }, IDLE_STOP_MS);
};

/** Devuelve la versión activa, instalando la última si no hay ninguna. */
const ensureInstalled = async (): Promise<string> => {
  const active = await readActiveVersion();
  if (active) return active;
  if (!installing) {
    installing = (async () => {
      const v = await installVersion('latest');
      await writeActiveVersion(v);
      return v;
    })().finally(() => { installing = null; });
  }
  return installing;
};

const getWorker = async (): Promise<WorkerHandle> => {
  if (current && !current.exited) return current;
  if (!starting) {
    starting = (async () => {
      const version = await ensureInstalled();
      const h = await startWorker(version);
      // Si mientras arrancaba una actualización ya puso otro worker, gana ese.
      if (current && !current.exited) { stopWorker(h); return current; }
      current = h;
      return h;
    })().finally(() => { starting = null; });
  }
  return starting;
};

// ── API pública ──────────────────────────────────────────────────────────────

export interface YoutubeResolveResult {
  streamUrl:   string;
  title:       string;
  contentType: string;
}

export const resolveInWorker = async (videoId: string): Promise<YoutubeResolveResult> => {
  const h = await getWorker();
  touchIdleTimer();
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      h.pending.delete(id);
      reject(new Error('Tiempo de espera agotado resolviendo el vídeo'));
    }, REQUEST_TIMEOUT_MS);
    h.pending.set(id, { resolve, reject, timer });
    try {
      h.child.send({ type: 'resolve', id, videoId });
    } catch (e: any) {
      h.pending.delete(id);
      clearTimeout(timer);
      reject(new Error(`No se pudo hablar con el worker de YouTube: ${e?.message ?? e}`));
    }
  });
};

/** Versión instalada en uso ('none' si todavía no hay ninguna). */
export const getActiveYoutubeLibVersion = async (): Promise<string> =>
  current?.version ?? (await readActiveVersion()) ?? 'none';

/** Última versión publicada en npm (lo que instalaría una actualización). */
export const getLatestYoutubeLibVersion = async (): Promise<string | null> => {
  try {
    const resp = await fetch('https://registry.npmjs.org/youtubei.js/latest', {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) return null;
    const { version } = await resp.json() as { version?: string };
    return version && isValidVersion(version) ? version : null;
  } catch (e: any) {
    console.warn('[YouTube] No se pudo consultar la última versión en npm:', e?.message ?? e);
    return null;
  }
};

export const isYoutubeLibUpdating = (): boolean => updating !== null || installing !== null;

export interface YoutubeUpdateResult {
  ok:       boolean;
  previous: string;
  version:  string;
  changed:  boolean;
  error?:   string;
}

/**
 * Instala la última versión en su carpeta, la prueba arrancando un worker nuevo y,
 * si arranca, cambia a ella sin parar el backend. Si falla, se queda la anterior.
 */
export const updateYoutubeLib = (): Promise<YoutubeUpdateResult> => {
  if (updating) return updating;
  updating = (async (): Promise<YoutubeUpdateResult> => {
    const previous = await getActiveYoutubeLibVersion();
    let newVersion = '';
    try {
      newVersion = await installVersion('latest');
      if (newVersion === previous) {
        return { ok: true, previous, version: previous, changed: false };
      }
      const h = await startWorker(newVersion);   // prueba real: si no arranca, no se cambia
      const old = current;
      current = h;
      touchIdleTimer();
      await writeActiveVersion(newVersion);
      console.log(`[YouTube] youtubei.js actualizada en caliente: v${previous} → v${newVersion}`);
      if (old) await retireWorker(old);
      await cleanupOldVersions([newVersion]);
      return { ok: true, previous, version: newVersion, changed: true };
    } catch (e: any) {
      const error = e?.message ?? String(e);
      console.error('[YouTube] Falló la actualización de youtubei.js:', error);
      if (newVersion && newVersion !== previous) {
        try { await rm(versionDir(newVersion), { recursive: true, force: true }); } catch { /* ignore */ }
      }
      return { ok: false, previous, version: previous, changed: false, error };
    }
  })().finally(() => { updating = null; });
  return updating;
};

/**
 * Llamado al arrancar el backend (sin bloquear, nunca lanza): limpia restos de
 * instalaciones anteriores y, si no hay ninguna versión instalada, instala la última.
 * No arranca el worker: eso se hace la primera vez que se use la página.
 */
export const ensureYoutubeLib = async (): Promise<void> => {
  try {
    const active = await readActiveVersion();
    await cleanupOldVersions(active ? [active] : []);
    if (!active) {
      const v = await ensureInstalled();
      console.log(`> [YouTube] youtubei.js v${v} preparada para la página /youtube`);
    }
  } catch (e: any) {
    console.log(`> [YouTube] aviso (ignorado) al preparar youtubei.js: ${e?.message ?? e}`);
  }
};
