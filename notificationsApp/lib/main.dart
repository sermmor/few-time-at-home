import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/supabase_config.dart';
import 'screens/alerts_screen.dart';
import 'screens/pomodoro_screen.dart';
import 'screens/weather_screen.dart';
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

  // Subscribe to FCM topics.
  await FirebaseMessaging.instance.subscribeToTopic('ftah_alerts');
  await FirebaseMessaging.instance.subscribeToTopic('ftah_weather');

  runApp(const FtahNotificationsApp());
}

class FtahNotificationsApp extends StatelessWidget {
  const FtahNotificationsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Few Time @ Home',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF020c18),
        colorScheme: const ColorScheme.dark(
          primary:   Color(0xFF00ffe7),
          secondary: Color(0xFFff00cc),
          surface:   Color(0xFF0a1628),
        ),
      ),
      home: const MainScreen(),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  static const _cyan    = Color(0xFF00FFE7);
  static const _magenta = Color(0xFFFF00CC);
  static const _amber   = Color(0xFFFFBB00);
  static const _bg      = Color(0xFF020C18);
  static const _bgPanel = Color(0xFF071526);

  int _tabIndex = 0;

  // Keep all screens alive with IndexedStack so the Pomodoro timer
  // is not reset when switching tabs.
  static const _screens = [
    AlertsScreen(),
    PomodoroScreen(),
    WeatherScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      // IndexedStack preserves widget state across tab switches.
      body: IndexedStack(
        index: _tabIndex,
        children: _screens,
      ),
      bottomNavigationBar: _buildNavBar(),
    );
  }

  Widget _buildNavBar() {
    return Container(
      decoration: BoxDecoration(
        color:  _bgPanel,
        border: Border(top: BorderSide(color: _cyan.withOpacity(0.22), width: 1)),
        boxShadow: [
          BoxShadow(
            color:      _cyan.withOpacity(0.06),
            blurRadius: 12,
            offset:     const Offset(0, -2),
          ),
        ],
      ),
      child: BottomNavigationBar(
        currentIndex:            _tabIndex,
        onTap:                   (i) => setState(() => _tabIndex = i),
        type:                    BottomNavigationBarType.fixed,
        backgroundColor:         Colors.transparent,
        elevation:               0,
        // Label colours are tab-specific via the icon widgets;
        // the bar-level colours are a neutral fallback.
        selectedItemColor:   const Color(0xFFE0E0E0),
        unselectedItemColor: const Color(0xFF2A4A6A),
        selectedLabelStyle: const TextStyle(
          fontFamily:    'monospace',
          fontSize:      9,
          letterSpacing: 1.5,
          fontWeight:    FontWeight.bold,
        ),
        unselectedLabelStyle: const TextStyle(
          fontFamily:    'monospace',
          fontSize:      9,
          letterSpacing: 1.5,
        ),
        items: [
          BottomNavigationBarItem(
            icon: _NavIcon(
              icon:   Icons.notifications_outlined,
              active: _tabIndex == 0,
              color:  _cyan,
            ),
            activeIcon: _NavIcon(
              icon:   Icons.notifications,
              active: true,
              color:  _cyan,
            ),
            label: 'ALERTAS',
          ),
          BottomNavigationBarItem(
            icon: _NavIcon(
              icon:   Icons.timer_outlined,
              active: _tabIndex == 1,
              color:  _magenta,
            ),
            activeIcon: _NavIcon(
              icon:   Icons.timer,
              active: true,
              color:  _magenta,
            ),
            label: 'POMODORO',
          ),
          BottomNavigationBarItem(
            icon: _NavIcon(
              icon:   Icons.wb_cloudy_outlined,
              active: _tabIndex == 2,
              color:  _amber,
            ),
            activeIcon: _NavIcon(
              icon:   Icons.wb_cloudy,
              active: true,
              color:  _amber,
            ),
            label: 'TIEMPO',
          ),
        ],
      ),
    );
  }
}

class _NavIcon extends StatelessWidget {
  const _NavIcon({
    required this.icon,
    required this.active,
    required this.color,
  });

  final IconData icon;
  final bool     active;
  final Color    color;

  @override
  Widget build(BuildContext context) {
    return Icon(
      icon,
      size:  22,
      color: active ? color : color.withOpacity(0.3),
      shadows: active
          ? [Shadow(color: color.withOpacity(0.5), blurRadius: 8)]
          : null,
    );
  }
}
