import 'dart:io';
import 'package:path/path.dart'          as p;
import 'package:path_provider/path_provider.dart';
import 'drive_service.dart';

/// Manages a local file cache for wallpapers, image widgets and favicons.
///
/// Cache layout (inside the app documents directory):
/// ```
/// ftah_cache/
///   {profileName}/
///     assets/    ← wallpapers + DesktopImage files
///     favicons/  ← favicon files
/// ```
class AssetCacheService {
  AssetCacheService._();
  static final AssetCacheService instance = AssetCacheService._();

  late String _cacheRoot;
  bool _ready = false;

  Future<void> ensureReady() async {
    if (_ready) return;
    final docs = await getApplicationDocumentsDirectory();
    _cacheRoot = p.join(docs.path, 'ftah_cache');
    _ready = true;
  }

  // ── Asset (wallpaper / image widget) ─────────────────────────────────────

  /// Returns the local path for an asset described by its cloud path
  /// (e.g. "cloud/desktop-remote/foto.jpg").
  /// Downloads from GDrive if not already cached.
  Future<String?> resolveAsset(String profileName, String cloudPath) async {
    await ensureReady();
    final filename = p.basename(cloudPath);
    final localPath = p.join(_cacheRoot, profileName, 'assets', filename);

    if (File(localPath).existsSync()) return localPath;

    // Download from GDrive
    final bytes = await DriveService.instance.downloadAsset(profileName, filename);
    if (bytes == null) return null;

    await File(localPath).parent.create(recursive: true);
    await File(localPath).writeAsBytes(bytes);
    return localPath;
  }

  // ── Favicon ──────────────────────────────────────────────────────────────

  /// Returns the local path for a favicon given its name (without extension).
  /// Downloads from GDrive if not already cached.
  Future<String?> resolveFavicon(String profileName, String faviconName) async {
    await ensureReady();
    final dir = Directory(p.join(_cacheRoot, profileName, 'favicons'));

    // Check if already cached (any extension)
    if (dir.existsSync()) {
      final existing = dir
          .listSync()
          .whereType<File>()
          .where((f) => p.basenameWithoutExtension(f.path) == faviconName)
          .firstOrNull;
      if (existing != null) return existing.path;
    }

    // Download from GDrive
    final result = await DriveService.instance.downloadFavicon(profileName, faviconName);
    if (result == null) return null;

    await dir.create(recursive: true);
    final localPath = p.join(dir.path, result.filename);
    await File(localPath).writeAsBytes(result.bytes);
    return localPath;
  }

  // ── Cache management ─────────────────────────────────────────────────────

  /// Deletes the cached assets for a specific profile.
  Future<void> clearProfile(String profileName) async {
    await ensureReady();
    final dir = Directory(p.join(_cacheRoot, profileName));
    if (dir.existsSync()) await dir.delete(recursive: true);
  }

  /// Deletes the entire cache.
  Future<void> clearAll() async {
    await ensureReady();
    final dir = Directory(_cacheRoot);
    if (dir.existsSync()) await dir.delete(recursive: true);
  }
}
