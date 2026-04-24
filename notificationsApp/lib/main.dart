import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/supabase_config.dart';
import 'screens/alerts_screen.dart';
import 'services/notification_service.dart';

/// Called by Firebase when a push arrives and the app is BACKGROUND or KILLED.
/// Must be a top-level function. Android shows the notification automatically
/// from the FCM 'notification' payload — nothing extra needed here.
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // The OS already shows the heads-up banner; no Flutter action required.
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase (reads google-services.json automatically on Android).
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

  // Supabase (real-time list updates when app is open).
  await Supabase.initialize(
    url:     SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );

  // Local notifications channel + permission request.
  await NotificationService.instance.initialize();

  // Subscribe to the FCM topic the backend publishes to.
  await FirebaseMessaging.instance.subscribeToTopic('ftah_alerts');

  runApp(const FtahNotificationsApp());
}

class FtahNotificationsApp extends StatelessWidget {
  const FtahNotificationsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FTAH Alerts',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF020c18),
        colorScheme: const ColorScheme.dark(
          primary:   Color(0xFF00ffe7),
          secondary: Color(0xFFff00cc),
          surface:   Color(0xFF0a1628),
        ),
      ),
      home: const AlertsScreen(),
    );
  }
}
