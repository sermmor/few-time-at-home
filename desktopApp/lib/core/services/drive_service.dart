import 'dart:convert';
import 'package:googleapis/drive/v3.dart' as drive;
import 'package:googleapis_auth/auth_io.dart';
import 'package:path/path.dart' as p;
import '../constants.dart';
import '../models/desktop_config.dart';

/// Google Drive operations for the desktop profile sync.
///
/// Folder layout (mirrors the backend):
/// ```
/// Few_Time_at_home_desktop/
///   profileName.json
///   profileName/
///     assets/     ← wallpapers + DesktopImage cloudPath files
///     favicons/   ← favicon files
/// ```
class DriveService {
  DriveService._();
  static final DriveService instance = DriveService._();

  drive.DriveApi? _api;

  // ── Initialisation ───────────────────────────────────────────────────────

  void init(AutoRefreshingAuthClient client) {
    _api = drive.DriveApi(client);
  }

  drive.DriveApi get _drive {
    if (_api == null) throw StateError('DriveService not initialised — call init() first');
    return _api!;
  }

  // ── Folder helpers ───────────────────────────────────────────────────────

  /// Returns the ID of [kGdriveFolderName], creating it if absent.
  Future<String> ensureMainFolder() async {
    final list = await _drive.files.list(
      q: "name='$kGdriveFolderName' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      $fields: 'files(id,name)',
    );
    if (list.files != null && list.files!.isNotEmpty) {
      return list.files!.first.id!;
    }
    final folder = await _drive.files.create(
      drive.File()
        ..name     = kGdriveFolderName
        ..mimeType = 'application/vnd.google-apps.folder',
      $fields: 'id',
    );
    return folder.id!;
  }

  Future<String?> _findFolder(String name, String parentId) async {
    final list = await _drive.files.list(
      q: "'$parentId' in parents and name='$name' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      $fields: 'files(id)',
    );
    return list.files?.firstOrNull?.id;
  }

  Future<String?> _findFile(String name, String parentId) async {
    final list = await _drive.files.list(
      q: "'$parentId' in parents and name='$name' and trashed=false",
      $fields: 'files(id)',
    );
    return list.files?.firstOrNull?.id;
  }

  // ── Profile discovery ────────────────────────────────────────────────────

  /// Lists all remote profiles found in [kGdriveFolderName].
  Future<List<ProfileMeta>> listProfiles() async {
    final mainId = await ensureMainFolder();
    final list   = await _drive.files.list(
      q: "'$mainId' in parents and trashed=false",
      $fields: 'files(id,name,mimeType)',
    );
    final files = list.files ?? [];
    return files
        .where((f) => f.mimeType != 'application/vnd.google-apps.folder' && (f.name?.endsWith('.json') ?? false))
        .map((f) => ProfileMeta(name: f.name!.replaceAll('.json', ''), jsonFileId: f.id!))
        .toList();
  }

  // ── Download ─────────────────────────────────────────────────────────────

  /// Downloads and parses the profile JSON for [name].
  Future<DesktopConfig?> downloadProfile(String name) async {
    final mainId   = await ensureMainFolder();
    final fileId   = await _findFile('$name.json', mainId);
    if (fileId == null) return null;

    final media = await _drive.files.get(
      fileId,
      downloadOptions: drive.DownloadOptions.fullMedia,
    ) as drive.Media;

    final bytes = await _collectStream(media.stream);
    final json  = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
    return DesktopConfig.fromJson(json);
  }

  /// Downloads an asset (wallpaper / image widget file) by its filename.
  /// Returns the raw bytes, or null if the file is not found in GDrive.
  Future<List<int>?> downloadAsset(String profileName, String filename) async {
    final mainId    = await ensureMainFolder();
    final profileId = await _findFolder(profileName, mainId);
    if (profileId == null) return null;
    final assetsId  = await _findFolder('assets', profileId);
    if (assetsId == null) return null;
    final fileId    = await _findFile(filename, assetsId);
    if (fileId == null) return null;
    return _downloadBytes(fileId);
  }

  /// Downloads a favicon file by its name (without extension).
  /// Tries matching any file whose name starts with "[name].".
  Future<({List<int> bytes, String filename})?> downloadFavicon(String profileName, String faviconName) async {
    final mainId    = await ensureMainFolder();
    final profileId = await _findFolder(profileName, mainId);
    if (profileId == null) return null;
    final faviconsId = await _findFolder('favicons', profileId);
    if (faviconsId == null) return null;

    final list = await _drive.files.list(
      q: "'$faviconsId' in parents and name contains '$faviconName' and trashed=false",
      $fields: 'files(id,name)',
    );
    final match = list.files?.where((f) => f.name?.startsWith('$faviconName.') ?? false).firstOrNull;
    if (match == null) return null;

    final bytes = await _downloadBytes(match.id!);
    if (bytes == null) return null;
    return (bytes: bytes, filename: match.name!);
  }

  // ── Upload ───────────────────────────────────────────────────────────────

  /// Uploads (or updates) the profile JSON in GDrive.
  Future<void> uploadProfile(String name, DesktopConfig config) async {
    final mainId  = await ensureMainFolder();
    final jsonBytes = utf8.encode(jsonEncode(config.toJson()));
    await _upsertFile(
      name:     '$name.json',
      mimeType: 'application/json',
      bytes:    jsonBytes,
      parentId: mainId,
    );
  }

  /// Uploads an asset file to [profileName]/assets/[filename] in GDrive.
  Future<void> uploadAsset(String profileName, String filename, List<int> bytes) async {
    final mainId    = await ensureMainFolder();
    final profileId = await _ensureFolder(profileName, mainId);
    final assetsId  = await _ensureFolder('assets', profileId);
    await _upsertFile(
      name:     filename,
      mimeType: _guessMime(filename),
      bytes:    bytes,
      parentId: assetsId,
    );
  }

  // ── Internals ────────────────────────────────────────────────────────────

  Future<String> _ensureFolder(String name, String parentId) async {
    final existing = await _findFolder(name, parentId);
    if (existing != null) return existing;
    final created = await _drive.files.create(
      drive.File()
        ..name     = name
        ..mimeType = 'application/vnd.google-apps.folder'
        ..parents  = [parentId],
      $fields: 'id',
    );
    return created.id!;
  }

  Future<void> _upsertFile({
    required String  name,
    required String  mimeType,
    required List<int> bytes,
    required String  parentId,
  }) async {
    final media = drive.Media(Stream.value(bytes), bytes.length, contentType: mimeType);
    final existingId = await _findFile(name, parentId);
    if (existingId != null) {
      await _drive.files.update(drive.File(), existingId, uploadMedia: media);
    } else {
      await _drive.files.create(
        drive.File()..name = name..parents = [parentId],
        uploadMedia: media,
        $fields: 'id',
      );
    }
  }

  Future<List<int>?> _downloadBytes(String fileId) async {
    try {
      final media = await _drive.files.get(
        fileId,
        downloadOptions: drive.DownloadOptions.fullMedia,
      ) as drive.Media;
      return _collectStream(media.stream);
    } catch (_) {
      return null;
    }
  }

  Future<List<int>> _collectStream(Stream<List<int>> stream) async {
    final chunks = await stream.toList();
    return chunks.expand((c) => c).toList();
  }

  String _guessMime(String filename) {
    final ext = p.extension(filename).toLowerCase().replaceFirst('.', '');
    const map = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
      'png': 'image/png',  'gif':  'image/gif',
      'webp': 'image/webp', 'bmp': 'image/bmp',
      'svg': 'image/svg+xml', 'ico': 'image/x-icon',
    };
    return map[ext] ?? 'application/octet-stream';
  }
}
