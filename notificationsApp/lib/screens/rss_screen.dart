import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../models/rss_item.dart';
import '../services/rss_service.dart';
import '../widgets/rss_item_card.dart';

class RssScreen extends StatefulWidget {
  const RssScreen({super.key});

  @override
  State<RssScreen> createState() => _RssScreenState();
}

class _RssScreenState extends State<RssScreen> {
  // ── Constants ──────────────────────────────────────────────────────────────
  static const _bg      = Color(0xFF020C18);
  static const _bgPanel = Color(0xFF071526);
  static const _bgSub   = Color(0xFF040E1A); // slightly darker for YT sub-row
  static const _orange  = Color(0xFFFF7700);
  static const _white   = Color(0xFFE8F0F8);
  static const _gray    = Color(0xFF7A9BB8);
  static const _border  = Color(0xFF1A3A5C);

  /// Total number of downloads (4 base + 7 YT tags).
  static int get _totalDownloads =>
      RssService.baseFeedTypes.length + RssService.ytTags.length;

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

  // ── State ──────────────────────────────────────────────────────────────────
  String _selectedFeed = 'mastodon';
  String _youtubeTag   = '';           // currently selected YouTube subcategory

  /// All item lists keyed by fileKey:
  /// 'mastodon', 'blog', 'news', 'favorites',
  /// 'youtube_all', 'youtube_sesionesMusica', …
  Map<String, List<RssItem>> _items = {
    for (final t in RssService.baseFeedTypes) t: [],
    for (final tag in RssService.ytTags) RssService.youtubeFileKey(tag): [],
  };
  Map<String, DateTime?> _lastSync = {
    for (final t in RssService.baseFeedTypes) t: null,
    for (final tag in RssService.ytTags) RssService.youtubeFileKey(tag): null,
  };

  bool    _downloading      = false;
  int     _downloadProgress = 0;
  String? _errorMsg;
  bool    _urlExpanded      = true;

  late TextEditingController _urlCtrl;

  // ── Computed ───────────────────────────────────────────────────────────────

  /// The map key for the currently visible feed.
  String get _selectedFeedKey => _selectedFeed == 'youtube'
      ? RssService.youtubeFileKey(_youtubeTag)
      : _selectedFeed;

  // ── Init / dispose ─────────────────────────────────────────────────────────
  @override
  void initState() {
    super.initState();
    _urlCtrl = TextEditingController();
    _loadAll();
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    final url = await RssService.getBackendUrl();
    _urlCtrl.text = url;

    final items = <String, List<RssItem>>{};
    final syncs = <String, DateTime?>{};
    bool hasAny = false;

    for (final type in RssService.baseFeedTypes) {
      final loaded = await RssService.loadLocalItems(type);
      items[type] = loaded;
      syncs[type] = await RssService.getLastSync(type);
      if (loaded.isNotEmpty) hasAny = true;
    }

    for (final tag in RssService.ytTags) {
      final key    = RssService.youtubeFileKey(tag);
      final loaded = await RssService.loadLocalItems(key);
      items[key]   = loaded;
      syncs[key]   = await RssService.getLastSync(key);
      if (loaded.isNotEmpty) hasAny = true;
    }

    if (mounted) {
      setState(() {
        _items       = items;
        _lastSync    = syncs;
        _urlExpanded = !hasAny;
      });
    }
  }

  // ── Download ───────────────────────────────────────────────────────────────
  Future<void> _download() async {
    final url = _urlCtrl.text.trim();
    if (url.isEmpty) {
      setState(() => _errorMsg = 'Escribe la URL del servidor primero.');
      return;
    }
    if (!url.startsWith('http')) {
      setState(
          () => _errorMsg = 'La URL debe empezar por http:// o https://');
      return;
    }

    await RssService.setBackendUrl(url);

    setState(() {
      _downloading      = true;
      _downloadProgress = 0;
      _errorMsg         = null;
    });

    try {
      final results = await RssService.downloadAllFeeds(
        url,
        onProgress: (done, total, label) {
          if (mounted) setState(() => _downloadProgress = done);
        },
      );

      // Reload sync timestamps for every key.
      final syncs = <String, DateTime?>{};
      for (final type in RssService.baseFeedTypes) {
        syncs[type] = await RssService.getLastSync(type);
      }
      for (final tag in RssService.ytTags) {
        final key  = RssService.youtubeFileKey(tag);
        syncs[key] = await RssService.getLastSync(key);
      }

      if (mounted) {
        setState(() {
          _items = {
            ..._items,    // keep any existing keys not in results
            ...results,   // overwrite with fresh data
          };
          _lastSync    = syncs;
          _downloading = false;
          _urlExpanded = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _downloading = false;
          _errorMsg =
              'Error: ${e.toString().replaceAll('Exception: ', '')}';
        });
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  String _formatSync(DateTime? dt) {
    if (dt == null) return 'Nunca';
    final now  = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1)  return 'Ahora mismo';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    if (diff.inHours   < 24) return 'Hace ${diff.inHours}h';
    return DateFormat('dd/MM HH:mm').format(dt);
  }

  void _openLink(String url) {
    if (url.isEmpty) return;
    Clipboard.setData(ClipboardData(text: url));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'URL copiada al portapapeles',
          style: TextStyle(
              color: _orange, fontFamily: 'monospace', fontSize: 12),
        ),
        backgroundColor: _bgPanel,
        duration:        const Duration(seconds: 2),
        behavior:        SnackBarBehavior.floating,
      ),
    );
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            if (_urlExpanded) _buildUrlSection(),
            if (_errorMsg != null) _buildErrorBanner(),
            _buildChips(),
            if (_selectedFeed == 'youtube') _buildYtSubchips(),
            _buildStatusLine(),
            const Divider(color: Color(0xFF0D2137), height: 1),
            Expanded(child: _buildList()),
          ],
        ),
      ),
    );
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 12, 10),
      decoration: BoxDecoration(
        color:  _bgPanel,
        border: Border(
            bottom:
                BorderSide(color: _orange.withOpacity(0.22), width: 1)),
      ),
      child: Row(
        children: [
          Icon(Icons.rss_feed, color: _orange, size: 20,
              shadows: [
                Shadow(color: _orange.withOpacity(0.5), blurRadius: 8)
              ]),
          const SizedBox(width: 10),
          Text(
            'RSS',
            style: TextStyle(
              color:       _orange,
              fontSize:    16,
              fontWeight:  FontWeight.bold,
              fontFamily:  'monospace',
              letterSpacing: 2,
              shadows: [
                Shadow(color: _orange.withOpacity(0.4), blurRadius: 6)
              ],
            ),
          ),
          const Spacer(),
          IconButton(
            icon: Icon(
              _urlExpanded ? Icons.expand_less : Icons.sync,
              color: _orange.withOpacity(0.75),
              size:  20,
            ),
            onPressed: () =>
                setState(() => _urlExpanded = !_urlExpanded),
            tooltip:     _urlExpanded ? 'Ocultar' : 'Configurar servidor',
            padding:     EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
          ),
        ],
      ),
    );
  }

  // ── URL / download section ─────────────────────────────────────────────────
  Widget _buildUrlSection() {
    final total = _totalDownloads;
    return Container(
      color:   _bgPanel,
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'URL DEL SERVIDOR',
            style: TextStyle(
                color:         _gray,
                fontSize:      10,
                fontFamily:    'monospace',
                letterSpacing: 1.5),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _urlCtrl,
                  enabled:    !_downloading,
                  style: const TextStyle(
                      color: _white, fontSize: 13, fontFamily: 'monospace'),
                  decoration: InputDecoration(
                    hintText:  'http://192.168.1.x:3000',
                    hintStyle: TextStyle(
                        color:      _gray.withOpacity(0.5),
                        fontSize:   12,
                        fontFamily: 'monospace'),
                    filled:          true,
                    fillColor:       const Color(0xFF0A1628),
                    contentPadding:  const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide:   BorderSide(color: _border)),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide:   BorderSide(color: _border)),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(6),
                        borderSide:
                            BorderSide(color: _orange.withOpacity(0.6))),
                  ),
                  onSubmitted: (_) => _download(),
                ),
              ),
              const SizedBox(width: 10),
              SizedBox(
                height: 42,
                child: _downloading
                    ? Padding(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 10),
                        child: Row(
                          children: [
                            SizedBox(
                              width:  16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color:       _orange,
                                value: _downloadProgress / total,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '$_downloadProgress/$total',
                              style: TextStyle(
                                  color:      _orange,
                                  fontSize:   12,
                                  fontFamily: 'monospace'),
                            ),
                          ],
                        ),
                      )
                    : OutlinedButton.icon(
                        onPressed: _download,
                        icon: Icon(Icons.download,
                            size: 15, color: _orange),
                        label: Text(
                          'Descargar',
                          style: TextStyle(
                              color:      _orange,
                              fontSize:   12,
                              fontFamily: 'monospace'),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(
                              color: _orange.withOpacity(0.6)),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 0),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6)),
                        ),
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Error banner ───────────────────────────────────────────────────────────
  Widget _buildErrorBanner() {
    return Container(
      width:   double.infinity,
      color:   const Color(0xFF1A0A0A),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Row(
        children: [
          const Icon(Icons.error_outline,
              color: Color(0xFFFF4444), size: 14),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _errorMsg!,
              style: const TextStyle(
                  color:      Color(0xFFFF4444),
                  fontSize:   11,
                  fontFamily: 'monospace'),
            ),
          ),
          GestureDetector(
            onTap: () => setState(() => _errorMsg = null),
            child: const Icon(Icons.close,
                color: Color(0xFFFF4444), size: 14),
          ),
        ],
      ),
    );
  }

  // ── Feed-type chips (top row) ──────────────────────────────────────────────
  Widget _buildChips() {
    // Show item count for YouTube as the sum of all subcategories combined.
    int youtubeTotal = 0;
    for (final tag in RssService.ytTags) {
      youtubeTotal += _items[RssService.youtubeFileKey(tag)]?.length ?? 0;
    }

    const displayTypes = ['mastodon', 'blog', 'news', 'youtube', 'favorites', 'saved'];

    return Container(
      color:  _bgPanel,
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        children: displayTypes.map((type) {
          final selected = _selectedFeed == type;
          final count    = type == 'youtube'
              ? youtubeTotal
              : (_items[type]?.length ?? 0);
          return GestureDetector(
            onTap: () => setState(() => _selectedFeed = type),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin:  const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: selected
                    ? _orange.withOpacity(0.15)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: selected
                        ? _orange.withOpacity(0.7)
                        : _border),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(_feedIcons[type],
                      size:  13,
                      color: selected ? _orange : _gray),
                  const SizedBox(width: 5),
                  Text(
                    _feedLabels[type]!,
                    style: TextStyle(
                      color:      selected ? _orange : _gray,
                      fontSize:   12,
                      fontFamily: 'monospace',
                      fontWeight: selected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                  if (count > 0) ...[
                    const SizedBox(width: 5),
                    Text(
                      '$count',
                      style: TextStyle(
                        color: selected
                            ? _orange.withOpacity(0.7)
                            : _gray.withOpacity(0.6),
                        fontSize:   10,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── YouTube subcategory chips (shown only when YouTube is selected) ─────────
  Widget _buildYtSubchips() {
    return Container(
      color:  _bgSub,
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        children: RssService.ytTags.map((tag) {
          final selected = _youtubeTag == tag;
          final key      = RssService.youtubeFileKey(tag);
          final count    = _items[key]?.length ?? 0;
          return GestureDetector(
            onTap: () => setState(() => _youtubeTag = tag),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin:  const EdgeInsets.only(right: 7),
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: selected
                    ? _orange.withOpacity(0.12)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: selected
                      ? _orange.withOpacity(0.55)
                      : _border.withOpacity(0.5),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    RssService.ytTagLabels[tag]!,
                    style: TextStyle(
                      color: selected
                          ? _orange
                          : _gray.withOpacity(0.7),
                      fontSize:   11,
                      fontFamily: 'monospace',
                    ),
                  ),
                  if (count > 0) ...[
                    const SizedBox(width: 4),
                    Text(
                      '$count',
                      style: TextStyle(
                        color: selected
                            ? _orange.withOpacity(0.6)
                            : _gray.withOpacity(0.4),
                        fontSize:   10,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Status line ────────────────────────────────────────────────────────────
  Widget _buildStatusLine() {
    final syncDt = _lastSync[_selectedFeedKey];
    final count  = _items[_selectedFeedKey]?.length ?? 0;
    return Container(
      color:   _bgPanel,
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 6),
      child: Row(
        children: [
          Text(
            '$count artículos',
            style: TextStyle(
                color:      _gray.withOpacity(0.7),
                fontSize:   10,
                fontFamily: 'monospace'),
          ),
          const SizedBox(width: 10),
          Text('·',
              style: TextStyle(
                  color: _gray.withOpacity(0.4), fontSize: 10)),
          const SizedBox(width: 10),
          Text(
            'Sync: ${_formatSync(syncDt)}',
            style: TextStyle(
                color:      _gray.withOpacity(0.7),
                fontSize:   10,
                fontFamily: 'monospace'),
          ),
        ],
      ),
    );
  }

  // ── Item list ──────────────────────────────────────────────────────────────
  Widget _buildList() {
    final items = _items[_selectedFeedKey] ?? [];

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _feedIcons[_selectedFeed],
              color: _orange.withOpacity(0.2),
              size:  56,
            ),
            const SizedBox(height: 16),
            Text(
              'Sin artículos',
              style: TextStyle(
                  color:      _gray.withOpacity(0.6),
                  fontSize:   14,
                  fontFamily: 'monospace'),
            ),
            const SizedBox(height: 8),
            Text(
              _urlCtrl.text.isEmpty
                  ? 'Configura el servidor y\ndescarga los feeds'
                  : 'Pulsa Descargar para\nobtener los feeds',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: _gray.withOpacity(0.4), fontSize: 12),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: items.length,
      padding:   const EdgeInsets.symmetric(vertical: 8),
      itemBuilder: (ctx, idx) => RssItemCard(
        item:  items[idx],
        onTap: () => _openLink(items[idx].link),
      ),
    );
  }
}
