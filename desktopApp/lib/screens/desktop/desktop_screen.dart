import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/models/desktop_config.dart';
import '../../core/services/drive_service.dart';
import 'widgets/workspace_page.dart';

/// Main desktop screen.
///
/// Loads the [DesktopConfig] for [profile] from Google Drive, then displays
/// a full-screen grid of workspaces navigable by page indicators (or keyboard
/// arrow keys on desktop).
///
/// On back / close → pushes the updated config back to GDrive.
class DesktopScreen extends StatefulWidget {
  final ProfileMeta profile;

  const DesktopScreen({super.key, required this.profile});

  @override
  State<DesktopScreen> createState() => _DesktopScreenState();
}

class _DesktopScreenState extends State<DesktopScreen> {
  bool          _loading  = true;
  String?       _error;
  DesktopConfig? _config;

  late PageController _pageCtrl;
  int _currentPage = 0;
  bool _overlayVisible = false;

  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _pageCtrl = PageController();
    _load();
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final config = await DriveService.instance.downloadProfile(widget.profile.name);
      setState(() {
        _config  = config ?? DesktopConfig.empty();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  // ── Save & close ──────────────────────────────────────────────────────────

  Future<void> _saveAndPop() async {
    if (_config == null) {
      Navigator.of(context).pop();
      return;
    }
    // Show saving indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const _SavingDialog(),
    );
    try {
      await DriveService.instance.uploadProfile(widget.profile.name, _config!);
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // close saving dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
      return;
    }
    if (mounted) {
      Navigator.of(context).pop(); // close saving dialog
      Navigator.of(context).pop(); // return to profile selection
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  void _goToPage(int index) {
    if (_config == null) return;
    final total = _config!.workspaceCount;
    if (index < 0 || index >= total) return;
    _pageCtrl.animateToPage(
      index,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _toggleOverlay() => setState(() => _overlayVisible = !_overlayVisible);

  // ── Keyboard handler ─────────────────────────────────────────────────────

  KeyEventResult _onKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;
    final key = event.logicalKey;

    if (key == LogicalKeyboardKey.arrowRight || key == LogicalKeyboardKey.arrowDown) {
      _goToPage(_currentPage + 1);
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowLeft || key == LogicalKeyboardKey.arrowUp) {
      _goToPage(_currentPage - 1);
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.escape) {
      _saveAndPop();
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_loading) return const _LoadingScreen();
    if (_error != null) {
      return _ErrorScreen(
        message: _error!,
        onRetry: _load,
        onBack:  () => Navigator.of(context).pop(),
      );
    }

    final config = _config!;
    final total  = config.workspaceCount;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _saveAndPop();
      },
      child: KeyboardListener(
        focusNode: _focusNode,
        autofocus: true,
        onKeyEvent: (e) => _onKey(_focusNode, e),
        child: Scaffold(
          body: GestureDetector(
            // Single tap on desktop → toggle overlay
            onTap: _toggleOverlay,
            child: Stack(
              children: [
                // ── Workspace pages ────────────────────────────────────────
                PageView.builder(
                  controller: _pageCtrl,
                  itemCount:  total,
                  onPageChanged: (i) => setState(() => _currentPage = i),
                  itemBuilder: (_, i) => WorkspacePage(
                    index:       i,
                    config:      config,
                    profileName: widget.profile.name,
                  ),
                ),

                // ── HUD overlay (page indicators + close button) ───────────
                AnimatedOpacity(
                  opacity:  _overlayVisible ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: IgnorePointer(
                    ignoring: !_overlayVisible,
                    child: _Hud(
                      profileName: widget.profile.name,
                      currentPage: _currentPage,
                      totalPages:  total,
                      rows:        config.rows,
                      cols:        config.cols,
                      onGoToPage:  _goToPage,
                      onClose:     _saveAndPop,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD overlay
// ─────────────────────────────────────────────────────────────────────────────

class _Hud extends StatelessWidget {
  final String   profileName;
  final int      currentPage;
  final int      totalPages;
  final int      rows, cols;
  final void Function(int) onGoToPage;
  final VoidCallback onClose;

  const _Hud({
    required this.profileName,
    required this.currentPage,
    required this.totalPages,
    required this.rows,
    required this.cols,
    required this.onGoToPage,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Semi-transparent top bar
        Positioned(
          top: 0, left: 0, right: 0,
          child: Container(
            color: Colors.black.withOpacity(0.6),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Row(
              children: [
                const Icon(Icons.desktop_windows_rounded,
                    color: Colors.tealAccent, size: 20),
                const SizedBox(width: 10),
                Text(profileName,
                    style: const TextStyle(color: Colors.white70, fontSize: 14)),
                const Spacer(),
                TextButton.icon(
                  onPressed: onClose,
                  icon: const Icon(Icons.close, size: 18, color: Colors.white60),
                  label: const Text('Close', style: TextStyle(color: Colors.white60)),
                ),
              ],
            ),
          ),
        ),

        // Grid page indicators at the bottom
        Positioned(
          bottom: 20, left: 0, right: 0,
          child: Center(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (int r = 0; r < rows; r++)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          for (int c = 0; c < cols; c++)
                            _PageDot(
                              index:    r * cols + c,
                              isActive: r * cols + c == currentPage,
                              onTap:    onGoToPage,
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _PageDot extends StatelessWidget {
  final int  index;
  final bool isActive;
  final void Function(int) onTap;

  const _PageDot({required this.index, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onTap(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.all(4),
        width:  isActive ? 14 : 10,
        height: isActive ? 14 : 10,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isActive ? Colors.tealAccent : Colors.white30,
          boxShadow: isActive
              ? [const BoxShadow(color: Colors.tealAccent, blurRadius: 6)]
              : null,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auxiliary screens
// ─────────────────────────────────────────────────────────────────────────────

class _LoadingScreen extends StatelessWidget {
  const _LoadingScreen();
  @override
  Widget build(BuildContext context) => const Scaffold(
    backgroundColor: Color(0xFF121212),
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(color: Colors.tealAccent),
          SizedBox(height: 20),
          Text('Loading profile…',
              style: TextStyle(color: Colors.white54)),
        ],
      ),
    ),
  );
}

class _ErrorScreen extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  final VoidCallback onBack;

  const _ErrorScreen({
    required this.message,
    required this.onRetry,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
              const SizedBox(height: 16),
              const Text('Failed to load profile',
                  style: TextStyle(color: Colors.white, fontSize: 18)),
              const SizedBox(height: 8),
              Text(message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white38, fontSize: 12)),
              const SizedBox(height: 24),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  OutlinedButton.icon(
                    onPressed: onBack,
                    icon: const Icon(Icons.arrow_back, color: Colors.white54),
                    label: const Text('Back', style: TextStyle(color: Colors.white54)),
                    style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.white24)),
                  ),
                  const SizedBox(width: 16),
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
            ],
          ),
        ),
      ),
    );
  }
}

class _SavingDialog extends StatelessWidget {
  const _SavingDialog();
  @override
  Widget build(BuildContext context) => const AlertDialog(
    backgroundColor: Color(0xFF1E1E1E),
    content: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 24, height: 24,
          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.tealAccent),
        ),
        SizedBox(width: 16),
        Text('Saving to Google Drive…',
            style: TextStyle(color: Colors.white70)),
      ],
    ),
  );
}
