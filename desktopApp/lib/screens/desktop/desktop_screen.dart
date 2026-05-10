import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/models/desktop_config.dart';
import '../../core/services/drive_service.dart';
import 'widgets/desktop_commons.dart';
import 'widgets/normal_desktop.dart';
import 'widgets/tablet_desktop.dart';

/// Top-level desktop screen.
///
/// Owns:  config loading/saving, activeWs, keyboard navigation, Shift overlay.
/// Delegates rendering to [NormalDesktop] or [TabletDesktop] based on tabletMode.
class DesktopScreen extends StatefulWidget {
  final ProfileMeta profile;
  const DesktopScreen({super.key, required this.profile});

  @override
  State<DesktopScreen> createState() => _DesktopScreenState();
}

class _DesktopScreenState extends State<DesktopScreen> {
  // ── Config state ──────────────────────────────────────────────────────────
  bool           _loading = true;
  String?        _error;
  DesktopConfig? _config;

  // ── Navigation state ──────────────────────────────────────────────────────
  int            _activeWs    = 0;
  NavDirection?  _lastNavDir;
  bool           _shiftHeld   = false;

  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

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

  Future<void> _saveAndPop() async {
    if (_config == null) { Navigator.of(context).pop(); return; }
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const _SavingDialog(),
    );
    try {
      await DriveService.instance.uploadProfile(widget.profile.name, _config!);
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Error al guardar: $e'),
          backgroundColor: Colors.redAccent,
        ));
      }
      return;
    }
    if (mounted) {
      Navigator.of(context).pop(); // saving dialog
      Navigator.of(context).pop(); // return to profile selection
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /// Mirrors the ArrowKey logic in Desktop.tsx (with circular wrap).
  void _navigate(NavDirection dir) {
    final cfg  = _config;
    if (cfg == null) return;
    final cols = cfg.cols;
    final rows = cfg.rows;
    final cur  = _activeWs;
    final col  = cur % cols;
    final row  = cur ~/ cols;

    int next = cur;
    switch (dir) {
      case NavDirection.right:
        next = col < cols - 1 ? cur + 1 : cur - (cols - 1);
      case NavDirection.left:
        next = col > 0 ? cur - 1 : cur + (cols - 1);
      case NavDirection.down:
        next = row < rows - 1 ? cur + cols : cur - cols * (rows - 1);
      case NavDirection.up:
        next = row > 0 ? cur - cols : cur + cols * (rows - 1);
    }
    if (next == cur) return;

    setState(() {
      _lastNavDir = dir;
      _activeWs   = next;
    });
  }

  // ── Config mutations ──────────────────────────────────────────────────────

  DesktopLink _patchLink(DesktopLink l, {
    String? name, String? favicon, double? x, double? y,
  }) => DesktopLink(
    id: l.id, workspaceIndex: l.workspaceIndex,
    x: x ?? l.x, y: y ?? l.y,
    url: l.url,
    name:    name    ?? l.name,
    favicon: favicon ?? l.favicon,
  );

  void _deleteLink(String id) => setState(() {
    _config = _config!.copyWith(
      links: _config!.links.where((l) => l.id != id).toList(),
    );
  });

  void _renameLink(String id, String name) => setState(() {
    _config = _config!.copyWith(
      links: _config!.links
          .map((l) => l.id == id ? _patchLink(l, name: name) : l)
          .toList(),
    );
  });

  void _moveLink(String id, double xRef, double yRef) => setState(() {
    _config = _config!.copyWith(
      links: _config!.links
          .map((l) => l.id == id ? _patchLink(l, x: xRef, y: yRef) : l)
          .toList(),
    );
  });

  /// Called by tablet mode after favicon/title unfurl completes.
  /// Finds the link by URL (most recent match) and patches it.
  void _enrichLink(String url, String? faviconName, String? title) {
    final links = _config!.links.toList();
    // Find last added link with this URL
    final idx = links.lastIndexWhere((l) => l.url == url);
    if (idx < 0) return;
    final old = links[idx];
    links[idx] = _patchLink(
      old,
      favicon: faviconName ?? old.favicon,
      name: (title != null && old.name == url) ? title : old.name,
    );
    setState(() => _config = _config!.copyWith(links: links));
  }

  void _addLink(String url, String name,
      [double xRef = 60, double yRef = 60]) {
    final link = DesktopLink(
      id:             'link-${DateTime.now().millisecondsSinceEpoch}',
      workspaceIndex: _activeWs,
      x: xRef, y: yRef,
      url:  url,
      name: name.isNotEmpty ? name : url,
    );
    setState(() => _config = _config!.copyWith(
      links: [..._config!.links, link],
    ));
  }

  void _addNote(double xRef, double yRef) {
    final note = StickyNote(
      id:             'note-${DateTime.now().millisecondsSinceEpoch}',
      workspaceIndex: _activeWs,
      x: xRef, y: yRef,
      width: 220, height: 180,
      content: '',
    );
    setState(() => _config = _config!.copyWith(
      notes: [..._config!.notes, note],
    ));
  }

  void _addPanel(double xRef, double yRef) {
    final panel = DesktopPanel(
      id:             'panel-${DateTime.now().millisecondsSinceEpoch}',
      workspaceIndex: _activeWs,
      x: xRef, y: yRef,
      width: 200, height: 150,
    );
    setState(() => _config = _config!.copyWith(
      panels: [..._config!.panels, panel],
    ));
  }

  void _moveNote(String id, double xRef, double yRef) => setState(() {
    _config = _config!.copyWith(
      notes: _config!.notes.map((n) => n.id == id
          ? StickyNote(
              id: n.id, workspaceIndex: n.workspaceIndex,
              x: xRef, y: yRef,
              width: n.width, height: n.height,
              content: n.content, color: n.color,
              fontSize: n.fontSize, alpha: n.alpha)
          : n).toList(),
    );
  });

  void _updateNoteContent(String id, String content) => setState(() {
    _config = _config!.copyWith(
      notes: _config!.notes.map((n) => n.id == id
          ? StickyNote(
              id: n.id, workspaceIndex: n.workspaceIndex,
              x: n.x, y: n.y,
              width: n.width, height: n.height,
              content: content, color: n.color,
              fontSize: n.fontSize, alpha: n.alpha)
          : n).toList(),
    );
  });

  void _updateNoteSettings(
      String id, String? color, double fontSize, double alpha) =>
      setState(() {
        _config = _config!.copyWith(
          notes: _config!.notes.map((n) => n.id == id
              ? StickyNote(
                  id: n.id, workspaceIndex: n.workspaceIndex,
                  x: n.x, y: n.y,
                  width: n.width, height: n.height,
                  content: n.content,
                  color: color, fontSize: fontSize, alpha: alpha)
              : n).toList(),
        );
      });

  void _movePanel(String id, double xRef, double yRef) => setState(() {
    _config = _config!.copyWith(
      panels: _config!.panels.map((p) => p.id == id
          ? DesktopPanel(
              id: p.id, workspaceIndex: p.workspaceIndex,
              x: xRef, y: yRef,
              width: p.width, height: p.height)
          : p).toList(),
    );
  });

  void _deleteNote(String id) => setState(() {
    _config = _config!.copyWith(
      notes: _config!.notes.where((n) => n.id != id).toList(),
    );
  });

  void _resizeNote(String id, double wRef, double hRef) => setState(() {
    _config = _config!.copyWith(
      notes: _config!.notes
          .map((n) => n.id == id ? n.copyWith(width: wRef, height: hRef) : n)
          .toList(),
    );
  });

  void _deletePanel(String id) => setState(() {
    _config = _config!.copyWith(
      panels: _config!.panels.where((p) => p.id != id).toList(),
    );
  });

  void _resizePanel(String id, double wRef, double hRef) => setState(() {
    _config = _config!.copyWith(
      panels: _config!.panels.map((p) => p.id == id
          ? DesktopPanel(
              id: p.id, workspaceIndex: p.workspaceIndex,
              x: p.x, y: p.y,
              width: wRef, height: hRef)
          : p).toList(),
    );
  });

  // ── Keyboard handler ──────────────────────────────────────────────────────

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    final key = event.logicalKey;
    final isShift = key == LogicalKeyboardKey.shiftLeft ||
                    key == LogicalKeyboardKey.shiftRight;

    if (event is KeyDownEvent) {
      if (isShift) {
        setState(() => _shiftHeld = true);
        return KeyEventResult.ignored;
      }
      if (key == LogicalKeyboardKey.escape) {
        _saveAndPop();
        return KeyEventResult.handled;
      }
      if (_shiftHeld) {
        switch (key) {
          case LogicalKeyboardKey.arrowRight:
            _navigate(NavDirection.right); return KeyEventResult.handled;
          case LogicalKeyboardKey.arrowLeft:
            _navigate(NavDirection.left);  return KeyEventResult.handled;
          case LogicalKeyboardKey.arrowDown:
            _navigate(NavDirection.down);  return KeyEventResult.handled;
          case LogicalKeyboardKey.arrowUp:
            _navigate(NavDirection.up);    return KeyEventResult.handled;
        }
      }
    }

    if (event is KeyUpEvent && isShift) {
      setState(() => _shiftHeld = false);
    }

    return KeyEventResult.ignored;
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFF121212),
        body: Center(child: CircularProgressIndicator(color: Colors.tealAccent)),
      );
    }
    if (_error != null) {
      return Scaffold(
        backgroundColor: const Color(0xFF121212),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: Colors.white54)),
              const SizedBox(height: 24),
              Row(mainAxisSize: MainAxisSize.min, children: [
                OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white24)),
                  child: const Text('Volver',
                      style: TextStyle(color: Colors.white54)),
                ),
                const SizedBox(width: 16),
                FilledButton(
                  onPressed: _load,
                  style: FilledButton.styleFrom(
                      backgroundColor: Colors.tealAccent,
                      foregroundColor: Colors.black),
                  child: const Text('Reintentar'),
                ),
              ]),
            ],
          ),
        ),
      );
    }

    final config = _config!;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) { if (!didPop) _saveAndPop(); },
      child: Focus(
        focusNode: _focusNode,
        autofocus: true,
        onKeyEvent: _onKey,
        child: Scaffold(
          body: config.tabletMode
              ? TabletDesktop(
                  config:      config,
                  profileName: widget.profile.name,
                  activeWs:    _activeWs,
                  lastNavDir:  _lastNavDir,
                  overlayVisible: _shiftHeld,
                  onClose:     _saveAndPop,
                  onPropsOpen: () => _showPropertiesDialog(context),
                  onNavigate:  _navigate,
                  onDeleteLink: _deleteLink,
                  onRenameLink: _renameLink,
                  onAddLink:   _addLink,
                  onLinkEnriched: _enrichLink,
                )
              : NormalDesktop(
                  config:      config,
                  profileName: widget.profile.name,
                  activeWs:    _activeWs,
                  lastNavDir:  _lastNavDir,
                  overlayVisible: _shiftHeld,
                  onClose:     _saveAndPop,
                  onPropsOpen: () => _showPropertiesDialog(context),
                  onDeleteLink:        _deleteLink,
                  onRenameLink:        _renameLink,
                  onMoveLink:          _moveLink,
                  onMoveNote:          _moveNote,
                  onUpdateNoteContent: _updateNoteContent,
                  onDeleteNote:        _deleteNote,
                  onResizeNote:        _resizeNote,
                  onUpdateNoteSettings: _updateNoteSettings,
                  onMovePanel:         _movePanel,
                  onDeletePanel:       _deletePanel,
                  onResizePanel:       _resizePanel,
                  onAddNote:           _addNote,
                  onAddPanel:          _addPanel,
                  onAddLink:           (url, name, xRef, yRef) =>
                      _addLink(url, name, xRef, yRef),
                ),
        ),
      ),
    );
  }

  // ── Properties dialog (read-only info) ────────────────────────────────────

  void _showPropertiesDialog(BuildContext context) {
    final cfg = _config!;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: Row(children: [
          const Icon(Icons.info_outline, color: Colors.tealAccent, size: 22),
          const SizedBox(width: 10),
          const Text('Propiedades', style: TextStyle(color: Colors.white)),
        ]),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _PropRow('Perfil',      widget.profile.name),
            _PropRow('Cuadrícula',  '${cfg.rows} filas × ${cfg.cols} columnas'),
            _PropRow('Escritorios', '${cfg.workspaceCount}'),
            _PropRow('Modo tablet', cfg.tabletMode ? 'Sí' : 'No'),
            const Divider(color: Colors.white12, height: 24),
            _PropRow('Notas',       '${cfg.notes.length}'),
            _PropRow('Imágenes',    '${cfg.images.length}'),
            _PropRow('Paneles',     '${cfg.panels.length}'),
            _PropRow('Enlaces',     '${cfg.links.length}'),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            style: FilledButton.styleFrom(
                backgroundColor: Colors.tealAccent, foregroundColor: Colors.black),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _PropRow extends StatelessWidget {
  final String label, value;
  const _PropRow(this.label, this.value);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      children: [
        SizedBox(
          width: 100,
          child: Text(label,
              style: const TextStyle(color: Colors.white54, fontSize: 13)),
        ),
        Text(value,
            style: const TextStyle(color: Colors.white, fontSize: 13)),
      ],
    ),
  );
}

class _SavingDialog extends StatelessWidget {
  const _SavingDialog();
  @override
  Widget build(BuildContext context) => const AlertDialog(
    backgroundColor: Color(0xFF1E1E1E),
    content: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(width: 24, height: 24,
            child: CircularProgressIndicator(
                strokeWidth: 2, color: Colors.tealAccent)),
        SizedBox(width: 16),
        Text('Guardando en Google Drive…',
            style: TextStyle(color: Colors.white70)),
      ],
    ),
  );
}
