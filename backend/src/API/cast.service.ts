import { WebSocketsServerService } from '../webSockets/webSocketsServer.service';
import { Bonjour } from 'bonjour-service';

// castv2-client has no TypeScript declarations — require with explicit any typing.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const castv2Client: any = require('castv2-client');
const CastClient          = castv2Client.Client;
const DefaultMediaReceiver = castv2Client.DefaultMediaReceiver;

// ── Public types (shared with API layer) ────────────────────────────────────
export interface CastDevice {
  name: string;
  ip:   string;
  port: number;
}

export type CastPlayerState = 'PLAYING' | 'PAUSED' | 'BUFFERING' | 'IDLE';

export interface CastStatus {
  playerState: CastPlayerState;
  currentTime: number;
  duration:    number;
  castingTo:   string | null;
  /** 'FINISHED' when the media ended naturally; absent otherwise. */
  idleReason?: string;
}

// ── Service ──────────────────────────────────────────────────────────────────
export class CastService {
  static Instance: CastService;

  private client:        any = null;
  private player:        any = null;
  private pollInterval:  NodeJS.Timeout | null = null;
  private currentDevice: CastDevice | null = null;

  constructor() {
    CastService.Instance = this;
  }

  // ── Device discovery ───────────────────────────────────────────────────────
  /**
   * Runs an mDNS browse for _googlecast._tcp services for [timeoutMs] ms and
   * returns all unique Chromecast devices found on the local network.
   */
  discoverDevices(timeoutMs = 5000): Promise<CastDevice[]> {
    return new Promise((resolve) => {
      const bonjour = new Bonjour();
      const found   = new Map<string, CastDevice>(); // keyed by IP to de-dup

      const browser = bonjour.find({ type: 'googlecast' }, (service: any) => {
        const ip = (service.addresses as string[] | undefined)?.[0] ?? service.host;
        if (!ip) return;
        found.set(ip, {
          name: service.name ?? ip,
          ip,
          port: (service.port as number | undefined) ?? 8009,
        });
        console.log(`[Cast] Found device: "${service.name}" @ ${ip}`);
      });

      setTimeout(() => {
        browser.stop();
        bonjour.destroy();
        const devices = Array.from(found.values());
        console.log(`[Cast] Discovery done — ${devices.length} device(s) found`);
        resolve(devices);
      }, timeoutMs);
    });
  }

  // ── Start cast ─────────────────────────────────────────────────────────────
  /**
   * Connects to a Chromecast device, launches DefaultMediaReceiver, and
   * loads the given URL. If [startTime] > 0 the player seeks to that position
   * right after the media loads.
   */
  startCast(
    device:      CastDevice,
    videoUrl:    string,
    contentType = 'video/mp4',
    startTime    = 0,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this._cleanup();
      this.currentDevice = device;
      this.client = new CastClient();

      this.client.on('error', (err: any) => {
        console.error('[Cast] Client error:', err?.message ?? err);
        this._broadcastStatus({ playerState: 'IDLE', currentTime: 0, duration: 0, castingTo: null });
        this._cleanup();
      });

      this.client.connect({ host: device.ip, port: device.port }, () => {
        console.log(`[Cast] Connected to "${device.name}" (${device.ip}:${device.port})`);

        this.client.launch(DefaultMediaReceiver, (launchErr: any, player: any) => {
          if (launchErr) {
            console.error('[Cast] Launch error:', launchErr?.message ?? launchErr);
            this._cleanup();
            return reject(launchErr);
          }

          this.player = player;

          // Unsolicited status events (play/pause transitions etc.)
          player.on('status', (status: any) => {
            this._broadcastStatus(this._mapStatus(status));
          });

          const media = {
            contentId:   videoUrl,
            contentType,
            streamType: 'BUFFERED',
          };

          player.load(media, { autoplay: true }, (loadErr: any, _status: any) => {
            if (loadErr) {
              console.error('[Cast] Load error:', loadErr?.message ?? loadErr);
              this._cleanup();
              return reject(loadErr);
            }

            console.log(`[Cast] Now playing: ${videoUrl}`);

            // Seek to the position the browser was at, if needed
            if (startTime > 1) {
              player.seek(startTime, () => { /* ignore seek errors here */ });
            }

            this._startPolling();
            resolve();
          });
        });
      });
    });
  }

  // ── Playback commands ───────────────────────────────────────────────────────
  play(): void {
    this.player?.play((err: any) => {
      if (err) console.error('[Cast] play error:', err?.message ?? err);
    });
  }

  pause(): void {
    this.player?.pause((err: any) => {
      if (err) console.error('[Cast] pause error:', err?.message ?? err);
    });
  }

  seek(seconds: number): void {
    this.player?.seek(seconds, (err: any) => {
      if (err) console.error('[Cast] seek error:', err?.message ?? err);
    });
  }

  stop(): void {
    console.log('[Cast] Stop requested');
    this._cleanup();
    this._broadcastStatus({ playerState: 'IDLE', currentTime: 0, duration: 0, castingTo: null });
  }

  isActive(): boolean {
    return this.client !== null;
  }

  // ── Internals ───────────────────────────────────────────────────────────────
  private _startPolling(): void {
    this._stopPolling();
    this.pollInterval = setInterval(() => {
      if (!this.player) { this._stopPolling(); return; }
      this.player.getStatus((err: any, status: any) => {
        if (err || !status) return;
        this._broadcastStatus(this._mapStatus(status));

        // Auto-cleanup when the media finishes
        if (status.playerState === 'IDLE' && status.idleReason === 'FINISHED') {
          console.log('[Cast] Media finished');
          // Capture device name before _cleanup() nullifies it, so the frontend
          // knows which device to use for the next track in the auto-advance.
          const deviceName = this.currentDevice?.name ?? null;
          this._cleanup();
          const finishedStatus: CastStatus = {
            playerState: 'IDLE',
            currentTime: 0,
            duration:    0,
            castingTo:   deviceName,
            idleReason:  'FINISHED',
          };
          WebSocketsServerService.Instance?.broadcast({ cast: finishedStatus });
        }
      });
    }, 1000);
  }

  private _stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private _cleanup(): void {
    this._stopPolling();
    try { this.player?.stop(() => {}); } catch (_) {}
    try { this.client?.close();        } catch (_) {}
    this.player        = null;
    this.client        = null;
    this.currentDevice = null;
  }

  private _mapStatus(status: any): CastStatus {
    return {
      playerState: (status.playerState as CastPlayerState) ?? 'IDLE',
      currentTime: (status.currentTime as number)          ?? 0,
      duration:    (status.media?.duration as number)      ?? 0,
      castingTo:   this.currentDevice?.name ?? null,
      idleReason:  status.idleReason as string | undefined,
    };
  }

  private _broadcastStatus(status: CastStatus): void {
    WebSocketsServerService.Instance?.broadcast({ cast: status });
  }
}
