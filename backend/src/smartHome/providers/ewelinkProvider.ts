import { getSmartHomeConfig, EwelinkDeviceConfig } from '../smartHomeConfig';
import { LightUpdate, makeEntityId, SmartDevice, SmartProvider } from '../smartDevice';

// `ewelink-api-next` is a dual ESM/CJS package: require() returns { default: … },
// so the classes live under `.default`.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const eWeLink = require('ewelink-api-next').default;

/**
 * eWeLink / Sonoff control goes through the eWeLink cloud (the official path),
 * so it needs:
 *   - your eWeLink account email + password,
 *   - an App ID + App Secret from the eWeLink developer portal
 *     (https://dev.ewelink.cc/), and
 *   - the device id of each plug (visible in the eWeLink app → device → details).
 *
 * NOTE: this is the most fragile of the three providers — eWeLink changes its
 * API periodically and `ewelink-api-next`'s surface evolves with it. If calls
 * fail, check the library's current README and adjust the method names below.
 */
export class EwelinkProvider implements SmartProvider {
  readonly prefix = 'ewelink' as const;

  private client: any = null;
  private loginPromise: Promise<any> | null = null;

  private get cfg() { return getSmartHomeConfig().ewelink; }

  isConfigured = (): boolean =>
    !!this.cfg.email && !!this.cfg.password && !!this.cfg.appId && !!this.cfg.appSecret && this.cfg.devices.length > 0;

  private find = (id: string): EwelinkDeviceConfig | undefined => this.cfg.devices.find(d => d.deviceId === id);

  /** Lazily creates the client and logs in once; reused across calls. */
  private getClient = async (): Promise<any> => {
    if (this.client) return this.client;
    if (!this.loginPromise) {
      this.loginPromise = (async () => {
        const client = new eWeLink.WebAPI({
          appId:     this.cfg.appId,
          appSecret: this.cfg.appSecret,
          region:    this.cfg.region || 'eu',
        });
        await client.user.login({ account: this.cfg.email, password: this.cfg.password });
        this.client = client;
        return client;
      })();
    }
    return this.loginPromise;
  };

  listDevices = async (): Promise<SmartDevice[]> => {
    let things: any[] = [];
    try {
      const client = await this.getClient();
      const res = await client.device.getAllThings({});
      things = res?.data?.thingList ?? res?.thingList ?? [];
    } catch (e: any) {
      console.log(`> [SmartHome/eWeLink] No se pudo obtener la lista de dispositivos: ${e?.message ?? e}`);
    }

    return this.cfg.devices.map(dev => {
      const base: SmartDevice = {
        entityId: makeEntityId('ewelink', dev.deviceId),
        name: dev.name,
        type: dev.type,
        provider: 'ewelink',
        isOn: false,
        reachable: false,
      };
      const thing = things.find(t => (t?.itemData?.deviceid ?? t?.deviceid) === dev.deviceId);
      if (thing) {
        const params = thing.itemData?.params ?? thing.params ?? {};
        base.reachable = true;
        base.isOn = params.switch === 'on'
          || (Array.isArray(params.switches) && params.switches.some((s: any) => s.switch === 'on'));
      }
      return base;
    });
  };

  turnOn  = (id: string): Promise<void> => this.setSwitch(id, 'on');
  turnOff = (id: string): Promise<void> => this.setSwitch(id, 'off');

  private setSwitch = async (id: string, state: 'on' | 'off'): Promise<void> => {
    if (!this.find(id)) throw new Error(`eWeLink device ${id} no configurado`);
    const client = await this.getClient();
    await client.device.setThingStatus({ type: 1, id, params: { switch: state } });
  };

  // eWeLink in this integration targets smart plugs (on/off). Dimmable eWeLink
  // bulbs would need brightness/colour params here; left as on/off for now.
  setLight = async (id: string, _update: LightUpdate): Promise<void> => {
    await this.setSwitch(id, 'on');
  };
}
