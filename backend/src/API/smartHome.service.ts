import { LightUpdate, parseEntityId, ProviderName, SmartDevice, SmartProvider } from '../smartHome/smartDevice';
import { TuyaProvider }    from '../smartHome/providers/tuyaProvider';
import { TapoProvider }    from '../smartHome/providers/tapoProvider';
import { EwelinkProvider } from '../smartHome/providers/ewelinkProvider';

/**
 * Aggregates the three brand providers (Tuya/SmartLife, Tapo, eWeLink) behind a
 * single API used by the "Auto" page. Devices are addressed by an opaque
 * `entityId` of the form `<provider>:<localId>`; commands are routed to the
 * matching provider.
 *
 * The public surface (ping/listDevices/turnOn/turnOff/setLight/isConfigured) is
 * unchanged from the previous implementation, so the HTTP endpoints in
 * api.service.ts and the frontend keep working as-is.
 */
export class SmartHomeService {
  static Instance: SmartHomeService;

  private providers: Record<ProviderName, SmartProvider>;

  constructor() {
    SmartHomeService.Instance = this;
    this.providers = {
      tuya:    new TuyaProvider(),
      tapo:    new TapoProvider(),
      ewelink: new EwelinkProvider(),
    };
  }

  private configuredProviders = (): SmartProvider[] =>
    Object.values(this.providers).filter(p => p.isConfigured());

  isConfigured = (): boolean => this.configuredProviders().length > 0;

  /** Lightweight status for the Auto page banner. */
  ping = async (): Promise<{ ok: boolean; message: string }> => {
    const active = this.configuredProviders().map(p => p.prefix);
    if (active.length === 0) {
      return { ok: false, message: 'Sin dispositivos configurados. Añade la sección "smart_home" en keys.json (ver README).' };
    }
    return { ok: true, message: `Proveedores activos: ${active.join(', ')}.` };
  };

  /** Aggregated, best-effort device list across all configured providers. */
  listDevices = async (): Promise<SmartDevice[]> => {
    const lists = await Promise.all(
      this.configuredProviders().map(p =>
        p.listDevices().catch(() => [] as SmartDevice[])
      )
    );
    return lists.flat().sort((a, b) => a.name.localeCompare(b.name));
  };

  turnOn = (entityId: string): Promise<void> => {
    const { provider, localId } = parseEntityId(entityId);
    return this.providers[provider].turnOn(localId);
  };

  turnOff = (entityId: string): Promise<void> => {
    const { provider, localId } = parseEntityId(entityId);
    return this.providers[provider].turnOff(localId);
  };

  setLight = (entityId: string, update: LightUpdate): Promise<void> => {
    const { provider, localId } = parseEntityId(entityId);
    return this.providers[provider].setLight(localId, update);
  };
}
