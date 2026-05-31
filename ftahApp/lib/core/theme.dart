import 'package:flutter/material.dart';

// ── Cyberpunk palette ─────────────────────────────────────────────────────────
class CyberColors {
  CyberColors._();

  static const bg       = Color(0xFF020C18);
  static const bgPanel  = Color(0xFF071526);
  static const bgLight  = Color(0xFF0A1E3A);

  static const cyan     = Color(0xFF00FFE7);
  static const cyanDim  = Color(0x9900FFE7);
  static const magenta  = Color(0xFFFF00CC);
  static const amber    = Color(0xFFFFBB00);
  static const green    = Color(0xFF00FF88);
  static const orange   = Color(0xFFFF7700);
  static const purple   = Color(0xFF7F00FF);
  static const blue     = Color(0xFF4A90FF);

  static const white    = Color(0xFFE8F0F8);
  static const gray     = Color(0xFF7A9BB8);
  static const border   = Color(0xFF1A3A5C);
}

// ── App theme ────────────────────────────────────────────────────────────────
ThemeData buildCyberTheme() => ThemeData.dark().copyWith(
  scaffoldBackgroundColor: CyberColors.bg,
  colorScheme: const ColorScheme.dark(
    primary:   CyberColors.cyan,
    secondary: CyberColors.magenta,
    surface:   CyberColors.bgPanel,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: CyberColors.bgPanel,
    foregroundColor: CyberColors.cyan,
    elevation: 0,
    titleTextStyle: TextStyle(
      fontFamily:    'monospace',
      fontSize:      16,
      fontWeight:    FontWeight.bold,
      letterSpacing: 3,
      color:         CyberColors.cyan,
    ),
  ),
  navigationRailTheme: const NavigationRailThemeData(
    backgroundColor:          CyberColors.bgPanel,
    selectedIconTheme:        IconThemeData(color: CyberColors.cyan),
    unselectedIconTheme:      IconThemeData(color: CyberColors.gray),
    selectedLabelTextStyle:   TextStyle(
      color:         CyberColors.cyan,
      fontFamily:    'monospace',
      fontSize:       10,
      letterSpacing:  1.5,
    ),
    unselectedLabelTextStyle: TextStyle(
      color:         CyberColors.gray,
      fontFamily:    'monospace',
      fontSize:       10,
      letterSpacing:  1.5,
    ),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor:      CyberColors.bgPanel,
    selectedItemColor:    CyberColors.cyan,
    unselectedItemColor:  CyberColors.gray,
    type:                 BottomNavigationBarType.fixed,
    selectedLabelStyle:   TextStyle(fontFamily: 'monospace', fontSize: 9, letterSpacing: 1),
    unselectedLabelStyle: TextStyle(fontFamily: 'monospace', fontSize: 9, letterSpacing: 1),
  ),
);

// ── Reusable styled widgets ───────────────────────────────────────────────────

/// Panel container with cyber border
class CyberPanel extends StatelessWidget {
  final Widget  child;
  final Color   borderColor;
  final double  borderWidth;
  final EdgeInsetsGeometry? padding;

  const CyberPanel({
    super.key,
    required this.child,
    this.borderColor  = CyberColors.border,
    this.borderWidth  = 1,
    this.padding,
  });

  @override
  Widget build(BuildContext context) => Container(
    padding: padding ?? const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: CyberColors.bgPanel,
      borderRadius: BorderRadius.circular(6),
      border: Border.all(color: borderColor, width: borderWidth),
    ),
    child: child,
  );
}

/// Section header: `// LABEL //`
class CyberLabel extends StatelessWidget {
  final String text;
  final Color  color;
  final double fontSize;

  const CyberLabel(this.text, {
    super.key,
    this.color    = CyberColors.gray,
    this.fontSize = 10,
  });

  @override
  Widget build(BuildContext context) => Text(
    '// $text //',
    style: TextStyle(
      fontFamily:    'monospace',
      fontSize:      fontSize,
      letterSpacing: 2,
      color:         color,
    ),
  );
}

/// Cyber-styled button
class CyberButton extends StatelessWidget {
  final String   label;
  final Color    color;
  final VoidCallback? onPressed;
  final bool     fullWidth;
  final IconData? icon;

  const CyberButton({
    super.key,
    required this.label,
    required this.color,
    this.onPressed,
    this.fullWidth = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    Widget content = Row(
      mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 6),
        ],
        Text(
          label,
          style: TextStyle(
            fontFamily:    'monospace',
            fontSize:       12,
            letterSpacing:  1.5,
            color:          color,
            fontWeight:     FontWeight.bold,
          ),
        ),
      ],
    );

    Widget btn = GestureDetector(
      onTap: onPressed,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color:        color.withOpacity(onPressed == null ? 0.05 : 0.12),
          borderRadius: BorderRadius.circular(4),
          border:       Border.all(
            color: onPressed == null ? color.withOpacity(0.3) : color,
            width: 1,
          ),
          boxShadow: onPressed == null ? null : [
            BoxShadow(color: color.withOpacity(0.25), blurRadius: 8),
          ],
        ),
        child: content,
      ),
    );

    return fullWidth ? SizedBox(width: double.infinity, child: btn) : btn;
  }
}
