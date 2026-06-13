/**
 * Shared types for the Smart Home (Auto) feature, Option C: each smart-device
 * brand is controlled directly through its own Node.js library, with no
 * intermediate hub.
 *
 *   - Tuya / SmartLife → `tuyapi`              (local network, needs local key)
 *   - TP-Link Tapo     → `tp-link-tapo-connect` (local network, account login)
 *   - eWeLink / Sonoff → `ewelink-api-next`     (cloud, account + app creds)
 *
 * Every device is surfaced to the frontend as a `SmartDevice` with an opaque
 * `entityId` of the form `<provider>:<localId>` (e.g. `tuya:bf12ab…`,
 * `tapo:192.168.1.52`, `ewelink:1000abcd`). The aggregator routes commands to
 * the right provider by stripping that prefix.
 */

export type SmartDeviceType = 'switch' | 'light';
export type ProviderName    = 'tuya' | 'tapo' | 'ewelink';

export interface SmartDevice {
  entityId: string;                  // `<provider>:<localId>`
  name: string;
  type: SmartDeviceType;
  provider: ProviderName;
  isOn: boolean;
  reachable: boolean;                // false if the device couldn't be queried
  // Light-only fields (undefined for switches):
  supportsBrightness?: boolean;
  supportsColorTemp?: boolean;
  supportsColor?: boolean;
  brightnessPct?: number;            // 0-100
  colorTempKelvin?: number;
  minColorTempKelvin?: number;
  maxColorTempKelvin?: number;
  rgbColor?: [number, number, number];
}

export interface LightUpdate {
  brightnessPct?: number;            // 0-100
  colorTempKelvin?: number;
  rgbColor?: [number, number, number];
}

/** Common interface implemented by each brand provider. */
export interface SmartProvider {
  readonly prefix: ProviderName;
  isConfigured(): boolean;
  /** Best-effort: never throws; unreachable devices come back reachable:false. */
  listDevices(): Promise<SmartDevice[]>;
  turnOn(localId: string): Promise<void>;
  turnOff(localId: string): Promise<void>;
  setLight(localId: string, update: LightUpdate): Promise<void>;
}

/** Builds the opaque entityId exposed to the frontend. */
export const makeEntityId = (provider: ProviderName, localId: string): string => `${provider}:${localId}`;

/** Splits an entityId back into provider + localId. */
export const parseEntityId = (entityId: string): { provider: ProviderName; localId: string } => {
  const idx = entityId.indexOf(':');
  return {
    provider: entityId.slice(0, idx) as ProviderName,
    localId:  entityId.slice(idx + 1),
  };
};
