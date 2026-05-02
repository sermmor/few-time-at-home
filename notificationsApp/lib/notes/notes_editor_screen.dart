import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:image_picker/image_picker.dart';
import 'package:screenshot/screenshot.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'notes_storage_service.dart';
import 'notes_theme.dart';
import 'notes_syntax_controller.dart';

class NotesEditorScreen extends StatefulWidget {
  final File file;
  const NotesEditorScreen({super.key, required this.file});

  @override
  State<NotesEditorScreen> createState() => _NotesEditorScreenState();
}

class _NotesEditorScreenState extends State<NotesEditorScreen> {
  final NotesStorageService _storage = NotesStorageService();
  late final NotesSyntaxController _controller;
  final FocusNode _focusNode = FocusNode();
  final ScreenshotController _screenshotController = ScreenshotController();

  bool _isEditing = true;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _controller = NotesSyntaxController();
    _loadContent();
    _controller.addListener(_onTextChanged);
  }

  Future<void> _loadContent() async {
    final content = await _storage.readNote(widget.file);
    setState(() => _controller.text = content);
  }

  void _onTextChanged() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(seconds: 1), _saveContent);
  }

  Future<void> _saveContent() async {
    await _storage.saveNote(widget.file, _controller.text);
  }

  void _insertMarkdown(String prefix, String suffix) {
    final text = _controller.text;
    final sel = _controller.selection;
    if (sel.baseOffset == -1 || sel.extentOffset == -1) {
      _controller.text = text + prefix + suffix;
      return;
    }
    final start = sel.start;
    final end = sel.end;
    final selected = text.substring(start, end);
    _controller.text = text.replaceRange(start, end, '$prefix$selected$suffix');
    _controller.selection = TextSelection.collapsed(
        offset: start + prefix.length + selected.length);
    _focusNode.requestFocus();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked != null) {
      final saved = await _storage.saveImage(File(picked.path));
      if (saved != null) {
        _insertMarkdown('\n![Image](file://${saved.path})\n', '');
      }
    }
  }

  Future<void> _exportAsImage() async {
    try {
      final image = await _screenshotController.capture(
        delay: const Duration(milliseconds: 10),
        pixelRatio: 2.0,
      );
      if (image != null) {
        final dir = await getTemporaryDirectory();
        final file =
            await File('${dir.path}/note_export.png').create();
        await file.writeAsBytes(image);
        await Share.shareXFiles(
            [XFile(file.path)], text: 'Exported Note from Neo Notas');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Error exportando: $e',
              style: const TextStyle(color: NotesTheme.neonMagenta)),
        ));
      }
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _saveContent();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final fileName =
        widget.file.path.split(Platform.pathSeparator).last;
    return Scaffold(
      backgroundColor: NotesTheme.background,
      appBar: AppBar(
        backgroundColor: NotesTheme.background,
        elevation: 0,
        title: Text(
          fileName,
          style: const TextStyle(
            color: NotesTheme.neonCyan,
            fontFamily: 'monospace',
            fontSize: 16,
            letterSpacing: 1.5,
          ),
        ),
        iconTheme: const IconThemeData(color: NotesTheme.neonCyan),
        actions: [
          if (!_isEditing)
            IconButton(
              icon: const Icon(Icons.share),
              color: NotesTheme.neonMagenta,
              onPressed: _exportAsImage,
              tooltip: 'Exportar a Imagen',
            ),
          IconButton(
            icon: Icon(_isEditing ? Icons.visibility : Icons.edit),
            color: NotesTheme.neonYellow,
            onPressed: () {
              if (_isEditing) _saveContent();
              setState(() => _isEditing = !_isEditing);
            },
            tooltip:
                _isEditing ? 'Ver Modo Formato' : 'Editar Markdown',
          ),
        ],
      ),
      body: Column(
        children: [
          if (_isEditing) _buildToolbar(),
          Expanded(
            child: _isEditing ? _buildEditor() : _buildPreview(),
          ),
        ],
      ),
    );
  }

  // ── Toolbar ────────────────────────────────────────────────────────────────

  Widget _buildToolbar() {
    return Container(
      color: NotesTheme.darkGrey,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _btn('H1', () => _insertMarkdown('# ', '')),
            _btn('H2', () => _insertMarkdown('## ', '')),
            _btn('B', () => _insertMarkdown('**', '**'),
                icon: Icons.format_bold),
            _btn('I', () => _insertMarkdown('*', '*'),
                icon: Icons.format_italic),
            _btn('UL', () => _insertMarkdown('- ', ''),
                icon: Icons.format_list_bulleted),
            _btn('Code', () => _insertMarkdown('```\n', '\n```'),
                icon: Icons.code),
            _btn('IMG', _pickImage,
                icon: Icons.image, color: NotesTheme.neonMagenta),
          ],
        ),
      ),
    );
  }

  Widget _btn(String label, VoidCallback onPressed,
      {IconData? icon, Color color = NotesTheme.neonCyan}) {
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: NotesTheme.background,
          foregroundColor: color,
          side: BorderSide(color: color, width: 1),
          minimumSize: const Size(40, 36),
          padding: const EdgeInsets.symmetric(horizontal: 12),
        ),
        onPressed: onPressed,
        child: icon != null ? Icon(icon, size: 18) : Text(label),
      ),
    );
  }

  // ── Editor / Preview ───────────────────────────────────────────────────────

  Widget _buildEditor() {
    return TextField(
      controller: _controller,
      focusNode: _focusNode,
      maxLines: null,
      expands: true,
      keyboardType: TextInputType.multiline,
      style: const TextStyle(color: NotesTheme.textMain, fontSize: 16),
      decoration: const InputDecoration(
        border: InputBorder.none,
        focusedBorder: InputBorder.none,
        enabledBorder: InputBorder.none,
        filled: false,
        hintText: 'Escribe tu nota aquí...',
        contentPadding: EdgeInsets.only(
            left: 32.0, right: 16.0, top: 16.0, bottom: 16.0),
      ),
    );
  }

  Widget _buildPreview() {
    return Screenshot(
      controller: _screenshotController,
      child: Container(
        color: NotesTheme.background,
        padding: const EdgeInsets.all(16.0),
        child: Markdown(
          data: _controller.text,
          styleSheet: MarkdownStyleSheet(
            h1: const TextStyle(
                color: NotesTheme.neonMagenta,
                fontSize: 24,
                fontWeight: FontWeight.bold),
            h2: const TextStyle(
                color: NotesTheme.neonCyan,
                fontSize: 20,
                fontWeight: FontWeight.bold),
            p: const TextStyle(
                color: NotesTheme.textMain, fontSize: 16),
            code: const TextStyle(
                color: NotesTheme.neonYellow,
                backgroundColor: NotesTheme.darkGrey),
            codeblockDecoration: BoxDecoration(
              color: NotesTheme.darkGrey,
              border: Border.all(color: NotesTheme.neonCyan),
            ),
            blockquoteDecoration: const BoxDecoration(
              border: Border(
                  left: BorderSide(
                      color: NotesTheme.neonMagenta, width: 4)),
              color: NotesTheme.darkGrey,
            ),
            horizontalRuleDecoration: BoxDecoration(
              border: Border(
                  top: BorderSide(
                      color: NotesTheme.neonCyan.withOpacity(0.5),
                      width: 2)),
            ),
          ),
          imageBuilder: (uri, title, alt) {
            if (uri.scheme == 'file') {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(
                        color: NotesTheme.neonCyan, width: 2),
                  ),
                  child: Image.file(File(uri.path)),
                ),
              );
            }
            return Image.network(uri.toString());
          },
        ),
      ),
    );
  }
}
