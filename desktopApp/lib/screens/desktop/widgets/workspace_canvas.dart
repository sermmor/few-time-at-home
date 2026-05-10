import 'package:flutter/material.dart';
import '../../../core/constants.dart';
import '../../../core/models/desktop_config.dart';
import 'sticky_note_widget.dart';
import 'desktop_link_widget.dart';
import 'desktop_image_widget.dart';
import 'desktop_panel_widget.dart';

/// Renders all desktop widgets (panels, images, notes, links) for
/// [workspaceIndex] scaled from the 1920×1080 reference frame to the
/// available screen size.
///
/// All move/resize callbacks receive scaled screen coordinates; this canvas
/// converts them back to reference-frame coordinates before calling the parent.
class WorkspaceCanvas extends StatelessWidget {
  final int           workspaceIndex;
  final DesktopConfig config;
  final String        profileName;

  // ── Link callbacks ────────────────────────────────────────────────────────
  final void Function(String id)?                           onDeleteLink;
  final void Function(String id, String name)?              onRenameLink;
  final void Function(String id, double xRef, double yRef)? onMoveLink;

  // ── Note callbacks ────────────────────────────────────────────────────────
  final void Function(String id, String content)?           onUpdateNoteContent;
  final void Function(String id, double xRef, double yRef)? onMoveNote;
  final void Function(String id)?                           onDeleteNote;
  final void Function(String id, double wRef, double hRef)? onResizeNote;
  final void Function(String id, String? color,
      double fontSize, double alpha)?                       onUpdateNoteSettings;

  // ── Panel callbacks ───────────────────────────────────────────────────────
  final void Function(String id, double xRef, double yRef)? onMovePanel;
  final void Function(String id)?                           onDeletePanel;
  final void Function(String id, double wRef, double hRef)? onResizePanel;

  const WorkspaceCanvas({
    super.key,
    required this.workspaceIndex,
    required this.config,
    required this.profileName,
    this.onDeleteLink,
    this.onRenameLink,
    this.onMoveLink,
    this.onUpdateNoteContent,
    this.onMoveNote,
    this.onDeleteNote,
    this.onResizeNote,
    this.onUpdateNoteSettings,
    this.onMovePanel,
    this.onDeletePanel,
    this.onResizePanel,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final scaleX = constraints.maxWidth  / kRefWidth;
        final scaleY = constraints.maxHeight / kRefHeight;

        double sx(double v) => v * scaleX;
        double sy(double v) => v * scaleY;

        final panels = config.panels
            .where((p) => p.workspaceIndex == workspaceIndex).toList();
        final notes  = config.notes
            .where((n) => n.workspaceIndex == workspaceIndex).toList();
        final images = config.images
            .where((i) => i.workspaceIndex == workspaceIndex).toList();
        final links  = config.links
            .where((l) => l.workspaceIndex == workspaceIndex).toList();

        return Stack(
          children: [
            // Panels (bottom layer)
            for (final p in panels)
              DesktopPanelWidget(
                key:    ValueKey(p.id),
                panel:  p,
                left:   sx(p.x), top:    sy(p.y),
                width:  sx(p.width), height: sy(p.height),
                onMoved: onMovePanel != null
                    ? (sx_, sy_) =>
                        onMovePanel!(p.id, sx_ / scaleX, sy_ / scaleY)
                    : null,
                onDelete: onDeletePanel != null
                    ? () => onDeletePanel!(p.id)
                    : null,
                onResized: onResizePanel != null
                    ? (sw, sh) =>
                        onResizePanel!(p.id, sw / scaleX, sh / scaleY)
                    : null,
              ),

            // Image widgets
            for (final img in images)
              DesktopImageWidget(
                key:         ValueKey(img.id),
                image:       img,
                profileName: profileName,
                left:        sx(img.x), top:    sy(img.y),
                width:       sx(img.width), height: sy(img.height),
              ),

            // Sticky notes
            for (final note in notes)
              StickyNoteWidget(
                key:    ValueKey(note.id),
                note:   note,
                left:   sx(note.x), top:    sy(note.y),
                width:  sx(note.width), height: sy(note.height),
                onMoved: onMoveNote != null
                    ? (sx_, sy_) =>
                        onMoveNote!(note.id, sx_ / scaleX, sy_ / scaleY)
                    : null,
                onContentChanged: onUpdateNoteContent != null
                    ? (content) => onUpdateNoteContent!(note.id, content)
                    : null,
                onDelete: onDeleteNote != null
                    ? () => onDeleteNote!(note.id)
                    : null,
                onResized: onResizeNote != null
                    ? (sw, sh) =>
                        onResizeNote!(note.id, sw / scaleX, sh / scaleY)
                    : null,
                onSettingsChanged: onUpdateNoteSettings != null
                    ? (color, fontSize, alpha) =>
                        onUpdateNoteSettings!(note.id, color, fontSize, alpha)
                    : null,
              ),

            // Links (top layer)
            for (final link in links)
              DesktopLinkWidget(
                key:         ValueKey(link.id),
                link:        link,
                profileName: profileName,
                left:        sx(link.x), top: sy(link.y),
                onDelete:    onDeleteLink != null
                    ? () => onDeleteLink!(link.id)
                    : null,
                onRename:    onRenameLink != null
                    ? (name) => onRenameLink!(link.id, name)
                    : null,
                onMoved:     onMoveLink != null
                    ? (sx_, sy_) =>
                        onMoveLink!(link.id, sx_ / scaleX, sy_ / scaleY)
                    : null,
              ),
          ],
        );
      },
    );
  }
}
