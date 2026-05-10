import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../../../core/models/desktop_config.dart';
import '../../../core/services/asset_cache_service.dart';
import 'desktop_commons.dart';
import 'slide_layer.dart';
import 'sticky_note_widget.dart';

/// Tablet mode desktop — matches DesktopTablet.tsx:
///  - Full-screen wallpaper / colour background
///  - Scrollable grid of link tiles (DesktopTabletLinkTile)
///  - Sticky notes at absolute scaled positions
///  - Edge navigation arrows (left / right / up / down) when available
///  - Floating toolbar bottom-right: + ✏️ 🗑️ ⚙️ ✕
///  - Workspace grid overlay (shown when [overlayVisible])
class TabletDesktop extends StatefulWidget {
  final DesktopConfig config;
  final String        profileName;
  final int           activeWs;
  final NavDirection? lastNavDir;
  final bool          overlayVisible;
  final VoidCallback  onClose;
  final VoidCallback  onPropsOpen;
  final void Function(NavDirection) onNavigate;
  final void Function(String id)            onDeleteLink;
  final void Function(String id, String name) onRenameLink;
  final void Function(String url, String name) onAddLink;
  /// Called after favicon/title unfurl completes for a newly added link.
  /// [faviconName] and [title] may be null if not resolved.
  final void Function(String url, String? faviconName, String? title)? onLinkEnriched;

  const TabletDesktop({
    super.key,
    required this.config,
    required this.profileName,
    required this.activeWs,
    required this.lastNavDir,
    required this.overlayVisible,
    required this.onClose,
    required this.onPropsOpen,
    required this.onNavigate,
    required this.onDeleteLink,
    required this.onRenameLink,
    required this.onAddLink,
    this.onLinkEnriched,
  });

  @override
  State<TabletDesktop> createState() => _TabletDesktopState();
}

// Matches TabletAction in DesktopTabletLinkTile.tsx
enum TabletAction { normal, edit, delete }

class _TabletDesktopState extends State<TabletDesktop> {
  final Map<int, String> _wallpaperPaths = {};
  SlideState?  _slide;
  TabletAction _action = TabletAction.normal;

  @override
  void initState() {
    super.initState();
    _loadWallpaper(widget.activeWs);
  }

  @override
  void didUpdateWidget(covariant TabletDesktop old) {
    super.didUpdateWidget(old);
    if (old.activeWs != widget.activeWs) {
      final dir = widget.lastNavDir ??
          getDirection(old.activeWs, widget.activeWs, widget.config.cols);
      setState(() {
        _slide = SlideState(
          key:           DateTime.now().millisecondsSinceEpoch,
          color:         wsColor(old.activeWs),
          wallpaperPath: _wallpaperPaths[old.activeWs],
          dir:           dir,
        );
        _action = TabletAction.normal;
      });
      _loadWallpaper(widget.activeWs);
    }
  }

  Future<void> _loadWallpaper(int wsIndex) async {
    if (_wallpaperPaths.containsKey(wsIndex)) return;
    final wallpapers = widget.config.wallpapers;
    if (wsIndex >= wallpapers.length || wallpapers[wsIndex].isEmpty) return;
    final path = await AssetCacheService.instance.resolveAsset(
        widget.profileName, wallpapers[wsIndex]);
    if (mounted && path != null) {
      setState(() => _wallpaperPaths[wsIndex] = path);
    }
  }

  // ── Navigation bounds ─────────────────────────────────────────────────────
  int get _col => widget.activeWs % widget.config.cols;
  int get _row => widget.activeWs ~/ widget.config.cols;

  bool get _canLeft  => _col > 0;
  bool get _canRight => _col < widget.config.cols - 1;
  bool get _canUp    => _row > 0;
  bool get _canDown  => _row < widget.config.rows - 1;

  void _onTileAction(DesktopLink link) {
    switch (_action) {
      case TabletAction.edit:
        _showRenameDialog(link);
      case TabletAction.delete:
        widget.onDeleteLink(link.id);
      case TabletAction.normal:
        final uri = Uri.tryParse(link.url);
        if (uri != null) launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _showRenameDialog(DesktopLink link) async {
    final ctrl = TextEditingController(text: link.name);
    final result = await showDialog<String>(
      context: context,
      builder: (_) => _RenameDialog(ctrl: ctrl),
    );
    if (result != null) {
      widget.onRenameLink(link.id, result);
      setState(() => _action = TabletAction.normal);
    }
  }

  Future<void> _showAddLinkDialog() async {
    final urlCtrl  = TextEditingController();
    final nameCtrl = TextEditingController();
    final result   = await showDialog<bool>(
      context: context,
      builder: (_) => _AddLinkDialog(urlCtrl: urlCtrl, nameCtrl: nameCtrl),
    );
    if (result != true || urlCtrl.text.trim().isEmpty) return;

    final url  = urlCtrl.text.trim();
    final name = nameCtrl.text.trim();

    // Kick off favicon fetch + title unfurl in the background
    widget.onAddLink(url, name.isNotEmpty ? name : url);
    _fetchFaviconAndTitle(url);
  }

  /// Tries to download a favicon directly from the site and unfurl the page
  /// title. On success, calls [onAddLink] again with the enriched data, or
  /// patches the existing link via [onRenameLink] if the title was empty.
  Future<void> _fetchFaviconAndTitle(String url) async {
    try {
      final uri    = Uri.parse(url);
      final origin = '${uri.scheme}://${uri.host}';

      // ── Favicon ────────────────────────────────────────────────────────
      String? faviconName;
      for (final candidate in [
        '$origin/favicon.ico',
        '$origin/favicon.png',
      ]) {
        try {
          final resp = await http.get(Uri.parse(candidate))
              .timeout(const Duration(seconds: 6));
          if (resp.statusCode == 200 && resp.bodyBytes.length > 100) {
            final ext  = candidate.endsWith('.png') ? 'png' : 'ico';
            final name = uri.host.replaceAll('.', '_').replaceAll('-', '_');
            await AssetCacheService.instance.saveFaviconToCache(
                widget.profileName, name, ext, resp.bodyBytes);
            faviconName = name;
            break;
          }
        } catch (_) {}
      }

      // ── Page title (unfurl) ────────────────────────────────────────────
      String? title;
      try {
        final resp = await http
            .get(Uri.parse(url),
                headers: {'User-Agent': 'Mozilla/5.0'})
            .timeout(const Duration(seconds: 8));
        if (resp.statusCode == 200) {
          final match = RegExp(r'<title[^>]*>([^<]+)</title>',
                  caseSensitive: false)
              .firstMatch(resp.body);
          title = match?.group(1)?.trim();
        }
      } catch (_) {}

      if (!mounted) return;

      // Patch the just-created link with favicon / title via callbacks
      if (faviconName != null || title != null) {
        widget.onLinkEnriched?.call(url, faviconName, title);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final cfg  = widget.config;
    final ws   = widget.activeWs;
    final bg   = wsColor(ws);

    final notes = cfg.notes.where((n) => n.workspaceIndex == ws).toList();
    final links = cfg.links.where((l) => l.workspaceIndex == ws).toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final scaleX = constraints.maxWidth  / 1920.0;
        final scaleY = constraints.maxHeight / 1080.0;

        double sx(double v) => v * scaleX;
        double sy(double v) => v * scaleY;

        return Stack(
          children: [
            // ── Background ─────────────────────────────────────────────────
            Positioned.fill(
              child: _wallpaperPaths[ws] != null
                  ? Image.file(File(_wallpaperPaths[ws]!), fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(color: bg))
                  : Container(color: bg),
            ),

            // ── Slide-out animation ────────────────────────────────────────
            if (_slide != null)
              SlideLayer(
                key:          ValueKey(_slide!.key),
                color:        _slide!.color,
                wallpaperPath: _slide!.wallpaperPath,
                dir:          _slide!.dir,
                onComplete:   () => setState(() => _slide = null),
              ),

            // ── Sticky notes at absolute positions ─────────────────────────
            for (final note in notes)
              StickyNoteWidget(
                note:   note,
                left:   sx(note.x),
                top:    sy(note.y),
                width:  sx(note.width),
                height: sy(note.height),
              ),

            // ── Scrollable link tiles grid ─────────────────────────────────
            // Padding matches DesktopTablet.tsx: top 60, sides 68, bottom 68
            Positioned(
              top: 60, left: 68, right: 68, bottom: 68,
              child: SingleChildScrollView(
                child: Wrap(
                  spacing: 20,
                  runSpacing: 20,
                  children: links.map((link) => _TabletLinkTile(
                    link:    link,
                    mode:    _action,
                    profile: widget.profileName,
                    onTap:   () => _onTileAction(link),
                  )).toList(),
                ),
              ),
            ),

            // ── Navigation arrows ─────────────────────────────────────────
            if (_canLeft)  _NavArrow(dir: NavDirection.left,  onTap: () { widget.onNavigate(NavDirection.left);  }),
            if (_canRight) _NavArrow(dir: NavDirection.right, onTap: () { widget.onNavigate(NavDirection.right); }),
            if (_canUp)    _NavArrow(dir: NavDirection.up,    onTap: () { widget.onNavigate(NavDirection.up);    }),
            if (_canDown)  _NavArrow(dir: NavDirection.down,  onTap: () { widget.onNavigate(NavDirection.down);  }),

            // ── Workspace grid overlay ────────────────────────────────────
            WorkspaceOverlay(
              activeWs: ws,
              rows:     cfg.rows,
              cols:     cfg.cols,
              visible:  widget.overlayVisible,
            ),

            // ── Floating toolbar (bottom-right) ───────────────────────────
            Positioned(
              bottom: 20, right: 20,
              child: _Toolbar(
                action:        _action,
                onAdd:         _showAddLinkDialog,
                onToggleEdit:  () => setState(() =>
                    _action = _action == TabletAction.edit ? TabletAction.normal : TabletAction.edit),
                onToggleDelete: () => setState(() =>
                    _action = _action == TabletAction.delete ? TabletAction.normal : TabletAction.delete),
                onProps:       widget.onPropsOpen,
                onClose:       widget.onClose,
              ),
            ),
          ],
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablet link tile — matches DesktopTabletLinkTile.tsx
// ─────────────────────────────────────────────────────────────────────────────

class _TabletLinkTile extends StatefulWidget {
  final DesktopLink   link;
  final TabletAction  mode;
  final String        profile;
  final VoidCallback  onTap;

  const _TabletLinkTile({
    required this.link,
    required this.mode,
    required this.profile,
    required this.onTap,
  });

  @override
  State<_TabletLinkTile> createState() => _TabletLinkTileState();
}

class _TabletLinkTileState extends State<_TabletLinkTile> {
  String? _faviconPath;
  bool    _hovered = false;

  // Mode colours — matches MODE_BORDER / MODE_SHADOW in the .tsx
  static const _borderNormal = Color(0x733B82F6);
  static const _borderEdit   = Color(0xFF00FFE7);
  static const _borderDelete = Color(0xFFFF00CC);

  Color get _border => switch (widget.mode) {
    TabletAction.normal => _borderNormal,
    TabletAction.edit   => _borderEdit,
    TabletAction.delete => _borderDelete,
  };

  Color get _iconBg => switch (widget.mode) {
    TabletAction.delete => const Color(0x26FF00CC),
    _                   => const Color(0x2F3B82F6),
  };

  @override
  void initState() {
    super.initState();
    if (widget.link.favicon?.isNotEmpty ?? false) _resolveFavicon();
  }

  Future<void> _resolveFavicon() async {
    final path = await AssetCacheService.instance.resolveFavicon(
        widget.profile, widget.link.favicon!);
    if (mounted) setState(() => _faviconPath = path);
  }

  void _showContextMenu(BuildContext context, Offset pos) {
    if (widget.mode != TabletAction.normal) return;
    final size = MediaQuery.of(context).size;
    showMenu<String>(
      context: context,
      position: RelativeRect.fromLTRB(
          pos.dx, pos.dy, size.width - pos.dx, size.height - pos.dy),
      items: const [
        PopupMenuItem(value: 'copy', child: Text('Copiar enlace')),
        PopupMenuItem(value: 'open', child: Text('Abrir')),
      ],
    ).then((value) async {
      if (value == 'copy') {
        await Clipboard.setData(ClipboardData(text: widget.link.url));
      } else if (value == 'open') {
        final uri = Uri.tryParse(widget.link.url);
        if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onSecondaryTapDown: (d) => _showContextMenu(context, d.globalPosition),
      onLongPress: () {
        final box = context.findRenderObject() as RenderBox?;
        final pos = box?.localToGlobal(const Offset(48, 0)) ?? Offset.zero;
        _showContextMenu(context, pos);
      },
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit:  (_) => setState(() => _hovered = false),
        child: SizedBox(
          width: 96,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  // Icon box
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 100),
                    width: 64, height: 64,
                    transform: _hovered
                        ? (Matrix4.identity()..scale(1.07))
                        : Matrix4.identity(),
                    decoration: BoxDecoration(
                      color:        _iconBg,
                      borderRadius: BorderRadius.circular(14),
                      border:       Border.all(color: _border, width: 1.5),
                      boxShadow: widget.mode == TabletAction.edit
                          ? [BoxShadow(color: _borderEdit.withOpacity(0.4),
                              blurRadius: 0, spreadRadius: 2)]
                          : widget.mode == TabletAction.delete
                              ? [BoxShadow(color: _borderDelete.withOpacity(0.4),
                                  blurRadius: 0, spreadRadius: 2)]
                              : const [BoxShadow(blurRadius: 10, spreadRadius: 0,
                                  color: Color(0x66000000))],
                    ),
                    clipBehavior: Clip.hardEdge,
                    child: Center(
                      child: _faviconPath != null
                          ? Image.file(File(_faviconPath!),
                              width: 44, height: 44, fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => const _DefaultTileIcon())
                          : const _DefaultTileIcon(),
                    ),
                  ),
                  // Mode badge
                  if (widget.mode != TabletAction.normal)
                    Positioned(
                      top: -4, right: -4,
                      child: Container(
                        width: 22, height: 22,
                        decoration: BoxDecoration(
                          color:  widget.mode == TabletAction.edit
                              ? _borderEdit : _borderDelete,
                          shape: BoxShape.circle,
                          boxShadow: const [BoxShadow(blurRadius: 6,
                              color: Color(0x80000000))],
                        ),
                        child: Icon(
                          widget.mode == TabletAction.edit
                              ? Icons.edit : Icons.delete_outline,
                          size: 13,
                          color: const Color(0xFF020C18),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                widget.link.name.isNotEmpty ? widget.link.name : widget.link.url,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.white,
                  shadows: [
                    Shadow(blurRadius: 4, color: Color(0xE6000000)),
                    Shadow(blurRadius: 8, color: Color(0xB3000000)),
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

class _DefaultTileIcon extends StatelessWidget {
  const _DefaultTileIcon();
  @override
  Widget build(BuildContext context) => const Icon(
    Icons.language,
    size: 38,
    color: Color(0xFF3B82F6),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation arrow — matches NavArrow in DesktopTablet.tsx
// ─────────────────────────────────────────────────────────────────────────────

class _NavArrow extends StatefulWidget {
  final NavDirection dir;
  final VoidCallback onTap;
  const _NavArrow({required this.dir, required this.onTap});

  @override
  State<_NavArrow> createState() => _NavArrowState();
}

class _NavArrowState extends State<_NavArrow> {
  bool _hovered = false;

  IconData get _icon => switch (widget.dir) {
    NavDirection.left  => Icons.chevron_left,
    NavDirection.right => Icons.chevron_right,
    NavDirection.up    => Icons.expand_less,
    NavDirection.down  => Icons.expand_more,
  };

  AlignmentGeometry get _alignment => switch (widget.dir) {
    NavDirection.left  => Alignment.centerLeft,
    NavDirection.right => Alignment.centerRight,
    NavDirection.up    => Alignment.topCenter,
    NavDirection.down  => Alignment.bottomCenter,
  };

  BoxConstraints get _constraints => switch (widget.dir) {
    NavDirection.left || NavDirection.right =>
        const BoxConstraints.expand(width: 52),
    NavDirection.up || NavDirection.down =>
        const BoxConstraints.expand(height: 52),
  };

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Align(
        alignment: _alignment,
        child: MouseRegion(
          onEnter: (_) => setState(() => _hovered = true),
          onExit:  (_) => setState(() => _hovered = false),
          child: GestureDetector(
            onTap: widget.onTap,
            child: ConstrainedBox(
              constraints: _constraints,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                color: _hovered
                    ? Colors.white.withOpacity(0.10)
                    : Colors.transparent,
                child: Icon(
                  _icon,
                  size:  48,
                  color: Colors.white.withOpacity(0.85),
                  shadows: const [Shadow(blurRadius: 4, color: Colors.black54)],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating toolbar — matches the pill at the bottom-right of DesktopTablet.tsx
// ─────────────────────────────────────────────────────────────────────────────

class _Toolbar extends StatelessWidget {
  final TabletAction action;
  final VoidCallback onAdd;
  final VoidCallback onToggleEdit;
  final VoidCallback onToggleDelete;
  final VoidCallback onProps;
  final VoidCallback onClose;

  const _Toolbar({
    required this.action,
    required this.onAdd,
    required this.onToggleEdit,
    required this.onToggleDelete,
    required this.onProps,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color:        const Color(0xBF020C18),
        borderRadius: BorderRadius.circular(32),
        border:       Border.all(color: Colors.white.withOpacity(0.12)),
        boxShadow: const [
          BoxShadow(blurRadius: 20, spreadRadius: 0, color: Color(0x8C000000)),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ToolbarBtn(
            label: '+', title: 'Añadir enlace',
            active: false, activeColor: const Color(0xFF3B82F6),
            onPressed: onAdd,
          ),
          const SizedBox(width: 10),
          _ToolbarBtn(
            label: '✏️', title: 'Editar icono',
            active: action == TabletAction.edit,
            activeColor: const Color(0xFF00FFE7),
            onPressed: onToggleEdit,
          ),
          const SizedBox(width: 10),
          _ToolbarBtn(
            label: '🗑️', title: 'Borrar icono',
            active: action == TabletAction.delete,
            activeColor: const Color(0xFFFF00CC),
            onPressed: onToggleDelete,
          ),
          const SizedBox(width: 10),
          _ToolbarBtn(
            label: '⚙️', title: 'Propiedades',
            active: false, activeColor: const Color(0xFFA855F7),
            onPressed: onProps,
          ),
          const SizedBox(width: 10),
          _ToolbarBtn(
            label: '✕', title: 'Cerrar perfil',
            active: false, activeColor: Colors.white,
            onPressed: onClose,
          ),
        ],
      ),
    );
  }
}

class _ToolbarBtn extends StatefulWidget {
  final String     label;
  final String     title;
  final bool       active;
  final Color      activeColor;
  final VoidCallback onPressed;

  const _ToolbarBtn({
    required this.label,
    required this.title,
    required this.active,
    required this.activeColor,
    required this.onPressed,
  });

  @override
  State<_ToolbarBtn> createState() => _ToolbarBtnState();
}

class _ToolbarBtnState extends State<_ToolbarBtn> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: widget.title,
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit:  (_) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: widget.onPressed,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 120),
            width: 48, height: 48,
            decoration: BoxDecoration(
              color:       widget.active
                  ? widget.activeColor.withOpacity(0.20)
                  : Colors.white.withOpacity(0.08),
              shape:       BoxShape.circle,
              border:      Border.all(
                color: widget.active
                    ? widget.activeColor
                    : Colors.white.withOpacity(0.18),
                width: 1.5,
              ),
              boxShadow: widget.active
                  ? [BoxShadow(color: widget.activeColor.withOpacity(0.40),
                      blurRadius: 10)]
                  : null,
            ),
            transform: _hovered
                ? (Matrix4.identity()..scale(1.12))
                : Matrix4.identity(),
            child: Center(
              child: Text(widget.label,
                  style: TextStyle(
                    fontSize: widget.label == '+' ? 26 : 18,
                    color: Colors.white,
                  )),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialogs
// ─────────────────────────────────────────────────────────────────────────────

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
          child: const Text('Cancelar', style: TextStyle(color: Colors.white54))),
      FilledButton(
        onPressed: () => Navigator.of(context).pop(ctrl.text.trim()),
        style: FilledButton.styleFrom(
            backgroundColor: Colors.tealAccent, foregroundColor: Colors.black),
        child: const Text('Guardar'),
      ),
    ],
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
            hintText: 'https://...',
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
          child: const Text('Cancelar', style: TextStyle(color: Colors.white54))),
      FilledButton(
        onPressed: () => Navigator.of(context).pop(true),
        style: FilledButton.styleFrom(
            backgroundColor: Colors.tealAccent, foregroundColor: Colors.black),
        child: const Text('Añadir'),
      ),
    ],
  );
}
