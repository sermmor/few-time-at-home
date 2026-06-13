export type SmartDeviceType = 'switch' | 'light';
export type SmartProviderName = 'tuya' | 'tapo' | 'ewelink';

export interface SmartDevice {
  entityId: string;
  name: string;
  type: SmartDeviceType;
  isOn: boolean;
  provider?: SmartProviderName;
  reachable?: boolean;               // false if the device couldn't be queried
  // Light-only fields:
  supportsBrightness?: boolean;
  supportsColorTemp?: boolean;
  supportsColor?: boolean;
  brightnessPct?: number;            // 0-100
  colorTempKelvin?: number;
  minColorTempKelvin?: number;
  maxColorTempKelvin?: number;
  rgbColor?: [number, number, number];
}

export interface SmartDevicesResponse {
  devices: SmartDevice[];
  error?: string;
}

export interface SmartHomeStatus {
  ok: boolean;
  message: string;
}

export interface SmartActionResponse {
  ok: boolean;
  error?: string;
}

export interface LightUpdateRequest {
  entityId: string;
  brightnessPct?: number;
  colorTempKelvin?: number;
  rgbColor?: [number, number, number];
}

// ── Mocks (used when ConfigurationService.isUsingMocks is true) ────────────────

export const smartHomeStatusMock = (): SmartHomeStatus => ({
  ok: true,
  message: 'Proveedores activos: tuya, tapo, ewelink.',
});

export const smartDevicesResponseMock = (): SmartDevicesResponse => ({
  devices: [
    { entityId: 'tapo:192.168.1.52', name: 'Enchufe Tapo', type: 'switch', provider: 'tapo', reachable: true, isOn: true },
    { entityId: 'ewelink:1000abcd', name: 'Enchufe eWeLink', type: 'switch', provider: 'ewelink', reachable: true, isOn: false },
    { entityId: 'tuya:bf01enchufe', name: 'Enchufe SmartLife', type: 'switch', provider: 'tuya', reachable: true, isOn: false },
    {
      entityId: 'tuya:bf02bombilla', name: 'Bombilla SmartLife', type: 'light', provider: 'tuya', reachable: true, isOn: true,
      supportsBrightness: true, supportsColorTemp: true, supportsColor: true,
      brightnessPct: 70, colorTempKelvin: 4000, minColorTempKelvin: 2700,
      maxColorTempKelvin: 6500, rgbColor: [255, 200, 120],
    },
  ],
});

export const smartActionResponseMock = (): SmartActionResponse => ({ ok: true });
