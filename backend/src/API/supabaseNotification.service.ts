import * as https from 'https';
import { URL } from 'url';

/**
 * Sends alert notifications to Supabase so the Flutter app can receive them
 * via Realtime subscriptions.
 *
 * Initialised in bootstrap.ts with supabase_url + supabase_service_key from
 * keys.json.  If either value is empty the service silently does nothing.
 */
export class SupabaseNotificationService {
  static Instance: SupabaseNotificationService;

  constructor(
    private readonly supabaseUrl: string,
    private readonly serviceKey:  string,
  ) {
    SupabaseNotificationService.Instance = this;
  }

  isConfigured = (): boolean => !!(this.supabaseUrl && this.serviceKey);

  syncPomodoroModes = (modes: any[]): void => {
    if (!this.isConfigured()) return;
    const body = JSON.stringify({
      id:         1,
      modes,
      updated_at: new Date().toISOString(),
    });
    try {
      const url = new URL(`${this.supabaseUrl}/rest/v1/pomodoro_config`);
      const req = https.request(
        {
          hostname: url.hostname,
          port:     url.port ? Number(url.port) : 443,
          path:     url.pathname,
          method:   'POST',
          headers: {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(body),
            'apikey':         this.serviceKey,
            'Authorization':  `Bearer ${this.serviceKey}`,
            // Upsert: insert if id=1 doesn't exist, update if it does.
            'Prefer':         'resolution=merge-duplicates,return=minimal',
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            console.error(`[Supabase] Sync pomodoro failed — HTTP ${res.statusCode}`);
          } else {
            console.log('[Supabase] Pomodoro modes synced.');
          }
        },
      );
      req.on('error', (err) => console.error('[Supabase] Pomodoro sync error:', err.message));
      req.write(body);
      req.end();
    } catch (err) {
      console.error('[Supabase] Pomodoro sync error:', err);
    }
  };

  clearAlerts = (): Promise<void> => new Promise((resolve, reject) => {
    if (!this.isConfigured()) { resolve(); return; }
    try {
      // "id=not.is.null" matches every row — Supabase requires at least one
      // filter to allow a bulk DELETE via the REST API.
      const deleteUrl = new URL(`${this.supabaseUrl}/rest/v1/alerts?id=not.is.null`);
      const req = https.request(
        {
          hostname: deleteUrl.hostname,
          port:     deleteUrl.port ? Number(deleteUrl.port) : 443,
          path:     `${deleteUrl.pathname}${deleteUrl.search}`,
          method:   'DELETE',
          headers: {
            'apikey':        this.serviceKey,
            'Authorization': `Bearer ${this.serviceKey}`,
            'Prefer':        'return=minimal',
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            console.error(`[Supabase] Clear alerts failed — HTTP ${res.statusCode}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          } else {
            console.log('[Supabase] All alerts cleared.');
            resolve();
          }
        },
      );
      req.on('error', (err) => { console.error('[Supabase] Clear alerts error:', err.message); reject(err); });
      req.end();
    } catch (err) {
      console.error('[Supabase] Clear alerts error:', err);
      reject(err);
    }
  });

  /**
   * Upserts the daily weather forecast into the single-row `weather` table
   * (id = 1).  The Flutter app subscribes via Supabase Realtime and updates
   * the Tiempo screen automatically when this fires each morning.
   */
  upsertWeather = (data: {
    dateStr:         string;
    skyMorning:      string;
    skyAfternoon:    string;
    skyNight:        string;
    tempMin:         number | null;
    tempMax:         number | null;
    rainProbability: number;
    rainPeriods:     { label: string; probability: number }[];
    willRain:        boolean;
  }): void => {
    if (!this.isConfigured()) return;

    const body = JSON.stringify({
      id:               1,
      date_str:         data.dateStr,
      sky_morning:      data.skyMorning,
      sky_afternoon:    data.skyAfternoon,
      sky_night:        data.skyNight,
      temp_min:         data.tempMin,
      temp_max:         data.tempMax,
      rain_probability: data.rainProbability,
      rain_periods:     data.rainPeriods,
      will_rain:        data.willRain,
      updated_at:       new Date().toISOString(),
    });

    try {
      const url = new URL(`${this.supabaseUrl}/rest/v1/weather`);
      const req = https.request(
        {
          hostname: url.hostname,
          port:     url.port ? Number(url.port) : 443,
          path:     url.pathname,
          method:   'POST',
          headers: {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(body),
            'apikey':         this.serviceKey,
            'Authorization':  `Bearer ${this.serviceKey}`,
            'Prefer':         'resolution=merge-duplicates,return=minimal',
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            console.error(`[Supabase] Upsert weather failed — HTTP ${res.statusCode}`);
          } else {
            console.log('[Supabase] Weather forecast upserted.');
          }
        },
      );
      req.on('error', (err) => console.error('[Supabase] Weather upsert error:', err.message));
      req.write(body);
      req.end();
    } catch (err) {
      console.error('[Supabase] Weather upsert error:', err);
    }
  };

  insertAlert = (message: string, isRecurring: boolean): void => {
    if (!this.isConfigured()) return;

    const body = JSON.stringify({ message, is_recurring: isRecurring });

    try {
      const url  = new URL(`${this.supabaseUrl}/rest/v1/alerts`);
      const req  = https.request(
        {
          hostname: url.hostname,
          port:     url.port ? Number(url.port) : 443,
          path:     url.pathname,
          method:   'POST',
          headers: {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(body),
            'apikey':         this.serviceKey,
            'Authorization':  `Bearer ${this.serviceKey}`,
            'Prefer':         'return=minimal',
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            console.error(`[Supabase] Insert alert failed — HTTP ${res.statusCode}`);
          }
        },
      );
      req.on('error', (err) => console.error('[Supabase] Alert insert error:', err.message));
      req.write(body);
      req.end();
    } catch (err) {
      console.error('[Supabase] Alert insert error:', err);
    }
  };
}
