import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/theme.dart';
import '../models/rss_item.dart';
import '../services/rss_service.dart';

class RssScreen extends StatefulWidget {
  const RssScreen({super.key});
  @override
  State<RssScreen> createState() => _RssScreenState();
}

class _RssScreenState extends State<RssScreen> {
  static const _orange = CyberColors.orange;
  static const _gray   = CyberColors.gray;

  static const _feedLabels = {
    'mastodon':  'Mastodon',
    'blog':      'Blog',
    'news':      'Noticias',
    'youtube':   'YouTube',
    'favorites': 'Favoritos',
    'saved':     'Guardados',
  };
  static const _feedIcons = {
    'mastodon':  Icons.people_alt_outlined,
    'blog':      Icons.article_outlined,
    'news':      Icons.newspaper_outlined,
    'youtube':   Icons.play_circle_outline,
    'favorites': Icons.star_outline,
    'saved':     Icons.bookmark_outline,
  };

  String _selectedFeed = 'mastodon';
  String _youtubeTag   = 'null';

  Map<String, List<RssItem>> _items = {};
  Map<String, DateTime?>     _lastSync = {};

  bool    _downloading      = false;
  int     _downloadProgress = 0;
  String? _errorMsg;

  String get _selectedFeedKey => _selectedFeed == 'youtube'
      ? RssService.youtubeFileKey(_youtubeTag)
      : _selectedFeed;

  int get _totalDownloads =>
      RssService.baseFeedTypes.length + RssService.ytTags.length;

  @override
  void initState() { super.initState(); _loadAll(); }

  Future<void> _loadAll() async {
    final items = <String, List<RssItem>>{};
    final syncs = <String, DateTime?>{};
    for (final type in RssService.baseFeedTypes) {
      items[type] = await RssService.loadLocalItems(type);
      syncs[type] = await RssService.getLastSync(type);
    }
    for (final tag in RssService.ytTags) {
      final key  = RssService.youtubeFileKey(tag);
      items[key] = await RssService.loadLocalItems(key);
      syncs[key] = await RssService.getLastSync(key);
    }
    if (mounted) setState(() { _items = items; _lastSync = syncs; });
  }

  Future<void> _download() async {
    setState(() { _downloading = true; _downloadProgress = 0; _errorMsg = null; });
    try {
      final results = await RssService.downloadAllFeeds(
        onProgress: (done, total, label) {
          if (mounted) setState(() => _downloadProgress = done);
        },
      );
      final syncs = <String, DateTime?>{};
      for (final type in RssService.baseFeedTypes) {
        syncs[type] = await RssService.getLastSync(type);
      }
      for (final tag in RssService.ytTags) {
        final key  = RssService.youtubeFileKey(tag);
        syncs[key] = await RssService.getLastSync(key);
      }
      if (mounted) setState(() {
        _items    = {..._items, ...results};
        _lastSync = syncs;
        _downloading = false;
      });
    } catch (e) {
      if (mounted) setState(() {
        _downloading = false;
        _errorMsg = e.toString();
      });
    }
  }

  String _formatSync(DateTime? dt) {
    if (dt == null) return 'Nunca';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Ahora mismo';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Hace ${diff.inHours}h';
    return DateFormat('dd/MM HH:mm').format(dt);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  void _copyLink(String link) {
    if (link.isEmpty) return;
    Clipboard.setData(ClipboardData(text: link));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: const Text('// URL COPIADA //',
          style: TextStyle(fontFamily: 'monospace', color: CyberColors.bg)),
      backgroundColor: _orange,
      duration: const Duration(seconds: 2),
      behavior: SnackBarBehavior.floating,
    ));
  }

  void _openLink(String link) {
    final uri = Uri.tryParse(link);
    if (uri != null && uri.hasScheme) {
      launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 800;
    final feedItems = _items[_selectedFeedKey] ?? [];
    final lastSync  = _lastSync[_selectedFeedKey];

    return Scaffold(
      backgroundColor: CyberColors.bg,
      appBar: AppBar(
        backgroundColor: CyberColors.bgPanel,
        title: const Row(children: [
          Icon(Icons.rss_feed, color: _orange, size: 18),
          SizedBox(width: 8),
          Text('// RSS //', style: TextStyle(color: _orange, letterSpacing: 3, fontSize: 13)),
        ]),
        actions: [
          if (_downloading)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(child: Text(
                '$_downloadProgress/$_totalDownloads',
                style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: _orange),
              )),
            ),
          IconButton(
            icon: _downloading
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: _orange))
                : const Icon(Icons.cloud_download_outlined, color: _orange),
            onPressed: _downloading ? null : _download,
            tooltip: 'Descargar todo',
          ),
        ],
      ),
      body: isDesktop
          ? _buildDesktop(feedItems, lastSync)
          : _buildMobile(feedItems, lastSync),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT — sidebar feeds + content with hover/click actions
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildDesktop(List<RssItem> feedItems, DateTime? lastSync) {
    return Row(children: [
      // ── Sidebar ──────────────────────────────────────────────────────────
      SizedBox(
        width: 220,
        child: Container(
          color: CyberColors.bgPanel,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: CyberLabel('FEEDS', color: _orange),
              ),
              ...['mastodon', 'blog', 'news', 'youtube', 'favorites', 'saved'].map((feed) =>
                _SidebarTile(
                  label:    _feedLabels[feed]!,
                  icon:     _feedIcons[feed]!,
                  selected: _selectedFeed == feed,
                  onTap:    () => setState(() { _selectedFeed = feed; _youtubeTag = 'null'; }),
                ),
              ),
              if (_selectedFeed == 'youtube') ...[
                const SizedBox(height: 8),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: CyberLabel('SUBCATEGORÍA', color: _orange),
                ),
                const SizedBox(height: 8),
                ...RssService.ytTags.map((tag) => _SidebarTile(
                  label:    RssService.ytTagLabels[tag] ?? tag,
                  icon:     Icons.tag,
                  selected: _youtubeTag == tag,
                  onTap:    () => setState(() => _youtubeTag = tag),
                  indent:   true,
                )),
              ],
            ],
          ),
        ),
      ),
      Container(width: 1, color: CyberColors.border),
      // ── Content ──────────────────────────────────────────────────────────
      Expanded(child: Column(children: [
        _buildStatusBar(feedItems.length, lastSync),
        if (_errorMsg != null) _buildErrorBar(),
        Expanded(child: _buildItemList(feedItems, isDesktop: true)),
      ])),
    ]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE / TABLET LAYOUT — chips + list (same as mobileApp approach)
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildMobile(List<RssItem> feedItems, DateTime? lastSync) {
    return Column(children: [
      // ── Feed chips ─────────────────────────────────────────────────────
      Container(
        color: CyberColors.bgPanel,
        height: 48,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          children: ['mastodon', 'blog', 'news', 'youtube', 'favorites', 'saved'].map((feed) {
            final selected = _selectedFeed == feed;
            return GestureDetector(
              onTap: () => setState(() { _selectedFeed = feed; _youtubeTag = 'null'; }),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                margin:  const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color:        selected ? _orange.withValues(alpha: 0.15) : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: selected ? _orange : CyberColors.border),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(_feedIcons[feed]!, size: 13, color: selected ? _orange : _gray),
                  const SizedBox(width: 5),
                  Text(_feedLabels[feed]!,
                      style: TextStyle(color: selected ? _orange : _gray,
                          fontSize: 12, fontFamily: 'monospace')),
                ]),
              ),
            );
          }).toList(),
        ),
      ),
      // ── YouTube sub-chips ──────────────────────────────────────────────
      if (_selectedFeed == 'youtube')
        Container(
          color: CyberColors.bgPanel,
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            children: RssService.ytTags.map((tag) {
              final selected = _youtubeTag == tag;
              return GestureDetector(
                onTap: () => setState(() => _youtubeTag = tag),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  margin:  const EdgeInsets.only(right: 7),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: selected ? _orange.withValues(alpha: 0.12) : Colors.transparent,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: selected ? _orange : CyberColors.border),
                  ),
                  child: Center(child: Text(
                    RssService.ytTagLabels[tag] ?? tag,
                    style: TextStyle(color: selected ? _orange : _gray,
                        fontSize: 11, fontFamily: 'monospace'),
                  )),
                ),
              );
            }).toList(),
          ),
        ),
      _buildStatusBar(feedItems.length, lastSync),
      if (_errorMsg != null) _buildErrorBar(),
      Expanded(child: _buildItemList(feedItems, isDesktop: false)),
    ]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED WIDGETS
  // ═══════════════════════════════════════════════════════════════════════════

  Widget _buildStatusBar(int count, DateTime? lastSync) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: CyberColors.bgLight,
      child: Row(children: [
        Text('$count artículos',
            style: const TextStyle(fontFamily: 'monospace', fontSize: 10, color: _gray)),
        const Spacer(),
        Text('Sync: ${_formatSync(lastSync)}',
            style: const TextStyle(fontFamily: 'monospace', fontSize: 10, color: _gray)),
      ]),
    );
  }

  Widget _buildErrorBar() {
    return Container(
      color: CyberColors.magenta.withValues(alpha: 0.1),
      padding: const EdgeInsets.all(8),
      child: Row(children: [
        Expanded(child: Text(_errorMsg!,
            style: const TextStyle(color: CyberColors.magenta,
                fontFamily: 'monospace', fontSize: 10))),
        GestureDetector(
          onTap: () => setState(() => _errorMsg = null),
          child: const Icon(Icons.close, color: CyberColors.magenta, size: 14),
        ),
      ]),
    );
  }

  Widget _buildItemList(List<RssItem> items, {required bool isDesktop}) {
    if (items.isEmpty) {
      return Center(child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_feedIcons[_selectedFeed], color: _orange.withValues(alpha: 0.2), size: 56),
          const SizedBox(height: 16),
          const Text('// SIN ARTÍCULOS //',
              style: TextStyle(fontFamily: 'monospace', color: _gray,
                  letterSpacing: 2, fontSize: 12)),
          const SizedBox(height: 8),
          Text('Pulsa ☁ para sincronizar',
              style: TextStyle(color: _gray.withValues(alpha: 0.5), fontSize: 11)),
        ],
      ));
    }
    return ListView.builder(
      itemCount: items.length,
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemBuilder: (_, i) => _RssItemCard(
        item: items[i],
        isDesktop: isDesktop,
        onCopy: () => _copyLink(items[i].link),
        onOpen: items[i].link.isNotEmpty ? () => _openLink(items[i].link) : null,
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RSS ITEM CARD — single responsibility widget
// ═══════════════════════════════════════════════════════════════════════════════
// Mobile/tablet (touch): tap anywhere on the card → copy link to clipboard.
// Desktop (mouse):       tap anywhere on the card → copy link to clipboard.
//                        Separate "open in browser" icon button on the right.
// ═══════════════════════════════════════════════════════════════════════════════

class _RssItemCard extends StatelessWidget {
  final RssItem     item;
  final bool        isDesktop;
  final VoidCallback onCopy;
  final VoidCallback? onOpen;

  const _RssItemCard({
    required this.item,
    required this.isDesktop,
    required this.onCopy,
    this.onOpen,
  });

  static const _bg     = CyberColors.bgPanel;
  static const _border = CyberColors.border;
  static const _orange = CyberColors.orange;
  static const _white  = CyberColors.white;
  static const _gray   = CyberColors.gray;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onCopy,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _bg,
          border: Border.all(color: _border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Title ──────────────────────────────────────────────────────
            if (item.title.isNotEmpty) ...[
              Text(item.title,
                  maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: _white, fontSize: 14,
                      fontWeight: FontWeight.bold, height: 1.35)),
              const SizedBox(height: 5),
            ],
            // ── Author · date ──────────────────────────────────────────────
            if (item.authorDate.isNotEmpty)
              Text(item.authorDate,
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: _orange.withValues(alpha: 0.9),
                      fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.3)),
            // ── Content ────────────────────────────────────────────────────
            if (item.content.isNotEmpty) ...[
              const SizedBox(height: 7),
              Text(item.content,
                  maxLines: 3, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: _gray, fontSize: 12, height: 1.4)),
            ],
            // ── Link row ───────────────────────────────────────────────────
            if (item.link.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(children: [
                Icon(Icons.link, size: 12, color: _orange.withValues(alpha: 0.6)),
                const SizedBox(width: 4),
                Expanded(child: Text(item.link,
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: _orange.withValues(alpha: 0.55),
                        fontSize: 10, fontFamily: 'monospace'))),
                // Desktop: separate button to open in browser
                if (isDesktop && onOpen != null) ...[
                  const SizedBox(width: 8),
                  _ActionIcon(
                    icon: Icons.open_in_new,
                    tooltip: 'Abrir en navegador',
                    onTap: onOpen!,
                  ),
                ],
                const SizedBox(width: 4),
                _ActionIcon(
                  icon: Icons.copy_outlined,
                  tooltip: 'Copiar URL',
                  onTap: onCopy,
                ),
              ]),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Small icon button used inside the card ──────────────────────────────────
class _ActionIcon extends StatelessWidget {
  final IconData     icon;
  final String       tooltip;
  final VoidCallback onTap;

  const _ActionIcon({required this.icon, required this.tooltip, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: CyberColors.border),
          ),
          child: Icon(icon, size: 13, color: CyberColors.orange.withValues(alpha: 0.7)),
        ),
      ),
    );
  }
}

// ── Sidebar tile for desktop layout ─────────────────────────────────────────
class _SidebarTile extends StatelessWidget {
  final String     label;
  final IconData   icon;
  final bool       selected;
  final VoidCallback onTap;
  final bool       indent;

  const _SidebarTile({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
    this.indent = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.only(
          left: indent ? 32 : 16, right: 16, top: 10, bottom: 10,
        ),
        color: selected ? CyberColors.orange.withValues(alpha: 0.1) : null,
        child: Row(children: [
          Icon(icon, size: 16, color: selected ? CyberColors.orange : CyberColors.gray),
          const SizedBox(width: 10),
          Text(label, style: TextStyle(
            fontFamily: 'monospace', fontSize: 11, letterSpacing: 1,
            color: selected ? CyberColors.orange : CyberColors.gray,
          )),
        ]),
      ),
    );
  }
}
