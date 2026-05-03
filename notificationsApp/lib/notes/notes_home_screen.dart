import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'notes_storage_service.dart';
import 'notes_glitch_effect.dart';
import 'notes_editor_screen.dart';

class NotesHomeScreen extends StatefulWidget {
  const NotesHomeScreen({super.key});

  @override
  State<NotesHomeScreen> createState() => _NotesHomeScreenState();
}

class _NotesHomeScreenState extends State<NotesHomeScreen> {
  // ── Palette (identical tokens to alerts_screen / pomodoro_screen) ──────────
  static const _cyan      = Color(0xFF00FFE7);
  static const _cyanDim   = Color(0x9900FFE7);
  static const _cyanFaint = Color(0x0A00FFE7);
  static const _cyanBord  = Color(0x2800FFE7);
  static const _green     = Color(0xFF00FF88); // Neo Notas accent
  static const _magenta   = Color(0xFFFF00CC);
  static const _bg        = Color(0xFF020C18);
  static const _bgPanel   = Color(0xFF071526);

  final NotesStorageService _storage = NotesStorageService();
  final _dateFmt = DateFormat('dd/MM/yy  HH:mm');

  List<File>   _notes         = [];
  List<File>   _filteredNotes = [];
  List<String> _pinnedNotes   = [];
  bool         _isLoading     = true;
  String       _searchQuery   = '';
  final Set<String> _glitchingFiles = {};

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  // ── Data ───────────────────────────────────────────────────────────────────

  Future<void> _loadNotes() async {
    setState(() => _isLoading = true);
    final notes  = await _storage.getNotes();
    final pinned = await _storage.getPinnedNotes();

    notes.sort((a, b) {
      final aPinned = pinned.contains(a.path);
      final bPinned = pinned.contains(b.path);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return b.lastModifiedSync().compareTo(a.lastModifiedSync());
    });

    setState(() {
      _notes        = notes;
      _pinnedNotes  = pinned;
      _isLoading    = false;
      _filterNotes(_searchQuery);
    });
  }

  void _filterNotes(String query) {
    setState(() {
      _searchQuery   = query;
      _filteredNotes = query.isEmpty
          ? List.from(_notes)
          : _notes.where((f) {
              final name =
                  f.path.split(Platform.pathSeparator).last.toLowerCase();
              return name.contains(query.toLowerCase());
            }).toList();
    });
  }

  Future<void> _createNewNote() async {
    String? noteName = await showDialog<String>(
      context: context,
      builder: (ctx) {
        String input = '';
        return AlertDialog(
          backgroundColor: _bgPanel,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
            side: BorderSide(color: _cyan.withValues(alpha: 0.3)),
          ),
          title: const Text(
            '// NUEVA NOTA',
            style: TextStyle(
              fontFamily:    'monospace',
              fontSize:      13,
              fontWeight:    FontWeight.bold,
              color:         _cyan,
              letterSpacing: 1.5,
            ),
          ),
          content: TextField(
            autofocus: true,
            style: const TextStyle(
              color:      _cyan,
              fontFamily: 'monospace',
              fontSize:   13,
            ),
            decoration: InputDecoration(
              hintText: 'nombre_del_archivo..._',
              hintStyle: TextStyle(
                color:      _cyanDim.withValues(alpha: 0.4),
                fontFamily: 'monospace',
                fontSize:   13,
              ),
              enabledBorder: const UnderlineInputBorder(
                borderSide: BorderSide(color: _cyanBord),
              ),
              focusedBorder: const UnderlineInputBorder(
                borderSide: BorderSide(color: _cyan, width: 1.5),
              ),
            ),
            onChanged: (val) => input = val,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text(
                'CANCELAR',
                style: TextStyle(
                  color:      _cyanDim,
                  fontFamily: 'monospace',
                  fontSize:   11,
                  letterSpacing: 1.5,
                ),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _green,
                foregroundColor: _bg,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(3)),
              ),
              onPressed: () => Navigator.pop(ctx, input),
              child: const Text(
                'CREAR',
                style: TextStyle(
                  fontFamily:    'monospace',
                  fontSize:      11,
                  fontWeight:    FontWeight.bold,
                  letterSpacing: 1.5,
                ),
              ),
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
      backgroundColor: _bg,
      appBar: _buildAppBar(),
      body: Column(
        children: [
          _buildSearch(),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: _cyan))
                : _notes.isEmpty
                    ? _buildEmpty()
                    : NotesGlitchEffect(
                        isActive: false,
                        child: ListView.separated(
                          padding:
                              const EdgeInsets.symmetric(vertical: 6),
                          itemCount:        _filteredNotes.length,
                          separatorBuilder: (_, _) =>
                              const Divider(height: 1, color: _cyanBord),
                          itemBuilder: _buildNoteItem,
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed:       _createNewNote,
        backgroundColor: _green,
        foregroundColor: _bg,
        child: const Icon(Icons.add, size: 26),
      ),
    );
  }

  // ── AppBar — same pattern as alerts_screen / pomodoro_screen ──────────────

  PreferredSizeWidget _buildAppBar() => AppBar(
        backgroundColor: _bg,
        elevation:       0,
        titleSpacing:    16,
        title: const Text(
          'NEO_NOTAS',
          style: TextStyle(
            fontFamily:    'monospace',
            fontSize:      12,
            fontWeight:    FontWeight.bold,
            color:         _green,
            letterSpacing: 2.5,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
              height: 1, color: Color.fromRGBO(0, 255, 136, 0.28)),
        ),
      );

  // ── Terminal-style search bar ──────────────────────────────────────────────

  Widget _buildSearch() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
      child: TextField(
        style: const TextStyle(
          color:      _cyan,
          fontFamily: 'monospace',
          fontSize:   13,
        ),
        decoration: InputDecoration(
          // inline "> " terminal prompt
          prefix: const Text(
            '> ',
            style: TextStyle(
              color:      _green,
              fontFamily: 'monospace',
              fontSize:   14,
              fontWeight: FontWeight.bold,
            ),
          ),
          hintText: 'buscar notas..._',
          hintStyle: TextStyle(
            color:      _cyanDim.withValues(alpha: 0.35),
            fontFamily: 'monospace',
            fontSize:   13,
          ),
          filled:      true,
          fillColor:   _bgPanel,
          isDense:     true,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(3),
            borderSide: const BorderSide(color: _cyanBord),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(3),
            borderSide:
                const BorderSide(color: _green, width: 1.5),
          ),
        ),
        onChanged: _filterNotes,
      ),
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  Widget _buildEmpty() => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.description_outlined,
                size: 48, color: _cyan.withValues(alpha: 0.15)),
            const SizedBox(height: 16),
            const Text(
              '// SIN NOTAS //',
              style: TextStyle(
                fontFamily:    'monospace',
                color:         _cyanDim,
                fontSize:      12,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'pulsa + para crear una nueva nota',
              style: TextStyle(
                fontFamily: 'monospace',
                color:      _cyan.withValues(alpha: 0.25),
                fontSize:   10,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      );

  // ── Note tile — same layout as alerts_screen _buildAlertTile ──────────────

  Widget _buildNoteItem(BuildContext context, int index) {
    final file      = _filteredNotes[index];
    final rawName   = file.path.split(Platform.pathSeparator).last;
    // Strip .md extension for display
    final display   = rawName.endsWith('.md')
        ? rawName.substring(0, rawName.length - 3)
        : rawName;
    final isPinned    = _pinnedNotes.contains(file.path);
    final isGlitching = _glitchingFiles.contains(file.path);
    final modified    = _dateFmt.format(file.lastModifiedSync());

    return NotesGlitchEffect(
      isActive: isGlitching,
      child: Dismissible(
        key:       Key(file.path),
        direction: DismissDirection.endToStart,
        background: Container(
          alignment: Alignment.centerRight,
          padding:   const EdgeInsets.only(right: 20),
          color:     _magenta.withValues(alpha: 0.12),
          child:     const Icon(Icons.delete_outline,
              color: _magenta, size: 22),
        ),
        confirmDismiss: (_) async {
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              backgroundColor: _bgPanel,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4),
                side: BorderSide(color: _magenta.withValues(alpha: 0.4)),
              ),
              title: const Text(
                '// BORRAR NOTA',
                style: TextStyle(
                  fontFamily:    'monospace',
                  fontSize:      13,
                  fontWeight:    FontWeight.bold,
                  color:         _magenta,
                  letterSpacing: 1.5,
                ),
              ),
              content: Text(
                '¿Eliminar "$display"?\nEsta acción no se puede deshacer.',
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize:   12,
                  color:      _cyanDim,
                  height:     1.6,
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text(
                    'CANCELAR',
                    style: TextStyle(
                      color:      _cyanDim,
                      fontFamily: 'monospace',
                      fontSize:   11,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _magenta,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(3)),
                  ),
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text(
                    'BORRAR',
                    style: TextStyle(
                      fontFamily:    'monospace',
                      fontSize:      11,
                      fontWeight:    FontWeight.bold,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          );
          if (confirmed == true) _deleteNoteWithGlitch(file);
          return false;
        },
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => NotesEditorScreen(file: file),
              ),
            ).then((_) => _loadNotes());
          },
          onLongPress: () => _togglePin(file),
          splashColor: _cyan.withValues(alpha: 0.05),
          child: Container(
            padding: const EdgeInsets.symmetric(
                horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: _cyanFaint,
              border: isPinned
                  ? const Border(
                      left: BorderSide(color: _magenta, width: 2.5))
                  : null,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // pin / doc dot
                Padding(
                  padding: const EdgeInsets.only(top: 4, right: 10),
                  child: isPinned
                      ? const Icon(Icons.push_pin,
                          size: 14, color: _magenta)
                      : Container(
                          width:  7,
                          height: 7,
                          margin: const EdgeInsets.only(top: 2),
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: _cyanBord,
                          ),
                        ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        display,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize:   13.5,
                          color:      _cyan,
                          height:     1.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        modified,
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize:   10,
                          color:      _cyan.withValues(alpha: 0.3),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right,
                    size: 18, color: _cyanBord),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
