import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/constants.dart';
import '../../../core/models/desktop_config.dart';
import '../../../core/services/asset_cache_service.dart';
import 'desktop_commons.dart';
import 'slide_layer.dart';
import 'workspace_canvas.dart';

/// Normal (non-tablet) free-floating desktop — matches Desktop.tsx.
///
/// Wallpaper fix: paths are cached per workspace index so they survive
/// navigation and are available immediately on return to a visited workspace.
class NormalDesktop extends StatefulWidget {
  final DesktopConfig config;
  final String        profileName;
  final int           activeWs;
  final NavDirection? lastNavDir;
  final bool          overlayVisible;   // Shift held → show grid overlay
  final VoidCallback  onClose;
  final VoidCallback  onPropsOpen;

  // ── Mutation callbacks ────────────────────────────────────────────────────
  final void Function(String id)                       onDeleteLink;
  final void Function(String id, String name)          onRenameLink;
  final void Function(String id, double x, double y)   onMoveLink;

  final void Function(String id, double x, double y)   onMoveNote;
  final void Function(String id, String content)       onUpdateNoteContent;
  final void Function(String id)                       onDeleteNote;
  final void Function(String id, double w, double h)   onResizeNote;

  final void Function(String id, double x, double y)   onMovePanel;
  final void Function(String id)                       onDeletePanel;
  final void Function(String id, double w, double h)   onResizePanel;

  final void Function(double xRef, double yRef)        onAddNote;
  final void Function(double xRef, double yRef)        onAddPanel;
  final void Function(String url, String name,
      double xRef, double yRef)                        onAddLink;

  const NormalDesktop({
    super.key,
    required this.config,
    required this.profileName,
    required this.activeWs,
    required this.lastNavDir,
    required this.overlayVisible,
    required this.onClose,
    required this.onPropsOpen,
    required this.onDeleteLink,
    required this.onRenameLink,
    required this.onMoveLink,
    required this.onMoveNote,
    required this.onUpdateNoteContent,
    required this.onDeleteNote,
    required this.onResizeNote,
    required this.onMovePanel,
    required this.onDeletePanel,
    required this.onResizePanel,
    required this.onAddNote,
    required this.onAddPanel,
    required this.onAddLink,
  });

  @override
  State<NormalDesktop> createState() => _NormalDesktopState();
}

class _NormalDesktopState extends State<NormalDesktop> {
  /// Per-workspace resolved wallpaper paths (never cleared — persists across
  /// navigation so returning to a workspace shows the wallpaper immediately).
  final Map<int, String> _wallpaperPaths = {};
  SlideState? _slide;

  @override
  void initState() {
    super.initState();
    _loadWallpaper(widget.activeWs);
  }

  @override
  void didUpdateWidget(covariant NormalDesktop old) {
    super.didUpdateWidget(old);
    if (old.activeWs != widget.activeWs) {
      final dir = widget.lastNavDir ??
          getDirection(old.activeWs, widget.activeWs, widget.config.cols);
      setState(() {
        _slide = SlideState(
          key:           DateTime.now().millisecondsSinceEpoch,
          color:         wsColor(old.activeWs),
          wallpaperPath: _wallpaperPaths[old.activeWs], // use cached path
          dir:           dir,
        );
      });
      _loadWallpaper(widget.activeWs);
    }
  }

  Future<void> _loadWallpaper(int wsIndex) async {
    if (_wallpaperPaths.containsKey(wsIndex)) return; // already cached
    final wallpapers = widget.config.wallpapers;
    if (wsIndex >= wallpapers.length || wallpapers[wsIndex].isEmpty) return;
    final path = await AssetCacheService.instance.resolveAsset(
        widget.profileName, wallpapers[wsIndex]);
    if (mounted && path != null) {
      setState(() => _wallpaperPaths[wsIndex] = path);
    }
  }

  // ── Context menu ──────────────────────────────────────────────────────────

  void _showContextMenu(BuildContext context, Offset globalPos) {
    final size = MediaQuery.of(context).size;
    // Convert screen position to 1920×1080 reference frame
    final xRef = globalPos.dx * kRefWidth  / size.width;
    final yRef = globalPos.dy * kRefHeight / size.height;

    showMenu<String>(
      context: context,
      position: RelativeRect.fromLTRB(
          globalPos.dx, globalPos.dy,
          size.width  - globalPos.dx,
          size.height - globalPos.dy),
      items: [
        const PopupMenuItem(value: 'note',   child: Text('Añadir nota')),
        const PopupMenuItem(value: 'link',   child: Text('Añadir enlace')),
        const PopupMenuItem(value: 'panel',  child: Text('Añadir panel')),
        const PopupMenuDivider(),
        const PopupMenuItem(value: 'props',  child: Text('Propiedades')),
      ],
    ).then((value) async {
      switch (value) {
        case 'note':
          widget.onAddNote(xRef, yRef);
        case 'link':
          if (mounted) await _showAddLinkDialog(context, xRef, yRef);
        case 'panel':
          widget.onAddPanel(xRef, yRef);
        case 'props':
          widget.onPropsOpen();
      }
    });
  }

  Future<void> _showAddLinkDialog(
      BuildContext context, double xRef, double yRef) async {
    final urlCtrl  = TextEditingController();
    final nameCtrl = TextEditingController();
    final result   = await showDialog<bool>(
      context: context,
      builder: (_) => _AddLinkDialog(urlCtrl: urlCtrl, nameCtrl: nameCtrl),
    );
    if (result == true && urlCtrl.text.trim().isNotEmpty) {
      widget.onAddLink(
        urlCtrl.text.trim(),
        nameCtrl.text.trim(),
        xRef, yRef,
      );
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final bg          = wsColor(widget.activeWs);
    final wallpaper   = _wallpaperPaths[widget.activeWs];

    return Stack(
      children: [
        // ── 1. Background wallpaper / colour ─────────────────────────────
        Positioned.fill(
          child: wallpaper != null
              ? Image.file(File(wallpaper), fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(color: bg))
              : Container(color: bg),
        ),

        // ── 2. Slide-out animation (outgoing workspace) ───────────────────
        if (_slide != null)
          SlideLayer(
            key:           ValueKey(_slide!.key),
            color:         _slide!.color,
            wallpaperPath: _slide!.wallpaperPath,
            dir:           _slide!.dir,
            onComplete:    () => setState(() => _slide = null),
          ),

        // ── 3. Transparent gesture catcher (right-click context menu) ─────
        // Must be BELOW WorkspaceCanvas so widget right-clicks are NOT
        // intercepted here — widgets on top win the hit test first.
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onSecondaryTapDown: (d) =>
                _showContextMenu(context, d.globalPosition),
          ),
        ),

        // ── 4. Desktop widgets (on top of background catcher) ────────────
        Positioned.fill(
          child: WorkspaceCanvas(
            workspaceIndex:      widget.activeWs,
            config:              widget.config,
            profileName:         widget.profileName,
            onDeleteLink:        widget.onDeleteLink,
            onRenameLink:        widget.onRenameLink,
            onMoveLink:          widget.onMoveLink,
            onMoveNote:          widget.onMoveNote,
            onUpdateNoteContent: widget.onUpdateNoteContent,
            onDeleteNote:        widget.onDeleteNote,
            onResizeNote:        widget.onResizeNote,
            onMovePanel:         widget.onMovePanel,
            onDeletePanel:       widget.onDeletePanel,
            onResizePanel:       widget.onResizePanel,
          ),
        ),

        // ── 5. Workspace grid overlay (Shift held) ────────────────────────
        WorkspaceOverlay(
          activeWs: widget.activeWs,
          rows:     widget.config.rows,
          cols:     widget.config.cols,
          visible:  widget.overlayVisible,
        ),

        // ── 6. Close button (top-right) ───────────────────────────────────
        Positioned(
          top: 12, right: 12,
          child: _CloseButton(onPressed: widget.onClose),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _CloseButton extends StatefulWidget {
  final VoidCallback onPressed;
  const _CloseButton({required this.onPressed});
  @override
  State<_CloseButton> createState() => _CloseButtonState();
}

class _CloseButtonState extends State<_CloseButton> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) => MouseRegion(
    onEnter: (_) => setState(() => _hovered = true),
    onExit:  (_) => setState(() => _hovered = false),
    child: GestureDetector(
      onTap: widget.onPressed,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        width: 36, height: 36,
        decoration: BoxDecoration(
          color:  _hovered
              ? Colors.white.withOpacity(0.25)
              : Colors.black.withOpacity(0.35),
          shape:  BoxShape.circle,
          border: Border.all(color: Colors.white.withOpacity(0.3)),
        ),
        child: const Icon(Icons.close, color: Colors.white, size: 18),
      ),
    ),
  );
}

class _AddLinkDialog extends StatelessWidget {
  final TextEditingController urlCtrl;
  final TextEditingController nameCtrl;
  const _AddLinkDialog({required this.urlCtrl, required this.nameCtrl});

  @override
  Widget build(BuildContext context) => AlertDialog(
    backgroundColor: const Color(0xFF1E1E1E),
    title: const Text('Añadir enlace', style: TextStyle(color: Colors.white)),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller: urlCtrl,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            labelText: 'URL',
            hintText: 'https://…',
            labelStyle: TextStyle(color: Colors.white54),
            hintStyle:  TextStyle(color: Colors.white24),
            enabledBorder: UnderlineInputBorder(
                borderSide: BorderSide(color: Colors.white24)),
            focusedBorder: UnderlineInputBorder(
                borderSide: BorderSide(color: Colors.tealAccent)),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: nameCtrl,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            labelText: 'Nombre (opcional)',
            labelStyle: TextStyle(color: Colors.white54),
            enabledBorder: UnderlineInputBorder(
                borderSide: BorderSide(color: Colors.white24)),
            focusedBorder: UnderlineInputBorder(
                borderSide: BorderSide(color: Colors.tealAccent)),
          ),
        ),
      ],
    ),
    actions: [
      TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancelar',
              style: TextStyle(color: Colors.white54))),
      FilledButton(
        onPressed: () => Navigator.of(context).pop(true),
        style: FilledButton.styleFrom(
            backgroundColor: Colors.tealAccent,
            foregroundColor: Colors.black),
        child: const Text('Añadir'),
      ),
    ],
  );
}
