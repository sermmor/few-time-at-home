import 'package:flutter/material.dart';
import '../../../core/models/desktop_config.dart';

const double _kMinW = 120.0;
const double _kMinH =  80.0;

/// Sticky note widget — draggable from header strip, tappable to edit content.
/// Supports:
///  • Delete  — ✕ button in the header strip (visible on hover)
///  • Resize  — drag the bottom-right grip
/// All callbacks receive **scaled (screen) coordinates**; WorkspaceCanvas
/// converts them back to reference coords before persisting.
class StickyNoteWidget extends StatefulWidget {
  final StickyNote note;
  final double left, top, width, height;

  final void Function(double x, double y)?      onMoved;
  final void Function(String content)?          onContentChanged;
  final VoidCallback?                           onDelete;
  final void Function(double w, double h)?      onResized;

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
    _x = widget.left;
    _y = widget.top;
    _w = widget.width;
    _h = widget.height;
  }

  @override
  void didUpdateWidget(covariant StickyNoteWidget old) {
    super.didUpdateWidget(old);
    if (old.left  != widget.left)  _x = widget.left;
    if (old.top   != widget.top)   _y = widget.top;
    if (old.width != widget.width) _w = widget.width;
    if (old.height!= widget.height)_h = widget.height;
  }

  Color get _bgColor {
    if (widget.note.color == null) return const Color(0xFFFFF176);
    final hex = widget.note.color!.replaceFirst('#', '');
    try {
      return Color(int.parse('FF$hex', radix: 16));
    } catch (_) {
      return const Color(0xFFFFF176);
    }
  }

  Color _darken(Color c, double factor) => Color.fromARGB(
    c.alpha,
    (c.red   * factor).round(),
    (c.green * factor).round(),
    (c.blue  * factor).round(),
  );

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
            child: const Text('Cancelar',
                style: TextStyle(color: Colors.white54)),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(ctrl.text),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.tealAccent,
              foregroundColor: Colors.black,
            ),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
    if (result != null) widget.onContentChanged?.call(result);
  }

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
                // ── Main column (header + content) ─────────────────────────
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header — drag handle
                    MouseRegion(
                      onEnter: (_) => setState(() => _headerHovered = true),
                      onExit:  (_) => setState(() => _headerHovered = false),
                      child: GestureDetector(
                        onPanUpdate: (d) => setState(() {
                          _x += d.delta.dx;
                          _y += d.delta.dy;
                        }),
                        onPanEnd: (_) => widget.onMoved?.call(_x, _y),
                        child: Container(
                          height: 22,
                          decoration: BoxDecoration(
                            color: headerBg,
                            borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(4)),
                          ),
                          child: Row(
                            children: [
                              const Expanded(
                                child: Center(
                                  child: Icon(Icons.drag_handle,
                                      size: 14, color: Colors.black38),
                                ),
                              ),
                              // Delete button — only if callback provided
                              if (widget.onDelete != null)
                                AnimatedOpacity(
                                  opacity: _headerHovered ? 1.0 : 0.30,
                                  duration:
                                      const Duration(milliseconds: 150),
                                  child: GestureDetector(
                                    onTap: widget.onDelete,
                                    child: MouseRegion(
                                      cursor: SystemMouseCursors.click,
                                      child: Container(
                                        width: 22, height: 22,
                                        alignment: Alignment.center,
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
                    ),
                    // Content area — tap to edit
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
                                  ? Colors.black38
                                  : Colors.black87,
                              height: 1.3,
                            ),
                            overflow: TextOverflow.fade,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                // ── Resize grip (bottom-right corner) ─────────────────────
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
