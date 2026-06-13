import { execFile } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { getSmartHomeConfig } from './smartHomeConfig';

/**
 * Best-effort installer for the Python `tapo` library used by the Tapo control
 * on the Auto page. Called once at backend startup (non-blocking).
 *
 * Unlike an npm `postinstall` hook (which pollutes the committed package-lock.json
 * with `hasInstallScript: true`), this records its state in `vars.json` at the
 * PROJECT ROOT, which is git-ignored. So it only attempts the install once and
 * never touches tracked files.
 *
 * NEVER throws: if Python/pip is missing or the install fails, Tapo just stays
 * unavailable and the rest of the app keeps working.
 */

// cwd is the backend dir at runtime (that's where keys.json is read from), so the
// project root — and vars.json — is one level up.
const VARS_PATH = path.resolve(process.cwd(), '..', 'vars.json');

const PY_CANDIDATES = process.platform === 'win32'
  ? ['py', 'python', 'python3']
  : ['python3', 'python'];

const readVars = (): any => {
  try { return existsSync(VARS_PATH) ? JSON.parse(readFileSync(VARS_PATH, 'utf-8')) : {}; }
  catch { return {}; }
};
const writeVars = (v: any): void => {
  try { writeFileSync(VARS_PATH, JSON.stringify(v, null, 2)); } catch { /* ignore */ }
};

const run = (cmd: string, args: string[], timeout = 180_000): Promise<boolean> =>
  new Promise(resolve => {
    try { execFile(cmd, args, { timeout }, err => resolve(!err)); }
    catch { resolve(false); }
  });

const findPythonWithTapo = async (): Promise<string | null> => {
  const probe = "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('tapo') else 1)";
  for (const c of PY_CANDIDATES) if (await run(c, ['-c', probe], 15_000)) return c;
  return null;
};

const findAnyPython = async (): Promise<string | null> => {
  for (const c of PY_CANDIDATES) if (await run(c, ['--version'], 10_000)) return c;
  return null;
};

export const ensurePythonTapo = async (): Promise<void> => {
  try {
    const cfg = getSmartHomeConfig().tapo;
    // Only bother if the user actually configured Tapo devices.
    if (!cfg.email || !cfg.password || cfg.devices.length === 0) return;

    if (await findPythonWithTapo()) return;   // already installed — nothing to do.

    const vars = readVars();
    if (vars.tapoInstallAttempted) return;    // tried before; don't retry on every boot.

    const py = await findAnyPython();
    if (!py) {
      console.log('> [SmartHome/Tapo] Python no encontrado — control de Tapo deshabilitado (opcional; el resto de la app funciona).');
      writeVars({ ...vars, tapoInstallAttempted: true, tapoAvailable: false });
      return;
    }

    console.log(`> [SmartHome/Tapo] Instalando la librería "tapo" con "${py}" (una sola vez)…`);
    const strategies = [
      ['-m', 'pip', 'install', '--upgrade', 'tapo'],
      ['-m', 'pip', 'install', '--user', '--upgrade', 'tapo'],
      ['-m', 'pip', 'install', '--break-system-packages', '--upgrade', 'tapo'],
    ];
    let ok = false;
    for (const args of strategies) { if (await run(py, args)) { ok = true; break; } }

    console.log(ok
      ? '> [SmartHome/Tapo] ✔ Librería "tapo" instalada. El control de Tapo estará disponible.'
      : '> [SmartHome/Tapo] No se pudo instalar "tapo" automáticamente — Tapo deshabilitado. (Manual: pip install tapo)');
    writeVars({ ...vars, tapoInstallAttempted: true, tapoAvailable: ok });
  } catch (e: any) {
    console.log(`> [SmartHome/Tapo] aviso (ignorado) al preparar Python: ${e?.message ?? e}`);
  }
};
