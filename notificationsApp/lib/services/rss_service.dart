import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/rss_item.dart';

class RssService {
  static const _backendUrlKey  = 'rss_backend_url';
  static const _lastSyncPrefix = 'rss_last_sync_';
  static const int fetchAmount = 60;

  /// The non-YouTube feed types (GET /rss/{type}?amount=N  except 'saved').
  /// 'saved' uses POST /readLaterRSS/get-messages → { data: string[] }.
  static const List<String> baseFeedTypes = [
    'mastodon',
    'blog',
    'news',
    'favorites',
    'saved',
  ];

  /// All YouTube subcategory tag values.
  /// Empty string = no filter (all YouTube items).
  static const List<String> ytTags = [
    '',
    'sesionesMusica',
    'politica',
    'divulgacion',
    'ingles',
    'podcast',
    'abandonados',
  ];

  /// Display labels for each YouTube tag.
  static const Map<String, String> ytTagLabels = {
    '':               'Todos',
    'sesionesMusica': 'Música',
    'politica':       'Política',
    'divulgacion':    'Divulgación',
    'ingles':         'Inglés',
    'podcast':        'Podcast',
    'abandonados':    'Abandonados',
  };

  /// Returns the local file key (and SharedPreferences key) for a YouTube tag.
  static String youtubeFileKey(String tag) =>
      tag.isEmpty ? 'youtube_all' : 'youtube_$tag';

  // ── Backend URL preference ──────────────────────────────────────────────────

  static Future<String> getBackendUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_backendUrlKey) ?? '';
  }

  static Future<void> setBackendUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_backendUrlKey, url.trim());
  }

  // ── Local storage ───────────────────────────────────────────────────────────

  static Future<String> _docsDir() async {
    final dir = await getApplicationDocumentsDirectory();
    return dir.path;
  }

  /// [fileKey] is the feed type string (e.g. 'mastodon', 'youtube_all',
  /// 'youtube_sesionesMusica', …).
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

  // ── Network fetch ───────────────────────────────────────────────────────────

  /// Downloads one feed and replaces its local file.
  ///
  /// For YouTube, pass [ytTag] (empty = no filter / all).
  /// For other feeds, [feedType] is 'mastodon' | 'blog' | 'news' | 'favorites'.
  static Future<List<RssItem>> downloadFeed(
    String backendUrl,
    String feedType, {
    String ytTag = '',
  }) async {
    final base = backendUrl.trim().replaceAll(RegExp(r'/+$'), '');

    final String endpoint;
    final String fileKey;

    // ── Saved / read-later (POST, different response key) ──────────────────
    if (feedType == 'saved') {
      final response = await http
          .post(
            Uri.parse('$base/readLaterRSS/get-messages'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'amount': fetchAmount}),
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode != 200) {
        throw Exception('HTTP ${response.statusCode} para saved');
      }

      final data     = jsonDecode(response.body) as Map<String, dynamic>;
      final messages = (data['data'] as List<dynamic>).cast<String>();
      final items    = messages.map((m) => RssItem.fromMessageString(m)).toList();

      await _saveLocalItems('saved', items);
      await _saveLastSync('saved');
      return items;
    }

    // ── YouTube (GET with optional tag) ────────────────────────────────────
    if (feedType == 'youtube') {
      final tagParam = ytTag.isEmpty ? '' : '&tag=$ytTag';
      endpoint = '$base/rss/youtube?amount=$fetchAmount$tagParam';
      fileKey  = youtubeFileKey(ytTag);
    } else {
      endpoint = '$base/rss/$feedType?amount=$fetchAmount';
      fileKey  = feedType;
    }

    final response = await http
        .get(Uri.parse(endpoint))
        .timeout(const Duration(seconds: 30));

    if (response.statusCode != 200) {
      throw Exception('HTTP ${response.statusCode} para $feedType'
          '${ytTag.isNotEmpty ? " ($ytTag)" : ""}');
    }

    final data     = jsonDecode(response.body) as Map<String, dynamic>;
    final messages = (data['messages'] as List<dynamic>).cast<String>();
    final items    = messages.map((m) => RssItem.fromMessageString(m)).toList();

    await _saveLocalItems(fileKey, items);
    await _saveLastSync(fileKey);
    return items;
  }

  /// Downloads all feeds: 4 base types + all 7 YouTube subcategories = 11 total.
  /// [onProgress] is called after each completed download (done, total, label).
  static Future<Map<String, List<RssItem>>> downloadAllFeeds(
    String backendUrl, {
    void Function(int done, int total, String label)? onProgress,
  }) async {
    final result = <String, List<RssItem>>{};
    final total  = baseFeedTypes.length + ytTags.length; // 4 + 7 = 11
    var   done   = 0;

    // ── 4 base feeds ──────────────────────────────────────────────────────────
    for (final type in baseFeedTypes) {
      try {
        result[type] = await downloadFeed(backendUrl, type);
      } catch (_) {
        result[type] = [];
      }
      onProgress?.call(++done, total, type);
    }

    // ── 7 YouTube subcategories ───────────────────────────────────────────────
    for (final tag in ytTags) {
      final key = youtubeFileKey(tag);
      try {
        result[key] = await downloadFeed(backendUrl, 'youtube', ytTag: tag);
      } catch (_) {
        result[key] = [];
      }
      onProgress?.call(++done, total,
          'youtube${tag.isNotEmpty ? ":$tag" : ""}');
    }

    return result;
  }
}
