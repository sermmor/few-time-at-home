import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class NotesStorageService {
  static const String folderName = 'my_notes_md';
  static const String _pinnedKey = 'notes_pinned_notes';

  // ── Permissions ────────────────────────────────────────────────────────────

  Future<bool> requestPermissions() async {
    if (!Platform.isAndroid) return true;

    // Android 11+ (API 30+) — MANAGE_EXTERNAL_STORAGE
    var manageStatus = await Permission.manageExternalStorage.status;
    if (!manageStatus.isGranted) {
      manageStatus = await Permission.manageExternalStorage.request();
    }
    if (manageStatus.isGranted) return true;

    // Android < 11 — READ/WRITE_EXTERNAL_STORAGE
    var storageStatus = await Permission.storage.status;
    if (!storageStatus.isGranted) {
      storageStatus = await Permission.storage.request();
    }
    return storageStatus.isGranted;
  }

  // ── Paths ──────────────────────────────────────────────────────────────────

  Future<String> _getExternalStorageRoot() async {
    final dir = await getExternalStorageDirectory();
    if (dir != null) {
      final paths = dir.path.split('/');
      for (int i = 1; i < paths.length; i++) {
        if (paths[i] == 'Android') {
          return paths.sublist(0, i).join('/');
        }
      }
    }
    return '/storage/emulated/0';
  }

  Future<String> getNotesDirectory() async {
    final rootPath = await _getExternalStorageRoot();
    final dir = Directory('$rootPath/$folderName');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir.path;
  }

  Future<String> getImagesDirectory() async {
    final rootPath = await _getExternalStorageRoot();
    final dir = Directory('$rootPath/$folderName/images');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir.path;
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  Future<List<File>> getNotes() async {
    try {
      if (!await requestPermissions()) return [];
      final dirPath = await getNotesDirectory();
      final entities = Directory(dirPath).listSync();
      final mdFiles = entities
          .whereType<File>()
          .where((f) => f.path.toLowerCase().endsWith('.md'))
          .toList();
      mdFiles.sort(
          (a, b) => b.lastModifiedSync().compareTo(a.lastModifiedSync()));
      return mdFiles;
    } catch (e) {
      debugPrint('NotesStorageService.getNotes error: $e');
      return [];
    }
  }

  Future<File?> createNote(String name) async {
    try {
      if (!await requestPermissions()) return null;
      final dirPath = await getNotesDirectory();
      final safeName = name.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
      final file = File('$dirPath/$safeName.md');
      if (!await file.exists()) {
        await file.create();
        await file.writeAsString('# $safeName\n\n');
      }
      return file;
    } catch (e) {
      debugPrint('NotesStorageService.createNote error: $e');
      return null;
    }
  }

  Future<String> readNote(File file) async {
    try {
      if (await file.exists()) return await file.readAsString();
    } catch (e) {
      debugPrint('NotesStorageService.readNote error: $e');
    }
    return '';
  }

  Future<void> saveNote(File file, String content) async {
    try {
      await file.writeAsString(content);
    } catch (e) {
      debugPrint('NotesStorageService.saveNote error: $e');
    }
  }

  Future<bool> deleteNote(File file) async {
    try {
      if (await file.exists()) {
        await file.delete();
        await unpinNote(file.path);
        return true;
      }
    } catch (e) {
      debugPrint('NotesStorageService.deleteNote error: $e');
    }
    return false;
  }

  // ── Pinned notes ───────────────────────────────────────────────────────────

  Future<List<String>> getPinnedNotes() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_pinnedKey) ?? [];
  }

  Future<void> togglePinNote(String path) async {
    final prefs = await SharedPreferences.getInstance();
    final pinned = prefs.getStringList(_pinnedKey) ?? [];
    if (pinned.contains(path)) {
      pinned.remove(path);
    } else {
      pinned.add(path);
    }
    await prefs.setStringList(_pinnedKey, pinned);
  }

  Future<void> unpinNote(String path) async {
    final prefs = await SharedPreferences.getInstance();
    final pinned = prefs.getStringList(_pinnedKey) ?? [];
    if (pinned.contains(path)) {
      pinned.remove(path);
      await prefs.setStringList(_pinnedKey, pinned);
    }
  }

  // ── Images ─────────────────────────────────────────────────────────────────

  Future<File?> saveImage(File sourceImage) async {
    try {
      if (!await requestPermissions()) return null;
      final dirPath = await getImagesDirectory();
      final ext = sourceImage.path.split('.').last;
      final fileName = const Uuid().v4();
      final destPath = '$dirPath/$fileName.$ext';
      return await sourceImage.copy(destPath);
    } catch (e) {
      debugPrint('NotesStorageService.saveImage error: $e');
      return null;
    }
  }
}
