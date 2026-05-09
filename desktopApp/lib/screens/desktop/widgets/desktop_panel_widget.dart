import 'package:flutter/material.dart';
import '../../../core/models/desktop_config.dart';

/// Translucent panel / glass-card widget.
/// Position/size are already scaled by the caller.
class DesktopPanelWidget extends StatelessWidget {
  final DesktopPanel panel;
  final double left, top, width, height;

  const DesktopPanelWidget({
    super.key,
    required this.panel,
    required this.left,
    required this.top,
    required this.width,
    required this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: left, top: top,
      width: width, height: height,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.15)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.25),
              blurRadius: 12,
              spreadRadius: 2,
            ),
          ],
        ),
      ),
    );
  }
}
