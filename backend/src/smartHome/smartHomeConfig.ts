import { readFileSync } from 'fs';

/**
 * Smart Home configuration, read from the `smart_home` section of keys.json.
 * Each brand has its own block; an empty/absent block disables that provider.
 *
 * Example keys.json section:
 *
 *   "smart_home": {
 *     "tuya": {
 *       "devices": [
 *         { "name": "Bombilla salón", "type": "light",  "id": "bf...", "key": "xxxx", "ip": "192.168.1.50", "version": "3.3" },
 *         { "name": "Enchufe cocina", "type": "switch", "id": "bf...", "key": "yyyy", "ip": "192.168.1.51", "version": "3.3" }
 *       ]
 *     },
 *     "tapo": {
 *       "email": "you@example.com",
 *       "password": "********",
 *       "devices": [ { "name": "Enchufe Tapo", "type": "switch", "ip": "192.168.1.52" } ]
 *     },
 *     "ewelink": {
 *       "email": "you@example.com",
 *       "password": "********",
 *       "region": "eu",
 *       "appId": "xxxx",
 *       "appSecret": "yyyy",
 *       "devices": [ { "name": "Enchufe eWeLink", "type": "switch", "deviceId": "1000abcd" } ]
 *     }
 *   }
 */

export interface TuyaDeviceConfig {
  name: string;
  type: 'switch' | 'light';
  id: string;
  key: string;
  ip?: string;                 // optional: tuyapi can auto-discover
  version?: string;            // protocol version, default '3.3'
  // Optional DPS (data-point) overrides — Tuya bulbs/plugs vary by model.
  dps?: {
    power?: string | number;   // default 20 (bulbs) / 1 (plugs)
    mode?: string | number;    // default 21
    brightness?: string | number;   // default 22 (range 10-1000)
    colorTemp?: string | number;     // default 23 (range 0-1000)
    color?: string | number;         // default 24 (HSV hex)
    brightnessMin?: number;    // default 10
    brightnessMax?: number;    // default 1000
  };
}

export interface TapoDeviceConfig {
  name: string;
  type: 'switch' | 'light';
  ip: string;
  // Optional Tapo model handler (e.g. "p100", "p110", "p115"). If omitted, the
  // helper auto-detects by trying the common plug handlers.
  model?: string;
}

export interface EwelinkDeviceConfig {
  name: string;
  type: 'switch' | 'light';
  deviceId: string;
}

export interface SmartHomeConfig {
  tuya:    { devices: TuyaDeviceConfig[] };
  tapo:    { email: string; password: string; devices: TapoDeviceConfig[] };
  ewelink: { email: string; password: string; region: string; appId: string; appSecret: string; devices: EwelinkDeviceConfig[] };
}

const keysPath = 'keys.json';
let cached: SmartHomeConfig | null = null;

export const getSmartHomeConfig = (): SmartHomeConfig => {
  if (cached) return cached;

  let raw: any = {};
  try {
    raw = JSON.parse(readFileSync(keysPath, 'utf-8')).smart_home ?? {};
  } catch {
    raw = {};
  }

  cached = {
    tuya: {
      devices: Array.isArray(raw.tuya?.devices) ? raw.tuya.devices : [],
    },
    tapo: {
      email:    raw.tapo?.email    ?? '',
      password: raw.tapo?.password ?? '',
      devices:  Array.isArray(raw.tapo?.devices) ? raw.tapo.devices : [],
    },
    ewelink: {
      email:     raw.ewelink?.email     ?? '',
      password:  raw.ewelink?.password  ?? '',
      region:    raw.ewelink?.region    ?? 'eu',
      appId:     raw.ewelink?.appId     ?? '',
      appSecret: raw.ewelink?.appSecret ?? '',
      devices:   Array.isArray(raw.ewelink?.devices) ? raw.ewelink.devices : [],
    },
  };
  return cached;
};
