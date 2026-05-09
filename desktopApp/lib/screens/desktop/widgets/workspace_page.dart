import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/constants.dart';
import '../../../core/models/desktop_config.dart';
import '../../../core/services/asset_cache_service.dart';
import 'sticky_note_widget.dart';
import 'desktop_link_widget.dart';
import 'desktop_image_widget.dart';
import 'desktop_panel_widget.dart';

/// A single workspace "page" — renders the wallpaper, panels, notes, images
/// and links for workspace at [index].
///
/// All coordinates from [DesktopConfig] are in the 1920×1080 reference frame.
/// This widget scales them to the actual screen size via a [FittedBox] / stack.
class WorkspacePage extends StatefulWidget {
  final int         index;
  final DesktopConfig config;
  final String      profileName;

  const WorkspacePage({
    super.key,
    required this.index,
    required this.config,
    required this.profileName,
  });

  @override
  State<WorkspacePage> createState() => _WorkspacePageState();
}

class _WorkspacePageState extends State<WorkspacePage>
    with AutomaticKeepAliveClientMixin {
  String? _wallpaperPath;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadWallpaper();
  }

  Future<void> _loadWallpaper() async {
    final wallpapers = widget.config.wallpapers;
    if (widget.index >= wallpapers.length) return;
    final cloudPath = wallpapers[widget.index];
    if (cloudPath.isEmpty) return;
    final path = await AssetCacheService.instance.resolveAsset(
      widget.profileName,
      cloudPath,
    );
    if (mounted) setState(() => _wallpaperPath = path);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final scaleX = constraints.maxWidth  / kRefWidth;
        final scaleY = constraints.maxHeight / kRefHeight;

        // Helpers to scale a reference-frame value
        double sx(double v) => v * scaleX;
        double sy(double v) => v * scaleY;

        final panels = widget.config.panels
            .where((p) => p.workspaceIndex == widget.index)
            .toList();
        final notes = widget.config.notes
            .where((n) => n.workspaceIndex == widget.index)
            .toList();
        final images = widget.config.images
            .where((i) => i.workspaceIndex == widget.index)
            .toList();
        final links = widget.config.links
            .where((l) => l.workspaceIndex == widget.index)
            .toList();

        return Stack(
          children: [
            // ── Wallpaper ─────────────────────────────────────────────────
            Positioned.fill(
              child: _wallpaperPath != null
                  ? Image.file(
                      File(_wallpaperPath!),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const _DefaultBg(),
                    )
                  : const _DefaultBg(),
            ),

            // ── Panels ────────────────────────────────────────────────────
            for (final p in panels)
              DesktopPanelWidget(
                panel:  p,
                left:   sx(p.x),
                top:    sy(p.y),
                width:  sx(p.width),
                height: sy(p.height),
              ),

            // ── Image widgets ─────────────────────────────────────────────
            for (final img in images)
              DesktopImageWidget(
                image:       img,
                profileName: widget.profileName,
                left:        sx(img.x),
                top:         sy(img.y),
                width:       sx(img.width),
                height:      sy(img.height),
              ),

            // ── Sticky notes ──────────────────────────────────────────────
            for (final note in notes)
              StickyNoteWidget(
                note:   note,
                left:   sx(note.x),
                top:    sy(note.y),
                width:  sx(note.width),
                height: sy(note.height),
              ),

            // ── Links ─────────────────────────────────────────────────────
            for (final link in links)
              DesktopLinkWidget(
                link:        link,
                profileName: widget.profileName,
                left:        sx(link.x),
                top:         sy(link.y),
              ),
          ],
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _DefaultBg extends StatelessWidget {
  const _DefaultBg();
  @override
  Widget build(BuildContext context) => Container(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end:   Alignment.bottomRight,
        colors: [Color(0xFF1A1A2E), Color(0xFF16213E), Color(0xFF0F3460)],
      ),
    ),
  );
}
