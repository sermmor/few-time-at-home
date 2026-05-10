import 'package:flutter/material.dart';
import '../../../core/constants.dart';

// ── Direction ─────────────────────────────────────────────────────────────────

enum NavDirection { right, left, down, up }

// ── Colour helpers ────────────────────────────────────────────────────────────

Color wsColor(int i) =>
    Color(kBaseColorValues[i % kBaseColorValues.length]);

// ── getDirection (grid-aware, same logic as DesktopCommons.tsx) ───────────────

NavDirection getDirection(int from, int to, int cols) {
  final fromCol = from % cols;
  final toCol   = to   % cols;
  final fromRow = from ~/ cols;
  final toRow   = to   ~/ cols;
  if      (toCol > fromCol) return NavDirection.right;
  else if (toCol < fromCol) return NavDirection.left;
  else if (toRow > fromRow) return NavDirection.down;
  else                      return NavDirection.up;
}

// ── SlideState ────────────────────────────────────────────────────────────────

class SlideState {
  final int          key;          // unique per transition (timestamp)
  final Color        color;        // outgoing workspace base colour
  final String?      wallpaperPath; // local cached path, or null
  final NavDirection dir;

  const SlideState({
    required this.key,
    required this.color,
    this.wallpaperPath,
    required this.dir,
  });
}

// ── Workspace switcher overlay ────────────────────────────────────────────────

/// The translucent grid shown while Shift is held (normal mode) or as a hint
/// in tablet mode. Pointer-events are ignored (display-only).
class WorkspaceOverlay extends StatelessWidget {
  final int  activeWs;
  final int  rows;
  final int  cols;
  final bool visible;

  const WorkspaceOverlay({
    super.key,
    required this.activeWs,
    required this.rows,
    required this.cols,
    required this.visible,
  });

  static const double _cellW   = 112;
  static const double _cellH   = 72;
  static const double _gap     = 10;
  static const double _padding = 14;
  static const double _radius  = 5;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity:  visible ? 1.0 : 0.0,
      duration: const Duration(milliseconds: 150),
      child: IgnorePointer(
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(_padding),
            decoration: BoxDecoration(
              color:        Colors.white.withOpacity(0.10),
              borderRadius: BorderRadius.circular(10),
              border:       Border.all(color: Colors.white.withOpacity(0.40)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (int r = 0; r < rows; r++)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (int c = 0; c < cols; c++)
                        Container(
                          margin: const EdgeInsets.all(_gap / 2),
                          width:  _cellW,
                          height: _cellH,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(_radius),
                            color: r * cols + c == activeWs
                                ? Colors.white
                                : Colors.white.withOpacity(0.40),
                          ),
                        ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
