import 'package:flutter/material.dart';
import '../../../core/models/desktop_config.dart';

/// Renders a single sticky note on the desktop canvas.
/// Position/size are already scaled by the caller.
class StickyNoteWidget extends StatelessWidget {
  final StickyNote note;
  final double left, top, width, height;

  const StickyNoteWidget({
    super.key,
    required this.note,
    required this.left,
    required this.top,
    required this.width,
    required this.height,
  });

  Color get _bgColor {
    if (note.color == null) return const Color(0xFFFFF176); // default yellow
    final hex = note.color!.replaceFirst('#', '');
    try {
      return Color(int.parse('FF$hex', radix: 16));
    } catch (_) {
      return const Color(0xFFFFF176);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bg = _bgColor;
    // Darken slightly for header bar
    final headerBg = Color.fromARGB(
      bg.alpha,
      (bg.red   * 0.85).round(),
      (bg.green * 0.85).round(),
      (bg.blue  * 0.85).round(),
    );

    return Positioned(
      left: left, top: top,
      width: width, height: height,
      child: Opacity(
        opacity: note.alpha.clamp(0.0, 1.0),
        child: Container(
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(4),
            boxShadow: const [BoxShadow(blurRadius: 6, spreadRadius: 1, color: Colors.black26)],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header strip
              Container(
                height: 20,
                decoration: BoxDecoration(
                  color: headerBg,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                ),
              ),
              // Content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  child: Text(
                    note.content,
                    style: TextStyle(
                      fontSize: note.fontSize,
                      color: Colors.black87,
                      height: 1.3,
                    ),
                    overflow: TextOverflow.fade,
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
