import 'package:flutter/material.dart';
import '../../../core/models/desktop_config.dart';

const double _kMinW = 80.0;
const double _kMinH = 60.0;

/// Translucent glass-card panel.
/// Supports:
///  • Drag   — anywhere on the panel body
///  • Delete — ✕ button top-right (fades in on hover)
///  • Resize — drag the bottom-right grip
class DesktopPanelWidget extends StatefulWidget {
  final DesktopPanel panel;
  final double left, top, width, height;

  final void Function(double x, double y)?  onMoved;
  final VoidCallback?                       onDelete;
  final void Function(double w, double h)?  onResized;

  const DesktopPanelWidget({
    super.key,
    required this.panel,
    required this.left,
    required this.top,
    required this.width,
    required this.height,
    this.onMoved,
    this.onDelete,
    this.onResized,
  });

  @override
  State<DesktopPanelWidget> createState() => _DesktopPanelWidgetState();
}

class _DesktopPanelWidgetState extends State<DesktopPanelWidget> {
  late double _x, _y, _w, _h;
  bool _hovered = false;

  @override
  void initState() {
    super.initState();
    _x = widget.left;
    _y = widget.top;
    _w = widget.width;
    _h = widget.height;
  }

  @override
  void didUpdateWidget(covariant DesktopPanelWidget old) {
    super.didUpdateWidget(old);
    if (old.left   != widget.left)   _x = widget.left;
    if (old.top    != widget.top)    _y = widget.top;
    if (old.width  != widget.width)  _w = widget.width;
    if (old.height != widget.height) _h = widget.height;
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: _x, top: _y,
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit:  (_) => setState(() => _hovered = false),
        child: SizedBox(
          width: _w, height: _h,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // ── Draggable panel body ───────────────────────────────────
              Positioned.fill(
                child: GestureDetector(
                  onPanUpdate: (d) => setState(() {
                    _x += d.delta.dx;
                    _y += d.delta.dy;
                  }),
                  onPanEnd: (_) => widget.onMoved?.call(_x, _y),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: Colors.white.withOpacity(0.15)),
                      boxShadow: [
                        BoxShadow(
                          color:        Colors.black.withOpacity(0.25),
                          blurRadius:   12,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // ── Delete button (top-right) ──────────────────────────────
              if (widget.onDelete != null)
                Positioned(
                  top: -8, right: -8,
                  child: AnimatedOpacity(
                    opacity: _hovered ? 1.0 : 0.25,
                    duration: const Duration(milliseconds: 150),
                    child: GestureDetector(
                      onTap: widget.onDelete,
                      child: MouseRegion(
                        cursor: SystemMouseCursors.click,
                        child: Container(
                          width: 22, height: 22,
                          decoration: BoxDecoration(
                            color:  Colors.black.withOpacity(0.65),
                            shape:  BoxShape.circle,
                            border: Border.all(
                                color: Colors.white.withOpacity(0.35),
                                width: 1),
                          ),
                          child: const Icon(Icons.close,
                              size: 13, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                ),

              // ── Resize grip (bottom-right) ─────────────────────────────
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
                        width: 22, height: 22,
                        alignment: Alignment.bottomRight,
                        padding: const EdgeInsets.all(4),
                        child: Icon(Icons.open_in_full,
                            size: 12,
                            color: Colors.white.withOpacity(0.45)),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
