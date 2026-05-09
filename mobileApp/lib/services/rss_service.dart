import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/rss_item.dart';

class RssService {
  static const _lastSyncPrefix = 'rss_last_sync_';
  static const int fetchAmount = 60;

  /// The non-YouTube feed types.
  static const List<String> baseFeedTypes = [
    'mastodon',
    'blog',
    'news',
    'favorites',
    'saved',
  ];

  /// All YouTube subcategory tag values.
  /// 'null' = no filter (all YouTube items, matches backend default tag).
  static const List<String> ytTags = [
    'null',
    'sesionesMusica',
    'politica',
    'divulgacion',
    'ingles',
    'podcasts',
    'abandonados',
  ];

  /// Display labels for each YouTube tag.
  static const Map<String, String> ytTagLabels = {
    'null':           'null',
    'sesionesMusica': 'Música',
    'politica':       'Política',
    'divulgacion':    'Divulgación',
    'ingles':         'Inglés',
    'podcasts':       'Podcast',
    'abandonados':    'Abandonados',
  };

  /// Returns the Supabase feed_key (and local file key) for a YouTube tag.
  static String youtubeFileKey(String tag) => 'youtube_$tag';

  // ── Local storage ───────────────────────────────────────────────────────────

  static Future<String> _docsDir() async {
    final dir = await getApplicationDocumentsDirectory();
    return dir.path;
  }

  static Future<List<RssItem>> loadLocalItems(String fileKey) async {
    try {
      final dir  = await _docsDir();
      final file = File('$dir/rss_$fileKey.json');
      if (!await file.exists()) return [];
      final raw  = await file.readAsString();
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => RssItem.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> _saveLocalItems(
      String fileKey, List<RssItem> items) async {
    final dir  = await _docsDir();
    final file = File('$dir/rss_$fileKey.json');
    await file.writeAsString(
      jsonEncode(items.map((e) => e.toJson()).toList()),
    );
  }

  // ── Last sync timestamps ────────────────────────────────────────────────────

  static Future<DateTime?> getLastSync(String fileKey) async {
    final prefs = await SharedPreferences.getInstance();
    final ms    = prefs.getInt('$_lastSyncPrefix$fileKey');
    return ms != null ? DateTime.fromMillisecondsSinceEpoch(ms) : null;
  }

  static Future<void> _saveLastSync(String fileKey) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(
      '$_lastSyncPrefix$fileKey',
      DateTime.now().millisecondsSinceEpoch,
    );
  }

  // ── Supabase fetch ──────────────────────────────────────────────────────────

  /// Downloads one feed from Supabase `rss_cache` and replaces its local file.
  ///
  /// For YouTube, pass [ytTag] ('null' = all, other values = subcategory).
  /// For other feeds, [feedType] is one of [baseFeedTypes].
  static Future<List<RssItem>> downloadFeed(
    String feedType, {
    String ytTag = '',
  }) async {
    final String feedKey = feedType == 'youtube'
        ? youtubeFileKey(ytTag)
        : feedType;

    final response = await Supabase.instance.client
        .from('rss_cache')
        .select('messages')
        .eq('feed_key', feedKey)
        .maybeSingle();

    if (response == null) return [];

    final messages = (response['messages'] as List<dynamic>).cast<String>();
    final items    = messages.map((m) => RssItem.fromMessageString(m)).toList();

    await _saveLocalItems(feedKey, items);
    await _saveLastSync(feedKey);
    return items;
  }

  /// Downloads all feeds from Supabase: 5 base types + 7 YouTube subcategories.
  /// [onProgress] is called after each completed download (done, total, label).
  static Future<Map<String, List<RssItem>>> downloadAllFeeds({
    void Function(int done, int total, String label)? onProgress,
  }) async {
    final result = <String, List<RssItem>>{};
    final total  = baseFeedTypes.length + ytTags.length; // 5 + 7 = 12
    var   done   = 0;

    // ── 5 base feeds ──────────────────────────────────────────────────────────
    for (final type in baseFeedTypes) {
      try {
        result[type] = await downloadFeed(type);
      } catch (_) {
        result[type] = [];
      }
      onProgress?.call(++done, total, type);
    }

    // ── 7 YouTube subcategories ───────────────────────────────────────────────
    for (final tag in ytTags) {
      final key = youtubeFileKey(tag);
      try {
        result[key] = await downloadFeed('youtube', ytTag: tag);
      } catch (_) {
        result[key] = [];
      }
      onProgress?.call(++done, total, 'youtube:$tag');
    }

    return result;
  }
}
