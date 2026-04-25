import * as admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const SERVICE_ACCOUNT_PATH = join(process.cwd(), 'data', 'firebase-service-account.json');
const FCM_TOPIC            = 'ftah_alerts';

export class FcmNotificationService {
  static Instance: FcmNotificationService;
  private initialized = false;

  constructor() {
    FcmNotificationService.Instance = this;
    this.init();
  }

  private init(): void {
    if (!existsSync(SERVICE_ACCOUNT_PATH)) {
      console.log('> FCM: firebase-service-account.json not found — push notifications disabled.');
      return;
    }
    try {
      const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      this.initialized = true;
      console.log('> FCM: initialized successfully.');
    } catch (e) {
      console.error('> FCM: initialization error:', e);
    }
  }

  /**
   * Sends a concise weather summary push notification to the 'ftah_weather'
   * FCM topic.  The Flutter app subscribes to this topic and shows it as a
   * heads-up banner; the full structured forecast lives in Supabase.
   */
  sendWeatherNotification(summary: string): void {
    if (!this.initialized) return;
    admin.messaging().send({
      topic: 'ftah_weather',
      notification: {
        title: '// TIEMPO HOY //',
        body:  summary,
      },
      data: {
        type:   'weather',
        sentAt: new Date().toISOString(),
      },
      android: {
        priority: 'high',
        notification: {
          channelId:             'ftah_alerts_v2',
          priority:              'max',
          defaultSound:          true,
          defaultVibrateTimings: true,
        },
      },
    })
    .then((msgId: string) => console.log(`> FCM: weather sent (${msgId})`))
    .catch((err: unknown)  => console.error('> FCM: weather send error:', err));
  }

  sendAlert(message: string): void {
    if (!this.initialized) return;
    admin.messaging().send({
      topic: FCM_TOPIC,
      // The 'notification' block is shown automatically by Android/iOS
      // when the app is in the background or killed.
      notification: {
        title: '// NUEVO RECORDATORIO //',
        body:  message,
      },
      // The 'data' block is available to the Flutter app for custom handling.
      data: {
        message,
        sentAt: new Date().toISOString(),
      },
      android: {
        priority: 'high',
        notification: {
          channelId:              'ftah_alerts_v2',
          priority:               'max',
          defaultSound:           true,
          defaultVibrateTimings:  true,
        },
      },
    })
    .then((msgId: string) => console.log(`> FCM: alert sent (${msgId})`))
    .catch((err: unknown)  => console.error('> FCM: send error:', err));
  }
}
