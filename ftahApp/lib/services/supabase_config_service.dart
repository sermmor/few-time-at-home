import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Manages Supabase credentials stored in SharedPreferences.
/// Supabase can only be initialized once per process — subsequent calls to
/// [initFromStorage] are no-ops if already done.
class SupabaseConfigService {
  SupabaseConfigService._();

  static const _keyUrl     = 'sb_url';
  static const _keyAnonKey = 'sb_anon_key';

  static bool _initialized = false;
  static bool get isInitialized => _initialized;

  // ── Read ─────────────────────────────────────────────────────────────────────

  static Future<bool> isConfigured() async {
    final prefs = await SharedPreferences.getInstance();
    final url   = prefs.getString(_keyUrl)     ?? '';
    final key   = prefs.getString(_keyAnonKey) ?? '';
    return url.isNotEmpty && key.isNotEmpty;
  }

  static Future<({String url, String anonKey})> load() async {
    final prefs = await SharedPreferences.getInstance();
    return (
      url:     prefs.getString(_keyUrl)     ?? '',
      anonKey: prefs.getString(_keyAnonKey) ?? '',
    );
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  /// Loads saved credentials and initializes Supabase.
  /// Returns false if no credentials are saved yet.
  static Future<bool> initFromStorage() async {
    if (_initialized) return true;
    final creds = await load();
    if (creds.url.isEmpty || creds.anonKey.isEmpty) return false;
    await Supabase.initialize(url: creds.url, anonKey: creds.anonKey);
    _initialized = true;
    return true;
  }

  /// Saves credentials and initializes Supabase (first-run setup).
  static Future<void> saveAndInit(String url, String anonKey) async {
    await _persist(url, anonKey);
    if (!_initialized) {
      await Supabase.initialize(url: url.trim(), anonKey: anonKey.trim());
      _initialized = true;
    }
  }

  // ── Write ────────────────────────────────────────────────────────────────────

  /// Persists credentials without re-initialising (restart required).
  static Future<void> save(String url, String anonKey) async {
    await _persist(url, anonKey);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyUrl);
    await prefs.remove(_keyAnonKey);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  static Future<void> _persist(String url, String anonKey) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUrl,     url.trim());
    await prefs.setString(_keyAnonKey, anonKey.trim());
  }
}
