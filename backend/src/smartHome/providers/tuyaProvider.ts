import { getSmartHomeConfig, TuyaDeviceConfig } from '../smartHomeConfig';
import { LightUpdate, makeEntityId, SmartDevice, SmartProvider } from '../smartDevice';

// `tuyapi` is a CommonJS module without bundled types — require() keeps tsc
// happy and lets the project compile even before `npm install` is run.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TuyAPI = require('tuyapi');

// Default DPS (data-point) ids for a typical Tuya v3.3 colour bulb.
const DEF = { power: 20, mode: 21, brightness: 22, colorTemp: 23, color: 24, brightnessMin: 10, brightnessMax: 1000 };
// Color-temperature range we expose to the UI (Tuya temp_value 0-1000 maps here).
const KELVIN_MIN = 2700, KELVIN_MAX = 6500;

// ── Colour helpers (RGB ↔ Tuya HSV hex) ───────────────────────────────────────

const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r)      h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else                h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [Math.round(h), s, max];
};

const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};

const hex4 = (n: number): string => Math.max(0, Math.round(n)).toString(16).padStart(4, '0');

const rgbToTuyaHsv = (rgb: [number, number, number]): string => {
  const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  return hex4(h) + hex4(s * 1000) + hex4(v * 1000);
};

const tuyaHsvToRgb = (hex: string): [number, number, number] | undefined => {
  if (typeof hex !== 'string' || hex.length < 12) return undefined;
  const h = parseInt(hex.slice(0, 4), 16);
  const s = parseInt(hex.slice(4, 8), 16) / 1000;
  const v = parseInt(hex.slice(8, 12), 16) / 1000;
  if ([h, s, v].some(isNaN)) return undefined;
  return hsvToRgb(h, s, v);
};

// ── Provider ───────────────────────────────────────────────────────────────────

export class TuyaProvider implements SmartProvider {
  readonly prefix = 'tuya' as const;

  private get devices(): TuyaDeviceConfig[] { return getSmartHomeConfig().tuya.devices; }

  isConfigured = (): boolean => this.devices.length > 0;

  private find = (id: string): TuyaDeviceConfig | undefined => this.devices.find(d => d.id === id);

  private dpsOf = (cfg: TuyaDeviceConfig) => ({
    power:         cfg.dps?.power         ?? (cfg.type === 'light' ? DEF.power : 1),
    mode:          cfg.dps?.mode          ?? DEF.mode,
    brightness:    cfg.dps?.brightness    ?? DEF.brightness,
    colorTemp:     cfg.dps?.colorTemp     ?? DEF.colorTemp,
    color:         cfg.dps?.color         ?? DEF.color,
    brightnessMin: cfg.dps?.brightnessMin ?? DEF.brightnessMin,
    brightnessMax: cfg.dps?.brightnessMax ?? DEF.brightnessMax,
  });

  /** Opens a short-lived connection, runs `fn`, then always disconnects. */
  private withDevice = async (cfg: TuyaDeviceConfig, fn: (device: any) => any): Promise<any> => {
    const device = new TuyAPI({ id: cfg.id, key: cfg.key, ip: cfg.ip, version: cfg.version || '3.3' });
    // CRITICAL: tuyapi's TuyaDevice is an EventEmitter that emits an async
    // 'error' event on socket failures (e.g. ECONNRESET). Without a listener,
    // Node treats it as an unhandled 'error' and crashes the whole process.
    // The actual operation errors are surfaced via the rejected promises below.
    device.on('error', () => { /* swallow: handled by try/catch around ops */ });
    try {
      if (!cfg.ip) await device.find();
      await device.connect();
      return await fn(device);
    } finally {
      try { device.disconnect(); } catch { /* ignore */ }
    }
  };

  listDevices = async (): Promise<SmartDevice[]> => {
    const results = await Promise.all(this.devices.map(async cfg => {
      const dps = this.dpsOf(cfg);
      const base: SmartDevice = {
        entityId: makeEntityId('tuya', cfg.id),
        name: cfg.name,
        type: cfg.type,
        provider: 'tuya',
        isOn: false,
        reachable: false,
      };
      try {
        const state = await this.withDevice(cfg, d => d.get({ schema: true }));
        const data = state?.dps ?? state ?? {};
        base.reachable = true;
        base.isOn = !!data[dps.power];
        if (cfg.type === 'light') {
          base.supportsBrightness = true;
          base.supportsColorTemp  = true;
          base.supportsColor      = true;
          base.minColorTempKelvin = KELVIN_MIN;
          base.maxColorTempKelvin = KELVIN_MAX;
          const bright = data[dps.brightness];
          if (typeof bright === 'number') {
            base.brightnessPct = Math.round(((bright - dps.brightnessMin) / (dps.brightnessMax - dps.brightnessMin)) * 100);
          }
          const temp = data[dps.colorTemp];
          if (typeof temp === 'number') {
            base.colorTempKelvin = Math.round(KELVIN_MIN + (temp / 1000) * (KELVIN_MAX - KELVIN_MIN));
          }
          const rgb = tuyaHsvToRgb(data[dps.color]);
          if (rgb) base.rgbColor = rgb;
        }
      } catch (e: any) {
        console.log(`> [SmartHome/Tuya] "${cfg.name}" (${cfg.id}) no disponible: ${e?.message ?? e}`);
      }
      return base;
    }));
    return results;
  };

  turnOn  = (id: string): Promise<void> => this.setPower(id, true);
  turnOff = (id: string): Promise<void> => this.setPower(id, false);

  private setPower = async (id: string, on: boolean): Promise<void> => {
    const cfg = this.find(id);
    if (!cfg) throw new Error(`Tuya device ${id} no configurado`);
    const dps = this.dpsOf(cfg);
    await this.withDevice(cfg, d => d.set({ dps: dps.power, set: on }));
  };

  setLight = async (id: string, update: LightUpdate): Promise<void> => {
    const cfg = this.find(id);
    if (!cfg) throw new Error(`Tuya device ${id} no configurado`);
    const dps = this.dpsOf(cfg);
    const data: Record<string, any> = { [dps.power]: true };

    if (update.brightnessPct != null) {
      data[dps.mode] = 'white';
      data[dps.brightness] = Math.round(dps.brightnessMin + (update.brightnessPct / 100) * (dps.brightnessMax - dps.brightnessMin));
    }
    if (update.colorTempKelvin != null) {
      data[dps.mode] = 'white';
      const t = (update.colorTempKelvin - KELVIN_MIN) / (KELVIN_MAX - KELVIN_MIN);
      data[dps.colorTemp] = Math.round(Math.max(0, Math.min(1, t)) * 1000);
    }
    if (update.rgbColor != null) {
      data[dps.mode] = 'colour';
      data[dps.color] = rgbToTuyaHsv(update.rgbColor);
    }

    await this.withDevice(cfg, d => d.set({ multiple: true, data }));
  };
}
