import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class NoteFile {
  final String path;
  final String name;
  final DateTime modified;
  final bool pinned;

  const NoteFile({
    required this.path,
    required this.name,
    required this.modified,
    required this.pinned,
  });
}

class NotesService {
  NotesService._();
  static final instance = NotesService._();

  static const _pinnedKey = 'ftah_pinned_notes';
  static const _uuid      = Uuid();

  // ── Directory ────────────────────────────────────────────────────────────────

  /// Returns the notes directory (creates if needed).
  /// On all platforms uses the app's documents directory.
  Future<Directory> getNotesDir() async {
    final base = await getApplicationDocumentsDirectory();
    final dir  = Directory(p.join(base.path, 'ftah_notes'));
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  Future<Directory> getImagesDir() async {
    final notes  = await getNotesDir();
    final imgDir = Directory(p.join(notes.path, 'images'));
    if (!await imgDir.exists()) await imgDir.create(recursive: true);
    return imgDir;
  }

  // ── Pinned set ───────────────────────────────────────────────────────────────

  Future<Set<String>> getPinned() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_pinnedKey)?.toSet() ?? {};
  }

  Future<void> togglePin(String notePath) async {
    final prefs  = await SharedPreferences.getInstance();
    final pinned = prefs.getStringList(_pinnedKey)?.toSet() ?? {};
    if (pinned.contains(notePath)) {
      pinned.remove(notePath);
    } else {
      pinned.add(notePath);
    }
    await prefs.setStringList(_pinnedKey, pinned.toList());
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  Future<List<NoteFile>> listNotes({String query = ''}) async {
    final dir    = await getNotesDir();
    final pinned = await getPinned();

    final files = dir
        .listSync()
        .whereType<File>()
        .where((f) => f.path.endsWith('.md'))
        .toList();

    var notes = files.map((f) {
      final name = p.basenameWithoutExtension(f.path);
      return NoteFile(
        path:     f.path,
        name:     name,
        modified: f.lastModifiedSync(),
        pinned:   pinned.contains(f.path),
      );
    }).toList();

    if (query.isNotEmpty) {
      final q = query.toLowerCase();
      notes = notes.where((n) => n.name.toLowerCase().contains(q)).toList();
    }

    notes.sort((a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned)  return  1;
      return b.modified.compareTo(a.modified);
    });

    return notes;
  }

  Future<String> readNote(String path) async =>
      await File(path).readAsString();

  Future<NoteFile> createNote(String name) async {
    final dir  = await getNotesDir();
    final safe = name.replaceAll(RegExp(r'[/\\:*?"<>|]'), '_');
    var   path = p.join(dir.path, '$safe.md');
    // Avoid overwriting an existing file
    if (await File(path).exists()) {
      path = p.join(dir.path, '${safe}_${_uuid.v4().substring(0, 4)}.md');
    }
    await File(path).writeAsString('# $name\n\n');
    return NoteFile(
      path:     path,
      name:     safe,
      modified: DateTime.now(),
      pinned:   false,
    );
  }

  Future<void> saveNote(String path, String content) async =>
      await File(path).writeAsString(content);

  Future<void> deleteNote(String path) async {
    final f = File(path);
    if (await f.exists()) await f.delete();
    // Remove from pinned list
    final prefs  = await SharedPreferences.getInstance();
    final pinned = prefs.getStringList(_pinnedKey)?.toSet() ?? {};
    pinned.remove(path);
    await prefs.setStringList(_pinnedKey, pinned.toList());
  }

  /// Saves an image to the images folder, returns its path.
  Future<String> saveImage(List<int> bytes, String ext) async {
    final dir   = await getImagesDir();
    final name  = '${_uuid.v4()}.$ext';
    final file  = File(p.join(dir.path, name));
    await file.writeAsBytes(bytes);
    return file.path;
  }
}
