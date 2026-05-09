import 'dart:async';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
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
/// This works on Windows/macOS/Linux natively.
/// On Android, Chrome can redirect to localhost on the same device, so the flow
/// also works — the app must have INTERNET permission (added by default in Flutter).
class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  final _storage = const FlutterSecureStorage();

  // ── Credentials setup ────────────────────────────────────────────────────

  Future<bool> hasCredentials() async {
    final id = await _storage.read(key: kSecClientId);
    final secret = await _storage.read(key: kSecClientSecret);
    return id != null && id.isNotEmpty && secret != null && secret.isNotEmpty;
  }

  Future<void> saveCredentials(String clientId, String clientSecret) async {
    await _storage.write(key: kSecClientId,     value: clientId);
    await _storage.write(key: kSecClientSecret, value: clientSecret);
  }

  Future<({String clientId, String clientSecret})?> loadCredentials() async {
    final id     = await _storage.read(key: kSecClientId);
    final secret = await _storage.read(key: kSecClientSecret);
    if (id == null || secret == null) return null;
    return (clientId: id, clientSecret: secret);
  }

  // ── Token persistence ────────────────────────────────────────────────────

  Future<void> _saveTokens(AccessCredentials creds) async {
    await _storage.write(key: kSecAccessToken,  value: creds.accessToken.data);
    await _storage.write(key: kSecRefreshToken, value: creds.refreshToken ?? '');
    await _storage.write(key: kSecTokenExpiry,  value: creds.accessToken.expiry.toIso8601String());
  }

  Future<AccessCredentials?> _loadTokens(String clientId, String clientSecret) async {
    final access   = await _storage.read(key: kSecAccessToken);
    final refresh  = await _storage.read(key: kSecRefreshToken);
    final expiryRaw = await _storage.read(key: kSecTokenExpiry);
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
    await _storage.delete(key: kSecAccessToken);
    await _storage.delete(key: kSecRefreshToken);
    await _storage.delete(key: kSecTokenExpiry);
  }

  /// Clears everything including client credentials.
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
