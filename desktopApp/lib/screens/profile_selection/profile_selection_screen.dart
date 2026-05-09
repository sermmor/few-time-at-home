import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/models/desktop_config.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/drive_service.dart';
import '../../core/constants.dart';
import '../desktop/desktop_screen.dart';
import '../setup/setup_screen.dart';

/// Shows the list of remote desktop profiles available in Google Drive.
/// The user picks one → navigates to [DesktopScreen].
class ProfileSelectionScreen extends StatefulWidget {
  const ProfileSelectionScreen({super.key});

  @override
  State<ProfileSelectionScreen> createState() => _ProfileSelectionScreenState();
}

class _ProfileSelectionScreenState extends State<ProfileSelectionScreen> {
  bool _loading = true;
  String? _error;
  List<ProfileMeta> _profiles = [];
  String? _lastProfile;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    setState(() { _loading = true; _error = null; });
    try {
      // Authenticate and initialise Drive
      final client = await AuthService.instance.getAuthClient();
      DriveService.instance.init(client);

      // Load profile list
      final profiles = await DriveService.instance.listProfiles();

      // Load last used profile from prefs
      final prefs = await SharedPreferences.getInstance();
      final last  = prefs.getString(kPrefLastProfile);

      setState(() {
        _profiles    = profiles;
        _lastProfile = last;
        _loading     = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _openProfile(ProfileMeta meta) async {
    // Persist last selection
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kPrefLastProfile, meta.name);

    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => DesktopScreen(profile: meta)),
    );
    // When returning from desktop, refresh the list in case it changed
    _init();
  }

  Future<void> _signOutAndSetup() async {
    await AuthService.instance.clearAll();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const SetupScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: Column(
        children: [
          // ── Top bar ──────────────────────────────────────────────────────
          Container(
            color: const Color(0xFF1A1A1A),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            child: Row(
              children: [
                const Icon(Icons.cloud_sync, color: Colors.tealAccent, size: 28),
                const SizedBox(width: 12),
                Text('FT@Home Desktop',
                    style: theme.textTheme.titleLarge?.copyWith(color: Colors.white)),
                const Spacer(),
                if (!_loading)
                  IconButton(
                    tooltip: 'Refresh',
                    icon: const Icon(Icons.refresh, color: Colors.white54),
                    onPressed: _init,
                  ),
                IconButton(
                  tooltip: 'Sign out / change credentials',
                  icon: const Icon(Icons.logout, color: Colors.white54),
                  onPressed: _signOutAndSetup,
                ),
              ],
            ),
          ),

          // ── Body ─────────────────────────────────────────────────────────
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: Colors.tealAccent))
                : _error != null
                    ? _ErrorView(message: _error!, onRetry: _init)
                    : _profiles.isEmpty
                        ? _EmptyView(onRefresh: _init)
                        : _ProfileGrid(
                            profiles:    _profiles,
                            lastProfile: _lastProfile,
                            onSelect:    _openProfile,
                          ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _ProfileGrid extends StatelessWidget {
  final List<ProfileMeta> profiles;
  final String? lastProfile;
  final void Function(ProfileMeta) onSelect;

  const _ProfileGrid({
    required this.profiles,
    required this.lastProfile,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    // Sort: last-used first
    final sorted = [...profiles]..sort((a, b) {
      if (a.name == lastProfile) return -1;
      if (b.name == lastProfile) return 1;
      return a.name.compareTo(b.name);
    });

    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Select a profile',
              style: Theme.of(context).textTheme.headlineSmall
                  ?.copyWith(color: Colors.white70)),
          const SizedBox(height: 24),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 240,
                mainAxisExtent:     120,
                crossAxisSpacing:   16,
                mainAxisSpacing:    16,
              ),
              itemCount: sorted.length,
              itemBuilder: (_, i) {
                final meta = sorted[i];
                final isLast = meta.name == lastProfile;
                return _ProfileCard(
                  meta:   meta,
                  isLast: isLast,
                  onTap:  () => onSelect(meta),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final ProfileMeta meta;
  final bool isLast;
  final VoidCallback onTap;

  const _ProfileCard({required this.meta, required this.isLast, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: isLast ? Colors.tealAccent.withOpacity(0.12) : const Color(0xFF1E1E1E),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isLast ? Colors.tealAccent : Colors.white12,
          width: isLast ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.desktop_windows_rounded,
                  color: isLast ? Colors.tealAccent : Colors.white38,
                  size: 36),
              const SizedBox(height: 10),
              Text(
                meta.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: isLast ? Colors.tealAccent : Colors.white70,
                  fontWeight: isLast ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
            const SizedBox(height: 16),
            Text('Failed to load profiles',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(color: Colors.white)),
            const SizedBox(height: 8),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white38, fontSize: 12)),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.tealAccent,
                foregroundColor: Colors.black,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  final VoidCallback onRefresh;

  const _EmptyView({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.folder_off_outlined, color: Colors.white24, size: 56),
          const SizedBox(height: 16),
          const Text('No remote profiles found.',
              style: TextStyle(color: Colors.white54)),
          const SizedBox(height: 8),
          const Text(
            'Create a remote profile in the web app first.',
            style: TextStyle(color: Colors.white24, fontSize: 12),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh, color: Colors.tealAccent),
            label: const Text('Refresh', style: TextStyle(color: Colors.tealAccent)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.tealAccent),
            ),
          ),
        ],
      ),
    );
  }
}
