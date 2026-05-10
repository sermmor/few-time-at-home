import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/models/desktop_config.dart';
import '../../../core/services/asset_cache_service.dart';

/// Free-floating link icon for the normal (non-tablet) desktop canvas.
/// Matches DesktopLinkWidget.tsx: 76 px wide, 52 px icon box with blue tint,
/// draggable, right-click / long-press context menu.
class DesktopLinkWidget extends StatefulWidget {
  final DesktopLink   link;
  final String        profileName;
  final double        left;   // pre-scaled (screen) position
  final double        top;
  final VoidCallback? onDelete;
  final void Function(String name)?         onRename;
  /// Called with NEW scaled (x, y) after the user drags the link.
  final void Function(double x, double y)?  onMoved;

  const DesktopLinkWidget({
    super.key,
    required this.link,
    required this.profileName,
    required this.left,
    required this.top,
    this.onDelete,
    this.onRename,
    this.onMoved,
  });

  @override
  State<DesktopLinkWidget> createState() => _DesktopLinkWidgetState();
}

class _DesktopLinkWidgetState extends State<DesktopLinkWidget> {
  String? _faviconPath;
  late double _x;
  late double _y;

  @override
  void initState() {
    super.initState();
    _x = widget.left;
    _y = widget.top;
    if (widget.link.favicon?.isNotEmpty ?? false) _resolveFavicon();
  }

  @override
  void didUpdateWidget(covariant DesktopLinkWidget old) {
    super.didUpdateWidget(old);
    if (old.left != widget.left || old.top != widget.top) {
      _x = widget.left;
      _y = widget.top;
    }
    if (old.link.id != widget.link.id ||
        old.link.favicon != widget.link.favicon) {
      _faviconPath = null;
      if (widget.link.favicon?.isNotEmpty ?? false) _resolveFavicon();
    }
  }

  Future<void> _resolveFavicon() async {
    final path = await AssetCacheService.instance.resolveFavicon(
      widget.profileName, widget.link.favicon!,
    );
    if (mounted) setState(() => _faviconPath = path);
  }

  Future<void> _launch() async {
    final uri = Uri.tryParse(widget.link.url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showContextMenu(BuildContext context, Offset pos) {
    final size = MediaQuery.of(context).size;
    showMenu<String>(
      context: context,
      position: RelativeRect.fromLTRB(
          pos.dx, pos.dy, size.width - pos.dx, size.height - pos.dy),
      items: [
        const PopupMenuItem(value: 'copy',
            child: _MenuRow(Icons.content_copy, 'Copiar enlace')),
        const PopupMenuItem(value: 'open',
            child: _MenuRow(Icons.open_in_new, 'Abrir')),
        if (widget.onRename != null)
          const PopupMenuItem(value: 'edit',
              child: _MenuRow(Icons.edit, 'Editar nombre')),
        if (widget.onDelete != null)
          const PopupMenuItem(value: 'delete',
              child: _MenuRow(Icons.delete_outline, 'Borrar',
                  color: Colors.redAccent)),
      ],
    ).then((value) async {
      switch (value) {
        case 'copy':
          await Clipboard.setData(ClipboardData(text: widget.link.url));
        case 'open':
          await _launch();
        case 'edit':
          if (mounted) _showRenameDialog(context);
        case 'delete':
          widget.onDelete?.call();
      }
    });
  }

  Future<void> _showRenameDialog(BuildContext context) async {
    final ctrl   = TextEditingController(text: widget.link.name);
    final result = await showDialog<String>(
      context: context,
      builder: (_) => _RenameDialog(ctrl: ctrl),
    );
    if (result != null) widget.onRename?.call(result);
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: _x, top: _y,
      child: GestureDetector(
        // Tap → open URL   (gesture arena distinguishes tap from pan automatically)
        onTap: _launch,
        // Pan → drag
        onPanUpdate: (d) => setState(() {
          _x += d.delta.dx;
          _y += d.delta.dy;
        }),
        onPanEnd: (_) => widget.onMoved?.call(_x, _y),
        // Right-click → context menu
        onSecondaryTapDown: (d) =>
            _showContextMenu(context, d.globalPosition),
        child: SizedBox(
          width: 76,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icon box
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(
                  color: const Color(0x2F3B82F6),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0x733B82F6), width: 1.5),
                  boxShadow: const [BoxShadow(
                      blurRadius: 8, color: Color(0x59000000))],
                ),
                clipBehavior: Clip.hardEdge,
                child: _faviconPath != null
                    ? Image.file(File(_faviconPath!), fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const _DefaultIcon())
                    : const _DefaultIcon(),
              ),
              const SizedBox(height: 5),
              Text(
                widget.link.name.isNotEmpty
                    ? widget.link.name
                    : widget.link.url,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.white,
                  shadows: [
                    Shadow(blurRadius: 3, color: Color(0xD9000000)),
                    Shadow(blurRadius: 6, color: Color(0x99000000)),
                  ],
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

class _DefaultIcon extends StatelessWidget {
  const _DefaultIcon();
  @override
  Widget build(BuildContext context) =>
      const Icon(Icons.language, color: Color(0xFF3B82F6), size: 28);
}

class _MenuRow extends StatelessWidget {
  final IconData icon;
  final String   label;
  final Color?   color;
  const _MenuRow(this.icon, this.label, {this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? Colors.white70;
    return Row(children: [
      Icon(icon, size: 18, color: c),
      const SizedBox(width: 10),
      Text(label, style: TextStyle(color: c)),
    ]);
  }
}

class _RenameDialog extends StatelessWidget {
  final TextEditingController ctrl;
  const _RenameDialog({required this.ctrl});

  @override
  Widget build(BuildContext context) => AlertDialog(
    backgroundColor: const Color(0xFF1E1E1E),
    title: const Text('Editar nombre', style: TextStyle(color: Colors.white)),
    content: TextField(
      controller: ctrl,
      autofocus: true,
      style: const TextStyle(color: Colors.white),
      decoration: const InputDecoration(
        labelText: 'Nombre',
        labelStyle: TextStyle(color: Colors.white54),
        enabledBorder: UnderlineInputBorder(
            borderSide: BorderSide(color: Colors.white24)),
        focusedBorder: UnderlineInputBorder(
            borderSide: BorderSide(color: Colors.tealAccent)),
      ),
      onSubmitted: (_) => Navigator.of(context).pop(ctrl.text.trim()),
    ),
    actions: [
      TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar',
              style: TextStyle(color: Colors.white54))),
      FilledButton(
        onPressed: () => Navigator.of(context).pop(ctrl.text.trim()),
        style: FilledButton.styleFrom(
            backgroundColor: Colors.tealAccent, foregroundColor: Colors.black),
        child: const Text('Guardar'),
      ),
    ],
  );
}
