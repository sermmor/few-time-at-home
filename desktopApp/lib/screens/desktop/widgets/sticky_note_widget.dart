import 'package:flutter/material.dart';
import '../../../core/models/desktop_config.dart';

const double _kMinW = 120.0;
const double _kMinH =  80.0;

// Preset colours for the note colour picker
const List<(String label, String hex)> _kNoteColors = [
  ('Amarillo', '#FFF176'),
  ('Naranja',  '#FFCC80'),
  ('Melocotón','#FFAB91'),
  ('Rosa',     '#F48FB1'),
  ('Rojo',     '#EF9A9A'),
  ('Morado',   '#CE93D8'),
  ('Azul',     '#90CAF9'),
  ('Cian',     '#80DEEA'),
  ('Verde',    '#A5D6A7'),
  ('Gris',     '#CFD8DC'),
];

/// Sticky note widget — draggable from header strip, tappable to edit content.
/// Header controls:
///   ⋮  (left)  → settings dialog (colour, font-size, alpha)
///   ✕  (right) → delete
/// Bottom-right corner → resize grip
class StickyNoteWidget extends StatefulWidget {
  final StickyNote note;
  final double left, top, width, height;

  final void Function(double x, double y)?               onMoved;
  final void Function(String content)?                   onContentChanged;
  final VoidCallback?                                    onDelete;
  final void Function(double w, double h)?               onResized;
  final void Function(String? color, double fontSize,
      double alpha)?                                     onSettingsChanged;

  const StickyNoteWidget({
    super.key,
    required this.note,
    required this.left,
    required this.top,
    required this.width,
    required this.height,
    this.onMoved,
    this.onContentChanged,
    this.onDelete,
    this.onResized,
    this.onSettingsChanged,
  });

  @override
  State<StickyNoteWidget> createState() => _StickyNoteWidgetState();
}

class _StickyNoteWidgetState extends State<StickyNoteWidget> {
  late double _x, _y, _w, _h;
  bool _headerHovered = false;

  @override
  void initState() {
    super.initState();
    _x = widget.left;  _y = widget.top;
    _w = widget.width; _h = widget.height;
  }

  @override
  void didUpdateWidget(covariant StickyNoteWidget old) {
    super.didUpdateWidget(old);
    if (old.left   != widget.left)   _x = widget.left;
    if (old.top    != widget.top)    _y = widget.top;
    if (old.width  != widget.width)  _w = widget.width;
    if (old.height != widget.height) _h = widget.height;
  }

  // ── Colour helpers ─────────────────────────────────────────────────────────

  Color get _bgColor => _hexToColor(widget.note.color) ?? const Color(0xFFFFF176);

  static Color? _hexToColor(String? hex) {
    if (hex == null) return null;
    final h = hex.replaceFirst('#', '');
    try { return Color(int.parse('FF$h', radix: 16)); } catch (_) { return null; }
  }

  Color _darken(Color c, double f) => Color.fromARGB(
    c.alpha,
    (c.red * f).round(), (c.green * f).round(), (c.blue * f).round(),
  );

  // ── Dialogs ────────────────────────────────────────────────────────────────

  Future<void> _showEditDialog(BuildContext context) async {
    final ctrl   = TextEditingController(text: widget.note.content);
    final result = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text('Editar nota', style: TextStyle(color: Colors.white)),
        content: SizedBox(
          width: 360,
          child: TextField(
            controller: ctrl,
            autofocus: true,
            maxLines: 8,
            style: const TextStyle(color: Colors.black87, fontSize: 14),
            decoration: InputDecoration(
              filled: true,
              fillColor: _bgColor,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(color: Colors.tealAccent),
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar', style: TextStyle(color: Colors.white54)),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(ctrl.text),
            style: FilledButton.styleFrom(
                backgroundColor: Colors.tealAccent, foregroundColor: Colors.black),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
    if (result != null) widget.onContentChanged?.call(result);
  }

  Future<void> _showSettingsDialog(BuildContext context) async {
    final result = await showDialog<_NoteSettings>(
      context: context,
      builder: (_) => _NoteSettingsDialog(
        initialColor:    widget.note.color ?? '#FFF176',
        initialFontSize: widget.note.fontSize,
        initialAlpha:    widget.note.alpha,
      ),
    );
    if (result != null) {
      widget.onSettingsChanged?.call(result.color, result.fontSize, result.alpha);
    }
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final bg       = _bgColor;
    final headerBg = _darken(bg, 0.82);

    return Positioned(
      left: _x, top: _y,
      child: Opacity(
        opacity: widget.note.alpha.clamp(0.0, 1.0),
        child: SizedBox(
          width: _w, height: _h,
          child: Container(
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(4),
              boxShadow: const [BoxShadow(
                  blurRadius: 6, spreadRadius: 1, color: Colors.black26)],
            ),
            child: Stack(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ── Header strip ──────────────────────────────────────
                    MouseRegion(
                      onEnter: (_) => setState(() => _headerHovered = true),
                      onExit:  (_) => setState(() => _headerHovered = false),
                      child: Container(
                        height: 22,
                        decoration: BoxDecoration(
                          color: headerBg,
                          borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(4)),
                        ),
                        child: Row(
                          children: [
                            // Settings ⋮ button (left)
                            if (widget.onSettingsChanged != null)
                              AnimatedOpacity(
                                opacity: _headerHovered ? 1.0 : 0.30,
                                duration: const Duration(milliseconds: 150),
                                child: GestureDetector(
                                  onTap: () => _showSettingsDialog(context),
                                  child: MouseRegion(
                                    cursor: SystemMouseCursors.click,
                                    child: SizedBox(
                                      width: 22, height: 22,
                                      child: const Icon(Icons.more_vert,
                                          size: 14, color: Colors.black54),
                                    ),
                                  ),
                                ),
                              ),
                            // Drag handle (centre, expands)
                            Expanded(
                              child: GestureDetector(
                                onPanUpdate: (d) => setState(() {
                                  _x += d.delta.dx; _y += d.delta.dy;
                                }),
                                onPanEnd: (_) => widget.onMoved?.call(_x, _y),
                                child: const Center(
                                  child: Icon(Icons.drag_handle,
                                      size: 14, color: Colors.black38),
                                ),
                              ),
                            ),
                            // Delete ✕ button (right)
                            if (widget.onDelete != null)
                              AnimatedOpacity(
                                opacity: _headerHovered ? 1.0 : 0.30,
                                duration: const Duration(milliseconds: 150),
                                child: GestureDetector(
                                  onTap: widget.onDelete,
                                  child: MouseRegion(
                                    cursor: SystemMouseCursors.click,
                                    child: SizedBox(
                                      width: 22, height: 22,
                                      child: const Icon(Icons.close,
                                          size: 13, color: Colors.black54),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    // ── Content area ──────────────────────────────────────
                    Expanded(
                      child: GestureDetector(
                        onTap: widget.onContentChanged != null
                            ? () => _showEditDialog(context)
                            : null,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(8, 6, 8, 20),
                          child: Text(
                            widget.note.content.isEmpty &&
                                    widget.onContentChanged != null
                                ? 'Toca para editar…'
                                : widget.note.content,
                            style: TextStyle(
                              fontSize: widget.note.fontSize,
                              color: widget.note.content.isEmpty
                                  ? Colors.black38 : Colors.black87,
                              height: 1.3,
                            ),
                            overflow: TextOverflow.fade,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                // ── Resize grip (bottom-right) ────────────────────────────
                if (widget.onResized != null)
                  Positioned(
                    right: 0, bottom: 0,
                    child: MouseRegion(
                      cursor: SystemMouseCursors.resizeDownRight,
                      child: GestureDetector(
                        onPanUpdate: (d) => setState(() {
                          _w = (_w + d.delta.dx).clamp(_kMinW, 9999);
                          _h = (_h + d.delta.dy).clamp(_kMinH, 9999);
                        }),
                        onPanEnd: (_) => widget.onResized?.call(_w, _h),
                        child: Container(
                          width: 20, height: 20,
                          alignment: Alignment.bottomRight,
                          padding: const EdgeInsets.all(3),
                          child: const Icon(Icons.open_in_full,
                              size: 11, color: Colors.black38),
                        ),
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
// Settings dialog
// ─────────────────────────────────────────────────────────────────────────────

class _NoteSettings {
  final String? color;
  final double  fontSize;
  final double  alpha;
  const _NoteSettings(this.color, this.fontSize, this.alpha);
}

class _NoteSettingsDialog extends StatefulWidget {
  final String  initialColor;
  final double  initialFontSize;
  final double  initialAlpha;

  const _NoteSettingsDialog({
    required this.initialColor,
    required this.initialFontSize,
    required this.initialAlpha,
  });

  @override
  State<_NoteSettingsDialog> createState() => _NoteSettingsDialogState();
}

class _NoteSettingsDialogState extends State<_NoteSettingsDialog> {
  late String _color;
  late double _fontSize;
  late double _alpha;

  @override
  void initState() {
    super.initState();
    // Normalise: if stored color matches a preset use that, else fallback to yellow
    _color    = _kNoteColors.any((e) => e.$2 == widget.initialColor)
        ? widget.initialColor
        : _kNoteColors.first.$2;
    _fontSize = widget.initialFontSize.clamp(9.0, 32.0);
    _alpha    = widget.initialAlpha.clamp(0.1, 1.0);
  }

  static Color _hex(String hex) {
    final h = hex.replaceFirst('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF1E1E1E),
      title: const Row(children: [
        Icon(Icons.tune, color: Colors.tealAccent, size: 20),
        SizedBox(width: 8),
        Text('Configuración de nota',
            style: TextStyle(color: Colors.white, fontSize: 16)),
      ]),
      content: SizedBox(
        width: 340,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Colour picker ─────────────────────────────────────────────
            const Text('Color',
                style: TextStyle(color: Colors.white54, fontSize: 12)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _kNoteColors.map((entry) {
                final selected = _color == entry.$2;
                return GestureDetector(
                  onTap: () => setState(() => _color = entry.$2),
                  child: Tooltip(
                    message: entry.$1,
                    child: Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(
                        color:  _hex(entry.$2),
                        shape:  BoxShape.circle,
                        border: Border.all(
                          color: selected
                              ? Colors.white
                              : Colors.white.withOpacity(0.18),
                          width: selected ? 2.5 : 1,
                        ),
                        boxShadow: selected
                            ? [BoxShadow(color: _hex(entry.$2).withOpacity(0.6),
                                blurRadius: 8)]
                            : null,
                      ),
                      child: selected
                          ? const Icon(Icons.check,
                              size: 16, color: Colors.black54)
                          : null,
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 20),
            const Divider(color: Colors.white12),
            const SizedBox(height: 10),

            // ── Font size ─────────────────────────────────────────────────
            Row(children: [
              const Text('Tamaño de fuente',
                  style: TextStyle(color: Colors.white54, fontSize: 12)),
              const Spacer(),
              Text('${_fontSize.round()} pt',
                  style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ]),
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                activeTrackColor:   Colors.tealAccent,
                thumbColor:         Colors.tealAccent,
                inactiveTrackColor: Colors.white12,
                overlayColor:       Colors.tealAccent.withOpacity(0.15),
              ),
              child: Slider(
                value: _fontSize,
                min: 9, max: 32, divisions: 23,
                onChanged: (v) => setState(() => _fontSize = v),
              ),
            ),

            const SizedBox(height: 6),

            // ── Transparency ──────────────────────────────────────────────
            Row(children: [
              const Text('Transparencia',
                  style: TextStyle(color: Colors.white54, fontSize: 12)),
              const Spacer(),
              Text('${(_alpha * 100).round()} %',
                  style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ]),
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                activeTrackColor:   Colors.tealAccent,
                thumbColor:         Colors.tealAccent,
                inactiveTrackColor: Colors.white12,
                overlayColor:       Colors.tealAccent.withOpacity(0.15),
              ),
              child: Slider(
                value: _alpha,
                min: 0.1, max: 1.0, divisions: 18,
                onChanged: (v) => setState(() => _alpha = v),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar',
              style: TextStyle(color: Colors.white54)),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context)
              .pop(_NoteSettings(_color, _fontSize, _alpha)),
          style: FilledButton.styleFrom(
              backgroundColor: Colors.tealAccent,
              foregroundColor: Colors.black),
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}
