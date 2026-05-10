import 'dart:io';
import 'package:flutter/material.dart';
import '../../../core/constants.dart';
import 'desktop_commons.dart';

/// Animates the OUTGOING workspace sliding off-screen, matching the web
/// frontend's CSS keyframe approach (ws-exit-left/right/up/down).
///
/// The incoming workspace is already visible underneath; this layer is placed
/// on top and slides out in [dir], then calls [onComplete] to be removed.
class SlideLayer extends StatefulWidget {
  final Color        color;
  final String?      wallpaperPath;
  final NavDirection dir;
  final VoidCallback onComplete;

  const SlideLayer({
    required super.key,
    required this.color,
    this.wallpaperPath,
    required this.dir,
    required this.onComplete,
  });

  @override
  State<SlideLayer> createState() => _SlideLayerState();
}

class _SlideLayerState extends State<SlideLayer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<Offset>   _offset;

  Offset _endOffset() => switch (widget.dir) {
    NavDirection.right => const Offset(-1.0, 0),
    NavDirection.left  => const Offset( 1.0, 0),
    NavDirection.down  => const Offset(0, -1.0),
    NavDirection.up    => const Offset(0,  1.0),
  };

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      duration: Duration(milliseconds: kTransitionMs),
      vsync: this,
    );
    _offset = Tween<Offset>(begin: Offset.zero, end: _endOffset())
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
    _ctrl.forward().whenComplete(widget.onComplete);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: IgnorePointer(
        child: SlideTransition(
          position: _offset,
          child: widget.wallpaperPath != null
              ? Image.file(File(widget.wallpaperPath!), fit: BoxFit.cover)
              : Container(color: widget.color),
        ),
      ),
    );
  }
}
