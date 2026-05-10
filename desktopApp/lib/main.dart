import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:window_manager/window_manager.dart';
import 'core/services/auth_service.dart';
import 'screens/setup/setup_screen.dart';
import 'screens/profile_selection/profile_selection_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ── Desktop window setup ─────────────────────────────────────────────────
  if (Platform.isWindows || Platform.isLinux) {
    // True fullscreen (hides taskbar/dock)
    await windowManager.ensureInitialized();
    await windowManager.setFullScreen(true);
    await windowManager.setTitle('FT@Home Desktop');
  } else if (Platform.isMacOS) {
    // Maximised window: fills the screen while keeping the menu bar and Dock
    // visible — more natural on macOS than hiding them with true fullscreen.
    await windowManager.ensureInitialized();
    await windowManager.setTitle('FT@Home Desktop');
    await windowManager.maximize();
  }

  // ── Mobile fullscreen (Android / iOS) ────────────────────────────────────
  if (Platform.isAndroid || Platform.isIOS) {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  final hasCredentials = await AuthService.instance.hasCredentials();

  runApp(FtahApp(startWithSetup: !hasCredentials));
}

class FtahApp extends StatelessWidget {
  final bool startWithSetup;
  const FtahApp({super.key, required this.startWithSetup});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FT@Home Desktop',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.dark(
          primary:   Colors.tealAccent,
          secondary: Colors.tealAccent,
          surface:   const Color(0xFF1E1E1E),
        ),
        scaffoldBackgroundColor: const Color(0xFF121212),
        useMaterial3: true,
      ),
      home: startWithSetup
          ? const SetupScreen()
          : const ProfileSelectionScreen(),
    );
  }
}
