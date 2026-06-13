import { execFile } from 'child_process';
import { getSmartHomeConfig, TapoDeviceConfig } from '../smartHomeConfig';
import { LightUpdate, makeEntityId, SmartDevice, SmartProvider } from '../smartDevice';

/**
 * Tapo provider — controlled via a tiny embedded Python helper using the
 * `tapo` library (https://pypi.org/project/tapo/).
 *
 * Why Python: recent Tapo firmware uses encryption transports (KLAP v2 / TPAP)
 * that no maintained Node.js library handles. The `tapo` library does, is
 * Tapo-specific, current, and ships prebuilt wheels for Windows, macOS and
 * Linux (incl. Raspberry Pi aarch64), on Python 3.10+.
 *
 * GRACEFUL DEGRADATION: if no usable Python (with `tapo` installed) is found,
 * the Tapo devices simply don't appear on the Auto page and the backend keeps
 * running normally — the app never breaks on machines without Python.
 * (`ensurePythonTapo` tries to install the library automatically at startup.)
 */

// Embedded helper — inline (not a separate .py) so it survives the TS→build/
// compile and has no path issues. Lines are flush-left (Python is
// indentation-sensitive; template literals preserve whitespace).
const TAPO_SCRIPT = `
import sys, json, asyncio
from tapo import ApiClient

async def do(device, action):
    if action == "on":
        await device.on(); return {"ok": True}
    if action == "off":
        await device.off(); return {"ok": True}
    if action == "info":
        info = await device.get_device_info_json()
        on = info.get("device_on") if isinstance(info, dict) else None
        return {"ok": True, "device_on": bool(on)}
    return {"ok": False, "error": "accion desconocida: " + action}

async def run():
    action, host, email, password = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    pref = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] else ""
    client = ApiClient(email, password)
    # Try the configured model first (if any), then the common plug handlers.
    handlers, seen = [], set()
    for h in ([pref] if pref else []) + ["p100", "p110", "p115", "p105", "generic_device"]:
        if h and h not in seen:
            seen.add(h); handlers.append(h)
    last = None
    for h in handlers:
        factory = getattr(client, h, None)
        if factory is None:
            continue
        try:
            device = await factory(host)
            res = await do(device, action)
            res["model"] = h
            return res
        except Exception as e:
            last = e
            continue
    return {"ok": False, "error": str(last) if last else "ningun handler funciono"}

try:
    print(json.dumps(asyncio.run(run())))
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)}))
`;

const PY_CANDIDATES = process.platform === 'win32'
  ? ['py', 'python', 'python3']
  : ['python3', 'python'];

export class TapoProvider implements SmartProvider {
  readonly prefix = 'tapo' as const;

  private pythonProbe: Promise<string | null> | null = null;
  private pythonCmd: string | null | undefined = undefined;   // undefined = not probed yet

  private get cfg() { return getSmartHomeConfig().tapo; }

  private get configPresent(): boolean {
    return !!this.cfg.email && !!this.cfg.password && this.cfg.devices.length > 0;
  }

  isConfigured = (): boolean => this.configPresent && this.pythonCmd !== null;

  private find = (ip: string): TapoDeviceConfig | undefined => this.cfg.devices.find(d => d.ip === ip);

  /** Detects a Python interpreter that has the `tapo` library. Cached. */
  private getPython = (): Promise<string | null> => {
    if (!this.pythonProbe) {
      this.pythonProbe = (async () => {
        for (const cmd of PY_CANDIDATES) {
          if (await this.canImportTapo(cmd)) { this.pythonCmd = cmd; return cmd; }
        }
        this.pythonCmd = null;
        console.log('> [SmartHome/Tapo] Python con la librería "tapo" no encontrado — Tapo deshabilitado. (Se intenta instalar sola al arrancar; si no, `pip install tapo` con Python 3.10+.)');
        return null;
      })();
    }
    return this.pythonProbe;
  };

  private canImportTapo = (cmd: string): Promise<boolean> =>
    new Promise(resolve => {
      try {
        // find_spec only checks the package is installed (fast, no heavy import).
        const probe = "import importlib.util,sys; sys.exit(0 if importlib.util.find_spec('tapo') else 1)";
        execFile(cmd, ['-c', probe], { timeout: 15_000 }, err => resolve(!err));
      } catch {
        resolve(false);
      }
    });

  /** Runs the helper for one device/action; resolves the parsed JSON result. */
  private runHelper = (action: string, ip: string): Promise<any> =>
    new Promise(async (resolve, reject) => {
      const py = await this.getPython();
      if (!py) { reject(new Error('Python con la librería tapo no disponible')); return; }
      const model = this.find(ip)?.model ?? '';
      execFile(
        py,
        ['-c', TAPO_SCRIPT, action, ip, this.cfg.email, this.cfg.password, model],
        { timeout: 30_000 },
        (err, stdout, stderr) => {
          const out = (stdout ?? '').trim();
          if (!out) { reject(new Error(stderr?.trim() || err?.message || 'sin respuesta del helper')); return; }
          try {
            const res = JSON.parse(out.split('\n').pop() || '{}');
            if (res.ok === false) { reject(new Error(res.error || 'error del helper de Tapo')); return; }
            resolve(res);
          } catch {
            reject(new Error(`respuesta inválida del helper: ${out}`));
          }
        },
      );
    });

  listDevices = async (): Promise<SmartDevice[]> => {
    if (!this.configPresent) return [];
    const py = await this.getPython();
    if (!py) return [];   // No Python/tapo → Tapo unavailable, app keeps working.

    return Promise.all(this.cfg.devices.map(async dev => {
      const base: SmartDevice = {
        entityId: makeEntityId('tapo', dev.ip),
        name: dev.name,
        type: dev.type,
        provider: 'tapo',
        isOn: false,
        reachable: false,
      };
      try {
        const res = await this.runHelper('info', dev.ip);
        base.reachable = true;
        base.isOn = !!res.device_on;
        if (res.model) console.log(`> [SmartHome/Tapo] "${dev.name}" OK (handler: ${res.model})`);
      } catch (e: any) {
        const msg = `${e?.message ?? e}`;
        console.log(`> [SmartHome/Tapo] "${dev.name}" (${dev.ip}) no disponible: ${msg}`);
        if (/InvalidResponse/i.test(msg)) {
          console.log('>   Pista: el firmware usa cifrado "TPAP" (aún no soportado). Prueba a desactivar y reactivar "Compatibilidad con terceros" en la app Tapo.');
        }
      }
      return base;
    }));
  };

  turnOn  = async (ip: string): Promise<void> => { await this.command(ip, 'on'); };
  turnOff = async (ip: string): Promise<void> => { await this.command(ip, 'off'); };

  // These are smart plugs (on/off). A light update just ensures the device is on.
  setLight = async (ip: string, _update: LightUpdate): Promise<void> => { await this.command(ip, 'on'); };

  private command = async (ip: string, action: 'on' | 'off'): Promise<void> => {
    if (!this.find(ip)) throw new Error(`Tapo device ${ip} no configurado`);
    await this.runHelper(action, ip);
  };
}
