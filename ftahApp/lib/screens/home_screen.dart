import 'package:flutter/material.dart';
import '../core/theme.dart';
import 'pomodoro_screen.dart';
import 'weather_screen.dart';
import 'notes_screen.dart';
import 'rss_screen.dart';
import 'settings_screen.dart';

// ── Navigation items ─────────────────────────────────────────────────────────
const _items = [
  _NavItem(label: 'POMODORO', icon: Icons.timer_outlined,       activeIcon: Icons.timer,          color: CyberColors.magenta),
  _NavItem(label: 'TIEMPO',   icon: Icons.cloud_outlined,       activeIcon: Icons.cloud,           color: CyberColors.amber),
  _NavItem(label: 'NEO NOTAS',icon: Icons.description_outlined, activeIcon: Icons.description,     color: CyberColors.green),
  _NavItem(label: 'RSS',      icon: Icons.rss_feed_outlined,    activeIcon: Icons.rss_feed,        color: CyberColors.orange),
];

class _NavItem {
  final String   label;
  final IconData icon;
  final IconData activeIcon;
  final Color    color;
  const _NavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.color,
  });
}

// ── HomeScreen ───────────────────────────────────────────────────────────────
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  static const _screens = [
    PomodoroScreen(),
    WeatherScreen(),
    NotesScreen(),
    RssScreen(),
  ];

  void _openSettings() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const SettingsScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 600;

    return isDesktop
        ? _DesktopLayout(
            index:       _index,
            onSelect:    (i) => setState(() => _index = i),
            onSettings:  _openSettings,
            child:       IndexedStack(index: _index, children: _screens),
          )
        : _MobileLayout(
            index:       _index,
            onSelect:    (i) => setState(() => _index = i),
            onSettings:  _openSettings,
            child:       IndexedStack(index: _index, children: _screens),
          );
  }
}

// ── Desktop layout: NavigationRail + content ─────────────────────────────────
class _DesktopLayout extends StatelessWidget {
  final int      index;
  final Widget   child;
  final ValueChanged<int> onSelect;
  final VoidCallback onSettings;

  const _DesktopLayout({
    required this.index,
    required this.child,
    required this.onSelect,
    required this.onSettings,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CyberColors.bg,
      body: Row(
        children: [
          // ── Navigation rail ───────────────────────────────────────────────
          Container(
            decoration: const BoxDecoration(
              color: CyberColors.bgPanel,
              border: Border(right: BorderSide(color: CyberColors.border, width: 1)),
            ),
            child: NavigationRail(
              backgroundColor:  Colors.transparent,
              selectedIndex:    index,
              onDestinationSelected: onSelect,
              extended:         false,
              minWidth:         72,
              labelType:        NavigationRailLabelType.all,
              leading: Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Column(children: [
                  const Icon(Icons.home_outlined, color: CyberColors.cyan, size: 28),
                  const SizedBox(height: 4),
                  const Text('FT@H', style: TextStyle(
                    fontFamily: 'monospace', fontSize: 9,
                    letterSpacing: 1.5, color: CyberColors.cyan,
                  )),
                  const SizedBox(height: 16),
                  Container(height: 1, width: 40, color: CyberColors.border),
                ]),
              ),
              trailing: Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Tooltip(
                  message: 'Ajustes',
                  child: IconButton(
                    icon: const Icon(Icons.settings_outlined, color: CyberColors.gray),
                    onPressed: onSettings,
                    iconSize: 22,
                  ),
                ),
              ),
              destinations: _items.map((item) {
                final selected = _items.indexOf(item) == index;
                return NavigationRailDestination(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  icon: Icon(item.icon,
                      color: selected ? item.color : CyberColors.gray),
                  selectedIcon: Icon(item.activeIcon,
                      color: item.color,
                      shadows: [Shadow(color: item.color.withValues(alpha: 0.6), blurRadius: 8)]),
                  label: Text(
                    item.label,
                    style: TextStyle(
                      fontFamily:   'monospace',
                      fontSize:      9,
                      letterSpacing: 1,
                      color:         selected ? item.color : CyberColors.gray,
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          // ── Content ───────────────────────────────────────────────────────
          Expanded(child: child),
        ],
      ),
    );
  }
}

// ── Mobile layout: BottomNavigationBar + settings in AppBar ──────────────────
class _MobileLayout extends StatelessWidget {
  final int      index;
  final Widget   child;
  final ValueChanged<int> onSelect;
  final VoidCallback onSettings;

  const _MobileLayout({
    required this.index,
    required this.child,
    required this.onSelect,
    required this.onSettings,
  });

  @override
  Widget build(BuildContext context) {
    final activeColor = _items[index].color;

    return Scaffold(
      backgroundColor: CyberColors.bg,
      // Thin top bar with just the settings icon for mobile
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(36),
        child: AppBar(
          backgroundColor: CyberColors.bgPanel,
          elevation: 0,
          automaticallyImplyLeading: false,
          actions: [
            IconButton(
              icon: const Icon(Icons.settings_outlined,
                  color: CyberColors.gray, size: 18),
              onPressed: onSettings,
              tooltip: 'Ajustes',
              padding: EdgeInsets.zero,
            ),
            const SizedBox(width: 8),
          ],
        ),
      ),
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color:  CyberColors.bgPanel,
          border: Border(top: BorderSide(color: CyberColors.border, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: index,
          onTap:        onSelect,
          items: _items.asMap().entries.map((e) {
            final selected = e.key == index;
            final item     = e.value;
            return BottomNavigationBarItem(
              icon: Icon(item.icon,
                  color: selected ? item.color : CyberColors.gray,
                  shadows: selected
                      ? [Shadow(color: item.color.withValues(alpha: 0.6), blurRadius: 8)]
                      : null),
              label: item.label,
            );
          }).toList(),
          selectedItemColor:    activeColor,
          unselectedItemColor:  CyberColors.gray,
          backgroundColor:      Colors.transparent,
          elevation:            0,
          type:                 BottomNavigationBarType.fixed,
          selectedLabelStyle:   const TextStyle(
              fontFamily: 'monospace', fontSize: 9, letterSpacing: 1),
          unselectedLabelStyle: const TextStyle(
              fontFamily: 'monospace', fontSize: 9, letterSpacing: 1),
        ),
      ),
    );
  }
}
