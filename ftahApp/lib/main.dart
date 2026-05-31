import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:window_manager/window_manager.dart';
import 'core/supabase_config.dart';
import 'core/theme.dart';
import 'screens/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ── Desktop window setup ─────────────────────────────────────────────────
  if (Platform.isWindows) {
    await windowManager.ensureInitialized();
    await windowManager.setTitle('FT@Home');
    await windowManager.maximize();
  } else if (Platform.isLinux) {
    await windowManager.ensureInitialized();
    await windowManager.setTitle('FT@Home');
    await windowManager.maximize();
  } else if (Platform.isMacOS) {
    await windowManager.ensureInitialized();
    await windowManager.setTitle('FT@Home');
    await windowManager.maximize();
  }

  // ── Android orientation ──────────────────────────────────────────────────
  if (Platform.isAndroid || Platform.isIOS) {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    final view       = WidgetsBinding.instance.platformDispatcher.views.first;
    final shortestDp = view.physicalSize.shortestSide / view.devicePixelRatio;
    final isPhone    = shortestDp < 600;
    await SystemChrome.setPreferredOrientations(
      isPhone
          ? [DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]
          : [DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight],
    );
  }

  // ── Supabase ─────────────────────────────────────────────────────────────
  await Supabase.initialize(
    url:     SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );

  runApp(const FtahApp());
}

class FtahApp extends StatelessWidget {
  const FtahApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title:                    'FT@Home',
    debugShowCheckedModeBanner: false,
    theme:                    buildCyberTheme(),
    home:                     const HomeScreen(),
  );
}
