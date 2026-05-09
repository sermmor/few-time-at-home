import 'dart:math';
import 'package:flutter/material.dart';
import 'notes_theme.dart';

class NotesGlitchEffect extends StatefulWidget {
  final Widget child;
  final bool isActive;

  const NotesGlitchEffect({super.key, required this.child, this.isActive = false});

  @override
  State<NotesGlitchEffect> createState() => _NotesGlitchEffectState();
}

class _NotesGlitchEffectState extends State<NotesGlitchEffect>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    if (widget.isActive) _controller.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(covariant NotesGlitchEffect oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive && !oldWidget.isActive) {
      _controller.repeat(reverse: true);
    } else if (!widget.isActive && oldWidget.isActive) {
      _controller.stop();
      _controller.reset();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        if (!widget.isActive || _controller.value == 0) return widget.child;
        final isGlitching = _random.nextDouble() > 0.5;
        if (!isGlitching) return widget.child;

        final offsetX = (_random.nextDouble() * 6) - 3;
        final offsetY = (_random.nextDouble() * 2) - 1;
        final color = _random.nextBool()
            ? NotesTheme.neonMagenta
            : NotesTheme.neonCyan;

        return Stack(
          children: [
            Transform.translate(
              offset: Offset(offsetX, offsetY),
              child: Opacity(
                opacity: 0.5,
                child: ColorFiltered(
                  colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
                  child: widget.child,
                ),
              ),
            ),
            Transform.translate(
              offset: Offset(-offsetX, -offsetY),
              child: widget.child,
            ),
          ],
        );
      },
    );
  }
}
