import 'dart:io';
import 'package:flutter/material.dart';
import 'package:animated_text_kit/animated_text_kit.dart';
import 'notes_storage_service.dart';
import 'notes_theme.dart';
import 'notes_glitch_effect.dart';
import 'notes_editor_screen.dart';

class NotesHomeScreen extends StatefulWidget {
  const NotesHomeScreen({super.key});

  @override
  State<NotesHomeScreen> createState() => _NotesHomeScreenState();
}

class _NotesHomeScreenState extends State<NotesHomeScreen> {
  final NotesStorageService _storage = NotesStorageService();

  List<File> _notes = [];
  List<File> _filteredNotes = [];
  List<String> _pinnedNotes = [];
  bool _isLoading = true;
  String _searchQuery = '';
  final Set<String> _glitchingFiles = {};

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  Future<void> _loadNotes() async {
    setState(() => _isLoading = true);
    final notes = await _storage.getNotes();
    final pinned = await _storage.getPinnedNotes();

    notes.sort((a, b) {
      final aPinned = pinned.contains(a.path);
      final bPinned = pinned.contains(b.path);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return b.lastModifiedSync().compareTo(a.lastModifiedSync());
    });

    setState(() {
      _notes = notes;
      _pinnedNotes = pinned;
      _isLoading = false;
      _filterNotes(_searchQuery);
    });
  }

  void _filterNotes(String query) {
    setState(() {
      _searchQuery = query;
      if (query.isEmpty) {
        _filteredNotes = List.from(_notes);
      } else {
        _filteredNotes = _notes.where((f) {
          final name =
              f.path.split(Platform.pathSeparator).last.toLowerCase();
          return name.contains(query.toLowerCase());
        }).toList();
      }
    });
  }

  Future<void> _createNewNote() async {
    String? noteName = await showDialog<String>(
      context: context,
      builder: (ctx) {
        String input = '';
        return AlertDialog(
          backgroundColor: NotesTheme.darkGrey,
          title: const Text('NUEVA NOTA',
              style: TextStyle(
                  color: NotesTheme.neonCyan,
                  fontFamily: 'monospace',
                  letterSpacing: 2)),
          content: TextField(
            autofocus: true,
            style: const TextStyle(color: NotesTheme.neonCyan),
            decoration: const InputDecoration(
              hintText: 'Nombre de la nota...',
              hintStyle: TextStyle(color: NotesTheme.textSecondary),
              enabledBorder: UnderlineInputBorder(
                  borderSide:
                      BorderSide(color: NotesTheme.neonCyan)),
              focusedBorder: UnderlineInputBorder(
                  borderSide: BorderSide(
                      color: NotesTheme.neonCyan, width: 2)),
            ),
            onChanged: (val) => input = val,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('CANCELAR',
                  style: TextStyle(color: NotesTheme.neonMagenta)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: NotesTheme.neonCyan,
                foregroundColor: NotesTheme.background,
              ),
              onPressed: () => Navigator.pop(ctx, input),
              child: const Text('CREAR'),
            ),
          ],
        );
      },
    );

    if (noteName != null && noteName.trim().isNotEmpty) {
      final newFile = await _storage.createNote(noteName.trim());
      if (newFile != null) {
        await _loadNotes();
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => NotesEditorScreen(file: newFile),
            ),
          ).then((_) => _loadNotes());
        }
      }
    }
  }

  Future<void> _togglePin(File file) async {
    await _storage.togglePinNote(file.path);
    _loadNotes();
  }

  Future<void> _deleteNoteWithGlitch(File file) async {
    setState(() => _glitchingFiles.add(file.path));
    await Future.delayed(const Duration(milliseconds: 600));
    await _storage.deleteNote(file);
    setState(() => _glitchingFiles.remove(file.path));
    _loadNotes();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NotesTheme.background,
      appBar: AppBar(
        backgroundColor: NotesTheme.background,
        elevation: 0,
        centerTitle: true,
        title: DefaultTextStyle(
          style: const TextStyle(
            color: NotesTheme.neonCyan,
            fontSize: 20,
            fontWeight: FontWeight.bold,
            letterSpacing: 3.0,
            fontFamily: 'monospace',
            shadows: [
              Shadow(color: NotesTheme.neonCyan, blurRadius: 10),
            ],
          ),
          child: AnimatedTextKit(
            animatedTexts: [
              TypewriterAnimatedText(
                'NEO NOTAS',
                speed: const Duration(milliseconds: 100),
              ),
            ],
            isRepeatingAnimation: false,
          ),
        ),
      ),
      body: Column(
        children: [
          _buildSearch(),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: NotesTheme.neonCyan))
                : _notes.isEmpty
                    ? Center(
                        child: DefaultTextStyle(
                          style: const TextStyle(
                              color: NotesTheme.textSecondary,
                              letterSpacing: 2,
                              fontFamily: 'monospace'),
                          child: AnimatedTextKit(
                            animatedTexts: [
                              TypewriterAnimatedText(
                                'NO HAY DATOS.\nINICIAR NUEVO REGISTRO.',
                                textAlign: TextAlign.center,
                              ),
                            ],
                            isRepeatingAnimation: false,
                          ),
                        ),
                      )
                    : NotesGlitchEffect(
                        isActive: _isLoading,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredNotes.length,
                          itemBuilder: _buildNoteItem,
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _createNewNote,
        backgroundColor: NotesTheme.neonMagenta,
        foregroundColor: Colors.white,
        child: const Icon(Icons.add, size: 28),
      ),
    );
  }

  Widget _buildNoteItem(BuildContext context, int index) {
    final file = _filteredNotes[index];
    final fileName = file.path.split(Platform.pathSeparator).last;
    final isPinned = _pinnedNotes.contains(file.path);
    final isGlitching = _glitchingFiles.contains(file.path);

    return NotesGlitchEffect(
      isActive: isGlitching,
      child: Dismissible(
        key: Key(file.path),
        background: Container(
          color: NotesTheme.neonMagenta,
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: 20),
          child: const Icon(Icons.delete, color: Colors.white),
        ),
        direction: DismissDirection.endToStart,
        confirmDismiss: (_) async {
          _deleteNoteWithGlitch(file);
          return false; // manual deletion after glitch animation
        },
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            border: Border.all(
              color: isPinned
                  ? NotesTheme.neonMagenta
                  : NotesTheme.neonCyan.withOpacity(0.5),
              width: isPinned ? 2 : 1,
            ),
            color: NotesTheme.darkGrey,
            boxShadow: [
              BoxShadow(
                color: (isPinned
                        ? NotesTheme.neonMagenta
                        : NotesTheme.neonCyan)
                    .withOpacity(0.1),
                blurRadius: 5,
                spreadRadius: 1,
              ),
            ],
          ),
          child: ListTile(
            leading: Icon(
              isPinned ? Icons.push_pin : Icons.description,
              color: isPinned
                  ? NotesTheme.neonMagenta
                  : NotesTheme.neonCyan,
            ),
            title: Text(
              fileName,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: NotesTheme.textMain,
              ),
            ),
            trailing: const Icon(Icons.chevron_right,
                color: NotesTheme.neonCyan),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => NotesEditorScreen(file: file),
                ),
              ).then((_) => _loadNotes());
            },
            onLongPress: () => _togglePin(file),
          ),
        ),
      ),
    );
  }

  Widget _buildSearch() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: NotesTheme.background,
      child: TextField(
        style: const TextStyle(
            color: NotesTheme.neonYellow, fontFamily: 'monospace'),
        decoration: InputDecoration(
          prefixIcon: const Padding(
            padding: EdgeInsets.all(12.0),
            child: Text(
              '> root@search: ',
              style: TextStyle(
                  color: NotesTheme.neonMagenta,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'monospace'),
            ),
          ),
          prefixIconConstraints:
              const BoxConstraints(minWidth: 0, minHeight: 0),
          hintText: '_',
          hintStyle: TextStyle(
              color: NotesTheme.neonYellow.withOpacity(0.5)),
          filled: true,
          fillColor: NotesTheme.darkGrey,
          border: const OutlineInputBorder(
              borderSide:
                  BorderSide(color: NotesTheme.neonCyan)),
          focusedBorder: const OutlineInputBorder(
              borderSide: BorderSide(
                  color: NotesTheme.neonCyan, width: 2)),
          contentPadding:
              const EdgeInsets.symmetric(vertical: 0),
        ),
        onChanged: _filterNotes,
      ),
    );
  }
}
