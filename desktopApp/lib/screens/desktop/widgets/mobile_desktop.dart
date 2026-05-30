import 'dart:io';
import 'dart:math' show min;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../../../core/models/desktop_config.dart';
import '../../../core/services/asset_cache_service.dart';
import 'desktop_commons.dart';
import 'slide_layer.dart';
import 'sticky_note_widget.dart';

// ── Phone canvas constants ─────────────────────────────────────────────────
// Matches PHONE_W / grid constants in DesktopMobile.tsx
const _phoneW      = 390.0;
const _tileCols    = 5;
const _tileGap     = 8.0;
const _paddingTop  = 48.0;
const _paddingBot  = 88.0;
const _paddingSide = 8.0;

// Portrait workspace thumbnail dimensions (matches MOBILE_WS_W / MOBILE_WS_H)
const _wsThumbW = 28.0;
const _wsThumbH = 48.0;

// ─────────────────────────────────────────────────────────────────────────────

enum MobileAction { normal, edit, delete }

/// Mobile-mode desktop — mirrors DesktopMobile.tsx:
///  - Dark outer stage (0xFF020C18), 390 px phone canvas centred
///  - 5-column icon grid with small tiles (42 px icon, 9 pt label)
///  - Left/right navigation only (single implicit row)
///  - Small floating nav arrows, vertically centred
///  - Bottom-centred toolbar pill
///  - Portrait workspace thumbnail overlay (shown when [overlayVisible])
class MobileDesktop extends StatefulWidget {
  final DesktopConfig config;
  final String        profileName;
  final int           activeWs;
  final NavDirection? lastNavDir;
  final bool          overlayVisible;
  final VoidCallback  onClose;
  final VoidCallback  onPropsOpen;
  final void Function(NavDirection) onNavigate;
  final void Function(String id)               onDeleteLink;
  final void Function(String id, String name)  onRenameLink;
  final void Function(String url, String name) onAddLink;
  final void Function(String url, String? faviconName, String? title)?
      onLinkEnriched;

  const MobileDesktop({
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
  State<MobileDesktop> createState() => _MobileDesktopState();
}

class _MobileDesktopState extends State<MobileDesktop> {
  final Map<int, String> _wallpaperPaths = {};
  SlideState?  _slide;
  MobileAction _action = MobileAction.normal;

  @override
  void initState() {
    super.initState();
    _loadWallpaper(widget.activeWs);
  }

  @override
  void didUpdateWidget(covariant MobileDesktop old) {
    super.didUpdateWidget(old);
    if (old.activeWs != widget.activeWs) {
      // In mobile mode (1 row) direction is always left or right.
      final dir = widget.lastNavDir ??
          (widget.activeWs > old.activeWs
              ? NavDirection.right
              : NavDirection.left);
      setState(() {
        _slide = SlideState(
          key:           DateTime.now().millisecondsSinceEpoch,
          color:         wsColor(old.activeWs),
          wallpaperPath: _wallpaperPaths[old.activeWs],
          dir:           dir,
        );
        _action = MobileAction.normal;
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

  // Mobile mode: left/right only (1 implicit row)
  bool get _canLeft  => widget.activeWs > 0;
  bool get _canRight => widget.activeWs < widget.config.cols - 1;

  void _onTileAction(DesktopLink link) {
    switch (_action) {
      case MobileAction.edit:
        _showRenameDialog(link);
      case MobileAction.delete:
        widget.onDeleteLink(link.id);
      case MobileAction.normal:
        final uri = Uri.tryParse(link.url);
        if (uri != null) launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _showRenameDialog(DesktopLink link) async {
    final ctrl   = TextEditingController(text: link.name);
    final result = await showDialog<String>(
      context: context,
      builder: (_) => _RenameDialog(ctrl: ctrl),
    );
    if (result != null) {
      widget.onRenameLink(link.id, result);
      setState(() => _action = MobileAction.normal);
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
    widget.onAddLink(url, name.isNotEmpty ? name : url);
    _fetchFaviconAndTitle(url);
  }

  Future<void> _fetchFaviconAndTitle(String url) async {
    try {
      final uri    = Uri.parse(url);
      final origin = '${uri.scheme}://${uri.host}';
      String? faviconName;
      for (final candidate in [
        '$origin/favicon.ico',
        '$origin/favicon.png',
      ]) {
        try {
          final resp = await http
              .get(Uri.parse(candidate))
              .timeout(const Duration(seconds: 6));
          if (resp.statusCode == 200 && resp.bodyBytes.length > 100) {
            final ext  = candidate.endsWith('.png') ? 'png' : 'ico';
            final name = uri.host
                .replaceAll('.', '_')
                .replaceAll('-', '_');
            await AssetCacheService.instance.saveFaviconToCache(
                widget.profileName, name, ext, resp.bodyBytes);
            faviconName = name;
            break;
          }
        } catch (_) {}
      }

      String? title;
      try {
        final resp = await http
            .get(Uri.parse(url), headers: {'User-Agent': 'Mozilla/5.0'})
            .timeout(const Duration(seconds: 8));
        if (resp.statusCode == 200) {
          final match = RegExp(r'<title[^>]*>([^<]+)</title>',
                  caseSensitive: false)
              .firstMatch(resp.body);
          title = match?.group(1)?.trim();
        }
      } catch (_) {}

      if (!mounted) return;
      if (faviconName != null || title != null) {
        widget.onLinkEnriched?.call(url, faviconName, title);
      }
    } catch (_) {}
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final cfg   = widget.config;
    final ws    = widget.activeWs;
    final bg    = wsColor(ws);
    final links = cfg.links.where((l) => l.workspaceIndex == ws).toList();
    final notes = cfg.notes.where((n) => n.workspaceIndex == ws).toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final phoneW = min(constraints.maxWidth, _phoneW);

        return ColoredBox(
          // Dark outer stage (matches the #020C18 background in DesktopMobile.tsx)
          color: const Color(0xFF020C18),
          child: Center(
            child: SizedBox(
              width:  phoneW,
              height: constraints.maxHeight,
              child: Stack(
                clipBehavior: Clip.hardEdge,
                children: [

                  // ── Phone background (wallpaper or workspace colour) ───────
                  Positioned.fill(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: _wallpaperPaths[ws] != null
                          ? Image.file(
                              File(_wallpaperPaths[ws]!),
                              fit: BoxFit.cover,
                              alignment: Alignment.topCenter,
                              errorBuilder: (_, __, ___) =>
                                  Container(color: bg),
                            )
                          : Container(color: bg),
                    ),
                  ),

                  // Phone frame border (non-interactive overlay).
                  // NOTE: no boxShadow here — a shadow on a Positioned.fill
                  // widget bleeds its Gaussian blur ~10 px inward, creating a
                  // dark vignette over the wallpaper. The outer glow is handled
                  // by the SizedBox parent being rendered against the dark
                  // #020C18 outer stage, which provides sufficient contrast.
                  Positioned.fill(
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.10),
                            width: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // ── Slide-out animation ────────────────────────────────────
                  if (_slide != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: SlideLayer(
                        key:           ValueKey(_slide!.key),
                        color:         _slide!.color,
                        wallpaperPath: _slide!.wallpaperPath,
                        dir:           _slide!.dir,
                        onComplete:    () => setState(() => _slide = null),
                      ),
                    ),

                  // ── Sticky notes at raw canvas coordinates ─────────────────
                  for (final note in notes)
                    StickyNoteWidget(
                      note:   note,
                      left:   note.x,
                      top:    note.y,
                      width:  note.width,
                      height: note.height,
                    ),

                  // ── Icon grid — 5 fixed columns ───────────────────────────
                  //
                  // Layout maths (phone canvas = 390 px max):
                  //   side padding: 8 px each  →  available ≈ 374 px
                  //   5 cols × tile + 4 gaps × 8 px = 374 px
                  //   tile width = (374 − 32) / 5 ≈ 68 px
                  //   childAspectRatio ≈ 68 / 82 ≈ 0.82  (room for 2-line label)
                  Positioned(
                    top:    _paddingTop,
                    left:   _paddingSide,
                    right:  _paddingSide,
                    bottom: _paddingBot,
                    child: GridView.builder(
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount:   _tileCols,
                        crossAxisSpacing: _tileGap,
                        mainAxisSpacing:  _tileGap,
                        childAspectRatio: 0.82,
                      ),
                      itemCount: links.length,
                      itemBuilder: (_, i) => _MobileLinkTile(
                        link:    links[i],
                        mode:    _action,
                        profile: widget.profileName,
                        onTap:   () => _onTileAction(links[i]),
                      ),
                    ),
                  ),

                  // ── Floating nav buttons (left / right only) ───────────────
                  if (_canLeft)
                    _NavBtn(
                      dir:   NavDirection.left,
                      onTap: () => widget.onNavigate(NavDirection.left),
                    ),
                  if (_canRight)
                    _NavBtn(
                      dir:   NavDirection.right,
                      onTap: () => widget.onNavigate(NavDirection.right),
                    ),

                  // ── Bottom-centred toolbar pill ────────────────────────────
                  Positioned(
                    bottom: 14, left: 0, right: 0,
                    child: Center(
                      child: _Toolbar(
                        action:         _action,
                        onAdd:          _showAddLinkDialog,
                        onToggleEdit:   () => setState(() =>
                            _action = _action == MobileAction.edit
                                ? MobileAction.normal
                                : MobileAction.edit),
                        onToggleDelete: () => setState(() =>
                            _action = _action == MobileAction.delete
                                ? MobileAction.normal
                                : MobileAction.delete),
                        onProps:        widget.onPropsOpen,
                        onClose:        widget.onClose,
                      ),
                    ),
                  ),

                  // ── Workspace overlay (portrait thumbnails) ────────────────
                  Positioned.fill(
                    child: IgnorePointer(
                      child: AnimatedOpacity(
                        opacity:  widget.overlayVisible ? 1.0 : 0.0,
                        duration: const Duration(milliseconds: 150),
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color:        Colors.white.withOpacity(0.10),
                              border: Border.all(
                                  color: Colors.white.withOpacity(0.40)),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Wrap(
                              spacing:    4,
                              runSpacing: 4,
                              children: List.generate(cfg.cols, (i) =>
                                Container(
                                  width:  _wsThumbW,
                                  height: _wsThumbH,
                                  decoration: BoxDecoration(
                                    color: i == ws
                                        ? Colors.white
                                        : Colors.white.withOpacity(0.40),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile link tile — matches DesktopMobileLinkTile.tsx
//   42 × 42 px icon, 9 pt label, 5 per row on a 390 px canvas.
// ─────────────────────────────────────────────────────────────────────────────

class _MobileLinkTile extends StatefulWidget {
  final DesktopLink   link;
  final MobileAction  mode;
  final String        profile;
  final VoidCallback  onTap;

  const _MobileLinkTile({
    required this.link,
    required this.mode,
    required this.profile,
    required this.onTap,
  });

  @override
  State<_MobileLinkTile> createState() => _MobileLinkTileState();
}

class _MobileLinkTileState extends State<_MobileLinkTile> {
  String? _faviconPath;
  bool    _hovered = false;

  static const _borderNormal = Color(0x733B82F6);
  static const _borderEdit   = Color(0xFF00FFE7);
  static const _borderDelete = Color(0xFFFF00CC);

  Color get _border => switch (widget.mode) {
    MobileAction.normal => _borderNormal,
    MobileAction.edit   => _borderEdit,
    MobileAction.delete => _borderDelete,
  };

  Color get _iconBg => switch (widget.mode) {
    MobileAction.delete => const Color(0x26FF00CC),
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
    if (widget.mode != MobileAction.normal) return;
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
        if (uri != null) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
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
        final pos = box?.localToGlobal(const Offset(42, 0)) ?? Offset.zero;
        _showContextMenu(context, pos);
      },
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit:  (_) => setState(() => _hovered = false),
        child: Column(
          mainAxisSize:       MainAxisSize.min,
          mainAxisAlignment:  MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                // Icon container — 42 × 42 px
                AnimatedContainer(
                  duration: const Duration(milliseconds: 100),
                  width: 42, height: 42,
                  transform: _hovered
                      ? (Matrix4.identity()..scale(1.08))
                      : Matrix4.identity(),
                  decoration: BoxDecoration(
                    color:        _iconBg,
                    borderRadius: BorderRadius.circular(10),
                    border:       Border.all(color: _border, width: 1.5),
                    boxShadow: switch (widget.mode) {
                      MobileAction.edit => [
                          BoxShadow(
                            color:      _borderEdit.withOpacity(0.35),
                            blurRadius: 8,
                          ),
                        ],
                      MobileAction.delete => [
                          BoxShadow(
                            color:      _borderDelete.withOpacity(0.35),
                            blurRadius: 8,
                          ),
                        ],
                      _ => const [
                          BoxShadow(
                            blurRadius: 6,
                            color:      Color(0x4D000000),
                          ),
                        ],
                    },
                  ),
                  clipBehavior: Clip.hardEdge,
                  child: Center(
                    child: _faviconPath != null
                        ? Image.file(
                            File(_faviconPath!),
                            width: 26, height: 26,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) =>
                                const _DefaultIcon(),
                          )
                        : const _DefaultIcon(),
                  ),
                ),

                // Mode badge — 14 × 14 px circle top-right
                if (widget.mode != MobileAction.normal)
                  Positioned(
                    top: -4, right: -4,
                    child: Container(
                      width: 14, height: 14,
                      decoration: BoxDecoration(
                        color: widget.mode == MobileAction.edit
                            ? _borderEdit
                            : _borderDelete,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        widget.mode == MobileAction.edit
                            ? Icons.edit
                            : Icons.close,
                        size:  8,
                        color: const Color(0xFF020C18),
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 4),

            // Name label — 9 pt, 2 lines max
            Text(
              widget.link.name.isNotEmpty
                  ? widget.link.name
                  : widget.link.url,
              maxLines:  2,
              overflow:  TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize:   9,
                color:      Colors.white,
                height:     1.25,
                shadows: [
                  Shadow(blurRadius: 3, color: Color(0xD9000000)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DefaultIcon extends StatelessWidget {
  const _DefaultIcon();
  @override
  Widget build(BuildContext context) =>
      const Icon(Icons.language, size: 22, color: Color(0xFF3B82F6));
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating nav button — small rounded pill (28 × 52 px), vertically centred.
// Matches NavBtn in DesktopMobile.tsx.
//
// NOTE: BackdropFilter is intentionally NOT used here. Inside a Stack with
// clipBehavior: Clip.hardEdge, BackdropFilter forces Flutter to create a
// saveLayer that starts transparent (rendered as black), which tints the
// entire phone canvas with a dark overlay. A plain semi-opaque Container
// achieves the same visual result without the compositing side-effect.
// ─────────────────────────────────────────────────────────────────────────────

class _NavBtn extends StatefulWidget {
  final NavDirection dir;
  final VoidCallback onTap;
  const _NavBtn({required this.dir, required this.onTap});

  @override
  State<_NavBtn> createState() => _NavBtnState();
}

class _NavBtnState extends State<_NavBtn> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final isLeft = widget.dir == NavDirection.left;
    return Positioned(
      top: 0, bottom: 0,
      left:  isLeft ? 4 : null,
      right: isLeft ? null : 4,
      child: Center(
        child: MouseRegion(
          onEnter: (_) => setState(() => _hovered = true),
          onExit:  (_) => setState(() => _hovered = false),
          child: GestureDetector(
            onTap: widget.onTap,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 28, height: 52,
              decoration: BoxDecoration(
                color: _hovered
                    ? const Color(0xCC020C18)
                    : const Color(0x99020C18),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color: Colors.white.withOpacity(0.22), width: 1),
                boxShadow: const [
                  BoxShadow(blurRadius: 8, color: Color(0x73000000)),
                ],
              ),
              child: Center(
                child: Text(
                  isLeft ? '‹' : '›',
                  style: const TextStyle(
                    fontSize: 22,
                    color:    Colors.white,
                    height:   1,
                    shadows: [
                      Shadow(blurRadius: 4, color: Color(0xB3000000)),
                    ],
                  ),
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
// Floating toolbar — bottom-centred pill (matches DesktopMobile.tsx toolbar).
// ─────────────────────────────────────────────────────────────────────────────

class _Toolbar extends StatelessWidget {
  final MobileAction action;
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
          BoxShadow(blurRadius: 20, color: Color(0x8C000000)),
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
            active: action == MobileAction.edit,
            activeColor: const Color(0xFF00FFE7),
            onPressed: onToggleEdit,
          ),
          const SizedBox(width: 10),
          _ToolbarBtn(
            label: '🗑️', title: 'Borrar icono',
            active: action == MobileAction.delete,
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
  final String       label;
  final String       title;
  final bool         active;
  final Color        activeColor;
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
            width: 42, height: 42,
            decoration: BoxDecoration(
              color: widget.active
                  ? widget.activeColor.withOpacity(0.20)
                  : Colors.white.withOpacity(0.08),
              shape:  BoxShape.circle,
              border: Border.all(
                color: widget.active
                    ? widget.activeColor
                    : Colors.white.withOpacity(0.18),
                width: 1.5,
              ),
              boxShadow: widget.active
                  ? [BoxShadow(
                      color:      widget.activeColor.withOpacity(0.40),
                      blurRadius: 10,
                    )]
                  : null,
            ),
            transform: _hovered
                ? (Matrix4.identity()..scale(1.12))
                : Matrix4.identity(),
            child: Center(
              child: Text(
                widget.label,
                style: TextStyle(
                  fontSize: widget.label == '+' ? 24 : 16,
                  color:    Colors.white,
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
// Dialogs (same UX as tablet_desktop.dart)
// ─────────────────────────────────────────────────────────────────────────────

class _RenameDialog extends StatelessWidget {
  final TextEditingController ctrl;
  const _RenameDialog({required this.ctrl});

  @override
  Widget build(BuildContext context) => AlertDialog(
    backgroundColor: const Color(0xFF1E1E1E),
    title: const Text('Editar nombre',
        style: TextStyle(color: Colors.white)),
    content: TextField(
      controller: ctrl,
      autofocus:  true,
      style:      const TextStyle(color: Colors.white),
      decoration: const InputDecoration(
        labelText:  'Nombre',
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
            backgroundColor: Colors.tealAccent,
            foregroundColor: Colors.black),
        child: const Text('Guardar'),
      ),
    ],
  );
}

class _AddLinkDialog extends StatefulWidget {
  final TextEditingController urlCtrl;
  final TextEditingController nameCtrl;
  const _AddLinkDialog(
      {required this.urlCtrl, required this.nameCtrl});

  @override
  State<_AddLinkDialog> createState() => _AddLinkDialogState();
}

class _AddLinkDialogState extends State<_AddLinkDialog> {
  bool    _fetching = false;
  String? _fetchError;

  static String _normalizeUrl(String raw) {
    raw = raw.trim();
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      raw = 'https://$raw';
    }
    return raw;
  }

  Future<void> _fetchTitle() async {
    final raw = widget.urlCtrl.text.trim();
    if (raw.isEmpty) return;
    final url = _normalizeUrl(raw);
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasAuthority) return;

    widget.urlCtrl.text = url;
    setState(() { _fetching = true; _fetchError = null; });
    try {
      final resp = await http
          .get(uri, headers: {'User-Agent': 'Mozilla/5.0'})
          .timeout(const Duration(seconds: 8));
      if (!mounted) return;
      if (resp.statusCode == 200) {
        final match = RegExp(r'<title[^>]*>([^<]+)</title>',
                caseSensitive: false)
            .firstMatch(resp.body);
        final title = match?.group(1)?.trim();
        if (title != null && title.isNotEmpty) {
          widget.nameCtrl.text = title;
        } else {
          setState(() => _fetchError = 'No se encontró título');
        }
      } else {
        setState(() => _fetchError = 'Error ${resp.statusCode}');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _fetchError = 'Sin conexión o URL inválida');
      }
    } finally {
      if (mounted) setState(() => _fetching = false);
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    backgroundColor: const Color(0xFF1E1E1E),
    title: const Text('Añadir enlace',
        style: TextStyle(color: Colors.white)),
    content: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller:  widget.urlCtrl,
          autofocus:   true,
          style:       const TextStyle(color: Colors.white),
          onSubmitted: (_) => _fetchTitle(),
          decoration: InputDecoration(
            labelText:  'URL',
            hintText:   'https://…',
            labelStyle: const TextStyle(color: Colors.white54),
            hintStyle:  const TextStyle(color: Colors.white24),
            enabledBorder: const UnderlineInputBorder(
                borderSide: BorderSide(color: Colors.white24)),
            focusedBorder: const UnderlineInputBorder(
                borderSide: BorderSide(color: Colors.tealAccent)),
            suffixIcon: _fetching
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 16, height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.tealAccent),
                    ),
                  )
                : IconButton(
                    icon: const Icon(Icons.search,
                        size: 18, color: Colors.white38),
                    tooltip:   'Obtener título',
                    onPressed: _fetchTitle,
                  ),
          ),
        ),
        if (_fetchError != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(_fetchError!,
                style: const TextStyle(
                    color: Colors.orangeAccent, fontSize: 11)),
          ),
        const SizedBox(height: 12),
        TextField(
          controller: widget.nameCtrl,
          style:      const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            labelText:  'Nombre',
            hintText:   'Pulsa 🔍 para autocompletar',
            labelStyle: TextStyle(color: Colors.white54),
            hintStyle:  TextStyle(color: Colors.white24),
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
