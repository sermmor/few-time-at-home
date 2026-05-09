import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Wrapper around flutter_local_notifications.
/// Shows a heads-up notification whenever a new alert arrives via Realtime.
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final _plugin = FlutterLocalNotificationsPlugin();

  // v2 channel ID — forces Android to create a fresh channel with
  // Importance.max even if a previous installation created 'ftah_alerts'
  // at a lower importance (Android caches channel settings permanently).
  static const _channelId   = 'ftah_alerts_v2';
  static const _channelName = 'FEW_TIME@HOME Alerts';

  Future<void> initialize() async {
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidInit);
    await _plugin.initialize(initSettings);

    final androidImpl = _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();

    if (androidImpl != null) {
      // Importance.max  →  heads-up (peek) banner while screen is on.
      const channel = AndroidNotificationChannel(
        _channelId,
        _channelName,
        description:     'Recordatorios desde el servidor local',
        importance:      Importance.max,
        enableVibration: true,
        playSound:       true,
      );
      await androidImpl.createNotificationChannel(channel);

      // Request POST_NOTIFICATIONS permission (Android 13+, API 33+).
      await androidImpl.requestNotificationsPermission();
    }
  }

  Future<void> showAlertNotification({
    required int    id,
    required String message,
  }) async {
    // ignore: avoid_print
    print('[NotificationService] Showing notification id=$id: $message');
    try {
      const androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: 'Recordatorios desde el servidor local',
        importance:         Importance.max,
        priority:           Priority.high,
        enableVibration:    true,
        playSound:          true,
        visibility:         NotificationVisibility.public,
        // Force a full-screen / heads-up intent so it surfaces even when
        // the screen is on and the app is in the foreground.
        fullScreenIntent:   true,
      );
      await _plugin.show(
        id,
        '// NUEVO RECORDATORIO //',
        message,
        const NotificationDetails(android: androidDetails),
      );
      // ignore: avoid_print
      print('[NotificationService] show() completed for id=$id');
    } catch (e) {
      // ignore: avoid_print
      print('[NotificationService] Error: $e');
    }
  }
}
