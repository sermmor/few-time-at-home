import 'dart:async';
import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:googleapis_auth/auth_io.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../constants.dart';

/// Manages Google OAuth2 authentication and token persistence.
///
/// Uses [googleapis_auth]'s [clientViaUserConsent] which:
///   1. Starts a local HTTP server on a random port.
///   2. Opens the Google sign-in URL in the system browser via [url_launcher].
///   3. Waits for the browser to redirect back to localhost with the auth code.
///   4. Exchanges the code for access + refresh tokens.
///
/// Storage strategy:
///   • Windows / Linux / Android / iOS → flutter_secure_storage
///       (DPAPI / libsecret / Keystore / Keychain — all properly backed)
///   • macOS                            → SharedPreferences (NSUserDefaults)
///       Keychain calls from an ad-hoc signed app (identity "-", no team ID)
///       block indefinitely because macOS can't derive a stable Keychain
///       access group from the unstable code signature. NSUserDefaults has
///       no such dependency.
class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  final _store = _PlatformKVStore();

  // ── Credentials setup ────────────────────────────────────────────────────

  Future<bool> hasCredentials() async {
    final id = await _store.read(kSecClientId);
    final secret = await _store.read(kSecClientSecret);
    return id != null && id.isNotEmpty && secret != null && secret.isNotEmpty;
  }

  Future<void> saveCredentials(String clientId, String clientSecret) async {
    await _store.write(kSecClientId,     clientId);
    await _store.write(kSecClientSecret, clientSecret);
  }

  Future<({String clientId, String clientSecret})?> loadCredentials() async {
    final id     = await _store.read(kSecClientId);
    final secret = await _store.read(kSecClientSecret);
    if (id == null || secret == null) return null;
    return (clientId: id, clientSecret: secret);
  }

  // ── Token persistence ────────────────────────────────────────────────────

  Future<void> _saveTokens(AccessCredentials creds) async {
    await _store.write(kSecAccessToken,  creds.accessToken.data);
    await _store.write(kSecRefreshToken, creds.refreshToken ?? '');
    await _store.write(kSecTokenExpiry,  creds.accessToken.expiry.toIso8601String());
  }

  Future<AccessCredentials?> _loadTokens(String clientId, String clientSecret) async {
    final access    = await _store.read(kSecAccessToken);
    final refresh   = await _store.read(kSecRefreshToken);
    final expiryRaw = await _store.read(kSecTokenExpiry);
    if (access == null || refresh == null || expiryRaw == null) return null;
    final expiry = DateTime.tryParse(expiryRaw);
    if (expiry == null) return null;
    return AccessCredentials(
      AccessToken('Bearer', access, expiry.toUtc()),
      refresh.isEmpty ? null : refresh,
      kGdriveScopes,
    );
  }

  // ── Auth client ──────────────────────────────────────────────────────────

  /// Returns an authenticated HTTP client ready for Google APIs.
  /// If saved tokens are still valid they are reused (with auto-refresh).
  /// Otherwise, opens the browser for the full OAuth2 consent flow.
  Future<AutoRefreshingAuthClient> getAuthClient() async {
    final creds = await loadCredentials();
    if (creds == null) throw Exception('OAuth credentials not configured');

    final clientId = ClientId(creds.clientId, creds.clientSecret);

    // Try to restore saved tokens
    final saved = await _loadTokens(creds.clientId, creds.clientSecret);
    if (saved != null && saved.refreshToken != null) {
      try {
        final client = autoRefreshingClient(clientId, saved, http.Client());
        await _saveTokens(await client.credentials); // persist refreshed tokens
        return client;
      } catch (_) {
        // Saved tokens invalid — fall through to full consent flow
      }
    }

    // Full consent flow: opens browser, waits for localhost callback
    final client = await clientViaUserConsent(
      clientId,
      kGdriveScopes,
      (url) async {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        } else {
          throw Exception('Cannot open browser for OAuth. Please visit:\n$url');
        }
      },
    );

    await _saveTokens(client.credentials);
    return client;
  }

  /// Clears all saved tokens (but keeps client credentials).
  Future<void> signOut() async {
    await _store.delete(kSecAccessToken);
    await _store.delete(kSecRefreshToken);
    await _store.delete(kSecTokenExpiry);
  }

  /// Clears everything including client credentials.
  Future<void> clearAll() async {
    await _store.deleteAll();
  }
}

/// Thin key/value abstraction that picks the right backing store per platform.
/// macOS uses SharedPreferences to avoid the ad-hoc-signing Keychain hang
/// described in [AuthService]'s class docs.
class _PlatformKVStore {
  static const _secure = FlutterSecureStorage();
  // Keep all SharedPreferences keys to scope a clearAll() to only our own
  // entries instead of wiping the entire UserDefaults domain.
  static const _knownKeys = [
    kSecClientId,
    kSecClientSecret,
    kSecAccessToken,
    kSecRefreshToken,
    kSecTokenExpiry,
  ];

  Future<String?> read(String key) async {
    if (Platform.isMacOS) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(key);
    }
    return _secure.read(key: key);
  }

  Future<void> write(String key, String value) async {
    if (Platform.isMacOS) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, value);
      return;
    }
    await _secure.write(key: key, value: value);
  }

  Future<void> delete(String key) async {
    if (Platform.isMacOS) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(key);
      return;
    }
    await _secure.delete(key: key);
  }

  Future<void> deleteAll() async {
    if (Platform.isMacOS) {
      final prefs = await SharedPreferences.getInstance();
      for (final k in _knownKeys) {
        await prefs.remove(k);
      }
      return;
    }
    await _secure.deleteAll();
  }
}
