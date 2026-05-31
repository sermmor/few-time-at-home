import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../services/notes_service.dart';

// ── Notes list screen ────────────────────────────────────────────────────────
class NotesScreen extends StatefulWidget {
  const NotesScreen({super.key});
  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  List<NoteFile> _notes   = [];
  bool           _loading = true;
  String         _query   = '';
  final _searchCtrl = TextEditingController();

  @override
  void initState() { super.initState(); _reload(); }

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  Future<void> _reload() async {
    setState(() => _loading = true);
    final notes = await NotesService.instance.listNotes(query: _query);
    if (mounted) setState(() { _notes = notes; _loading = false; });
  }

  Future<void> _create() async {
    final ctrl = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: CyberColors.bgPanel,
        title: const Text('// NUEVA NOTA //',
            style: TextStyle(fontFamily: 'monospace', color: CyberColors.green,
                letterSpacing: 2, fontSize: 14)),
        content: TextField(
          controller: ctrl, autofocus: true,
          style: const TextStyle(color: CyberColors.white, fontFamily: 'monospace'),
          decoration: const InputDecoration(
            hintText: 'Nombre de la nota',
            hintStyle: TextStyle(color: CyberColors.gray),
            focusedBorder: UnderlineInputBorder(
                borderSide: BorderSide(color: CyberColors.green)),
            enabledBorder: UnderlineInputBorder(
                borderSide: BorderSide(color: CyberColors.border)),
          ),
          onSubmitted: (v) => Navigator.pop(context, v.trim()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar', style: TextStyle(color: CyberColors.gray))),
          TextButton(onPressed: () => Navigator.pop(context, ctrl.text.trim()),
              child: const Text('Crear', style: TextStyle(color: CyberColors.green))),
        ],
      ),
    );
    if (name == null || name.isEmpty) return;
    final note = await NotesService.instance.createNote(name);
    if (!mounted) return;
    await Navigator.push(context, MaterialPageRoute(
        builder: (_) => _NoteEditorScreen(path: note.path, name: note.name)));
    _reload();
  }

  Future<void> _delete(NoteFile note) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: CyberColors.bgPanel,
        title: const Text('// ELIMINAR //', style: TextStyle(
            fontFamily: 'monospace', color: CyberColors.magenta, letterSpacing: 2, fontSize: 14)),
        content: Text('¿Eliminar "${note.name}"?',
            style: const TextStyle(color: CyberColors.white)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar', style: TextStyle(color: CyberColors.gray))),
          TextButton(onPressed: () => Navigator.pop(context, true),
              child: const Text('Eliminar', style: TextStyle(color: CyberColors.magenta))),
        ],
      ),
    );
    if (ok == true) {
      await NotesService.instance.deleteNote(note.path);
      _reload();
    }
  }

  Future<void> _togglePin(NoteFile note) async {
    await NotesService.instance.togglePin(note.path);
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 600;

    return Scaffold(
      backgroundColor: CyberColors.bg,
      appBar: AppBar(
        backgroundColor: CyberColors.bgPanel,
        title: const Row(children: [
          Icon(Icons.description_outlined, color: CyberColors.green, size: 18),
          SizedBox(width: 8),
          Text('// NEO NOTAS //', style: TextStyle(
              color: CyberColors.green, letterSpacing: 3, fontSize: 13)),
        ]),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: CyberColors.green,
        foregroundColor: CyberColors.bg,
        onPressed: _create,
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          // Search bar
          Container(
            color: CyberColors.bgPanel,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) { _query = v; _reload(); },
              style: const TextStyle(fontFamily: 'monospace', color: CyberColors.green, fontSize: 13),
              decoration: InputDecoration(
                prefixText: '> ',
                prefixStyle: const TextStyle(color: CyberColors.green, fontFamily: 'monospace'),
                hintText: 'buscar nota...',
                hintStyle: TextStyle(color: CyberColors.green.withOpacity(0.3), fontFamily: 'monospace'),
                border: OutlineInputBorder(borderSide: BorderSide(color: CyberColors.border)),
                focusedBorder: const OutlineInputBorder(
                    borderSide: BorderSide(color: CyberColors.green)),
                enabledBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: CyberColors.border)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
          ),
          // List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: CyberColors.green))
                : _notes.isEmpty
                    ? const Center(child: Text(
                        '// SIN NOTAS //',
                        style: TextStyle(fontFamily: 'monospace', color: CyberColors.gray,
                            letterSpacing: 2, fontSize: 12)))
                    : isDesktop ? _buildGrid() : _buildList(),
          ),
        ],
      ),
    );
  }

  Widget _buildGrid() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 300,
        mainAxisExtent:     100,
        crossAxisSpacing:   12,
        mainAxisSpacing:    12,
      ),
      itemCount: _notes.length,
      itemBuilder: (_, i) => _buildNoteCard(_notes[i]),
    );
  }

  Widget _buildList() {
    return ListView.separated(
      padding:          const EdgeInsets.all(12),
      itemCount:        _notes.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder:      (_, i) => _buildNoteCard(_notes[i]),
    );
  }

  Widget _buildNoteCard(NoteFile note) {
    return GestureDetector(
      onTap: () async {
        await Navigator.push(context, MaterialPageRoute(
            builder: (_) => _NoteEditorScreen(path: note.path, name: note.name)));
        _reload();
      },
      onLongPress: () => _togglePin(note),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: CyberColors.bgPanel,
          border: Border.all(
            color: note.pinned ? CyberColors.magenta : CyberColors.border,
          ),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          children: [
            if (note.pinned)
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: Icon(Icons.push_pin, color: CyberColors.magenta, size: 14),
              ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment:  MainAxisAlignment.center,
                children: [
                  Text(note.name,
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 13,
                          color: CyberColors.white, letterSpacing: 0.5),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Text(DateFormat('dd/MM/yy HH:mm').format(note.modified),
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 10,
                          color: CyberColors.gray)),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: CyberColors.gray, size: 18),
              onPressed: () => _delete(note),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Note editor screen ───────────────────────────────────────────────────────
class _NoteEditorScreen extends StatefulWidget {
  final String path;
  final String name;
  const _NoteEditorScreen({required this.path, required this.name});
  @override
  State<_NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends State<_NoteEditorScreen> {
  late TextEditingController _ctrl;
  bool _preview = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController();
    _load();
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    final content = await NotesService.instance.readNote(widget.path);
    if (mounted) setState(() { _ctrl.text = content; _loading = false; });
  }

  Future<void> _save() async {
    await NotesService.instance.saveNote(widget.path, _ctrl.text);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: const Text('// GUARDADO //',
            style: TextStyle(fontFamily: 'monospace', color: CyberColors.bg)),
        backgroundColor: CyberColors.green,
        duration: const Duration(seconds: 1),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 800;

    return Scaffold(
      backgroundColor: CyberColors.bg,
      appBar: AppBar(
        backgroundColor: CyberColors.bgPanel,
        iconTheme: const IconThemeData(color: CyberColors.green),
        title: Text(widget.name, style: const TextStyle(
            fontFamily: 'monospace', fontSize: 13, color: CyberColors.green, letterSpacing: 2)),
        actions: [
          if (!isDesktop) IconButton(
            icon: Icon(_preview ? Icons.edit : Icons.visibility,
                color: CyberColors.green),
            onPressed: () => setState(() => _preview = !_preview),
            tooltip: _preview ? 'Editar' : 'Vista previa',
          ),
          IconButton(
            icon: const Icon(Icons.save_outlined, color: CyberColors.green),
            onPressed: _save,
            tooltip: 'Guardar',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: CyberColors.green))
          : isDesktop ? _buildSideBySide() : _buildSingle(),
    );
  }

  Widget _buildSideBySide() {
    return Row(
      children: [
        Expanded(child: _buildEditor()),
        Container(width: 1, color: CyberColors.border),
        Expanded(child: _buildPreview()),
      ],
    );
  }

  Widget _buildSingle() {
    return _preview ? _buildPreview() : _buildEditor();
  }

  Widget _buildEditor() {
    return Container(
      color: CyberColors.bg,
      padding: const EdgeInsets.all(12),
      child: TextField(
        controller: _ctrl,
        maxLines:   null,
        expands:    true,
        style: const TextStyle(fontFamily: 'monospace', fontSize: 13,
            color: CyberColors.white, height: 1.6),
        decoration: const InputDecoration(border: InputBorder.none),
      ),
    );
  }

  Widget _buildPreview() {
    return Container(
      color: CyberColors.bgPanel,
      padding: const EdgeInsets.all(16),
      child: Markdown(
        data: _ctrl.text,
        styleSheet: MarkdownStyleSheet(
          p:  const TextStyle(color: CyberColors.white, fontSize: 14, height: 1.6),
          h1: const TextStyle(color: CyberColors.green, fontFamily: 'monospace',
              fontSize: 22, letterSpacing: 2),
          h2: const TextStyle(color: CyberColors.green, fontFamily: 'monospace',
              fontSize: 18, letterSpacing: 1.5),
          h3: const TextStyle(color: CyberColors.cyan, fontFamily: 'monospace',
              fontSize: 15, letterSpacing: 1),
          code: TextStyle(
              color: CyberColors.amber, fontFamily: 'monospace', fontSize: 12,
              backgroundColor: CyberColors.bgLight),
          codeblockDecoration: BoxDecoration(
            color: CyberColors.bgLight,
            border: Border.all(color: CyberColors.border),
            borderRadius: BorderRadius.circular(4),
          ),
          blockquoteDecoration: BoxDecoration(
            border: const Border(left: BorderSide(color: CyberColors.cyan, width: 3)),
            color: CyberColors.bgLight,
          ),
          listBullet: const TextStyle(color: CyberColors.magenta),
          horizontalRuleDecoration: const BoxDecoration(
            border: Border(top: BorderSide(color: CyberColors.border)),
          ),
        ),
      ),
    );
  }
}
