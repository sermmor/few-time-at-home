import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:gal/gal.dart';
import 'package:image_picker/image_picker.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
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

  bool   _isEditing    = true;
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
    final sel  = _controller.selection;
    if (sel.baseOffset == -1 || sel.extentOffset == -1) {
      _controller.text = text + prefix + suffix;
      return;
    }
    final start    = sel.start;
    final end      = sel.end;
    final selected = text.substring(start, end);
    _controller.text =
        text.replaceRange(start, end, '$prefix$selected$suffix');
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

  // ── Shared helpers ────────────────────────────────────────────────────────

  String get _baseName {
    final raw = widget.file.path.split(Platform.pathSeparator).last;
    return raw.endsWith('.md') ? raw.substring(0, raw.length - 3) : raw;
  }

  /// Build the styled pw.Widget list from the current note content.
  /// Used by both image and PDF export so layout is always identical.
  List<pw.Widget> _buildPdfContent({
    required PdfColor textClr,
    required PdfColor h1Clr,
    required PdfColor h2Clr,
    required PdfColor bulletClr,
  }) {
    final lines = _controller.text.split('\n');
    final result = <pw.Widget>[];

    for (final line in lines) {
      if (line.startsWith('# ')) {
        result
          ..add(pw.Text(line.substring(2),
              style: pw.TextStyle(
                  fontSize: 20,
                  fontWeight: pw.FontWeight.bold,
                  color: h1Clr)))
          ..add(pw.SizedBox(height: 10));
      } else if (line.startsWith('## ')) {
        result
          ..add(pw.Text(line.substring(3),
              style: pw.TextStyle(
                  fontSize: 15,
                  fontWeight: pw.FontWeight.bold,
                  color: h2Clr)))
          ..add(pw.SizedBox(height: 8));
      } else if (line.startsWith('### ')) {
        result
          ..add(pw.Text(line.substring(4),
              style: pw.TextStyle(
                  fontSize: 13,
                  fontWeight: pw.FontWeight.bold,
                  color: h2Clr)))
          ..add(pw.SizedBox(height: 6));
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        result
          ..add(pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('•  ',
                  style: pw.TextStyle(fontSize: 12, color: bulletClr)),
              pw.Expanded(
                child: pw.Text(_stripInline(line.substring(2)),
                    style: pw.TextStyle(fontSize: 12, color: textClr)),
              ),
            ],
          ))
          ..add(pw.SizedBox(height: 3));
      } else if (line.trim().isEmpty) {
        result.add(pw.SizedBox(height: 8));
      } else {
        result
          ..add(pw.Text(_stripInline(line),
              style: pw.TextStyle(fontSize: 12, color: textClr)))
          ..add(pw.SizedBox(height: 3));
      }
    }
    return result;
  }

  /// Strip the most common inline Markdown decorators for plain-text rendering.
  String _stripInline(String text) {
    return text
        .replaceAllMapped(RegExp(r'\*\*(.+?)\*\*'), (m) => m.group(1) ?? '')
        .replaceAllMapped(RegExp(r'\*(.+?)\*'), (m) => m.group(1) ?? '')
        .replaceAllMapped(RegExp(r'`(.+?)`'), (m) => m.group(1) ?? '');
  }

  // ── Export as PNG image ───────────────────────────────────────────────────
  //
  // We intentionally avoid Flutter's RenderRepaintBoundary.toImage() because
  // it operates on the GPU/raster thread and can deadlock with Android's
  // FileProvider when the receiving app (e.g. Telegram) reads the file while
  // our engine is still busy.
  //
  // Instead we reuse the same PDF pipeline that _exportAsPdf() uses and
  // rasterize page 0 to PNG via Printing.raster() — identical native path,
  // zero widget-capture, proven to work.
  //
  // The output is a dark-themed cyberpunk image matching the app palette.

  Future<void> _exportAsImage() async {
    try {
      // ── Dark-theme PDF colours ─────────────────────────────────────────
      final darkBg   = PdfColor.fromHex('#020c18');
      final cyanClr  = PdfColor.fromHex('#00ffe7');
      final magentaC = PdfColor.fromHex('#ff00cc');
      final textClr  = PdfColor.fromHex('#e0e0e0');
      final dimClr   = PdfColor.fromHex('#5a7080');
      final sepClr   = PdfColor.fromHex('#003d30'); // dark-cyan rule

      // ── Build PDF ─────────────────────────────────────────────────────
      final doc     = pw.Document();
      final content = _buildPdfContent(
        textClr:   textClr,
        h1Clr:     magentaC,
        h2Clr:     cyanClr,
        bulletClr: cyanClr,
      );

      doc.addPage(pw.MultiPage(
        pageTheme: pw.PageTheme(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(40),
          // Dark background fills the full page behind the content.
          buildBackground: (_) => pw.FullPage(
            ignoreMargins: true,
            child: pw.Container(color: darkBg),
          ),
        ),
        header: (ctx) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(_baseName,
                    style: pw.TextStyle(
                        fontSize: 10,
                        color: cyanClr,
                        fontWeight: pw.FontWeight.bold)),
                pw.Text('NEO_NOTAS',
                    style: pw.TextStyle(fontSize: 9, color: dimClr)),
              ],
            ),
            pw.Container(
                margin: const pw.EdgeInsets.symmetric(vertical: 3),
                height: 0.5,
                color: sepClr),
            pw.SizedBox(height: 4),
          ],
        ),
        build: (_) => content,
      ));

      final pdfBytes = await doc.save();

      // ── Rasterise page 0 → PNG at 150 DPI ────────────────────────────
      Uint8List? pngBytes;
      await for (final page
          in Printing.raster(pdfBytes, dpi: 150, pages: [0])) {
        pngBytes = await page.toPng();
        break;
      }
      if (pngBytes == null) {
        _showSnack('No se pudo generar la imagen.');
        return;
      }

      await Gal.putImageBytes(pngBytes, name: 'neo_nota_$_baseName');

      if (!mounted) return;
      _showSnack('Imagen guardada en la galería ✓');
    } catch (e) {
      _showSnack('Error exportando imagen: $e');
    }
  }

  // ── Export as PDF ─────────────────────────────────────────────────────────

  Future<void> _exportAsPdf() async {
    try {
      final content = _buildPdfContent(
        textClr:   PdfColors.black,
        h1Clr:     PdfColors.black,
        h2Clr:     PdfColors.black,
        bulletClr: PdfColors.black,
      );

      final doc = pw.Document();
      doc.addPage(pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        header: (pw.Context ctx) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              _baseName,
              style: pw.TextStyle(
                  fontSize: 9,
                  color: PdfColors.grey600,
                  fontWeight: pw.FontWeight.bold),
            ),
            pw.Divider(color: PdfColors.grey400, thickness: 0.5),
            pw.SizedBox(height: 4),
          ],
        ),
        build: (_) => content,
      ));

      await Printing.sharePdf(
        bytes: await doc.save(),
        filename: '$_baseName.pdf',
      );
    } catch (e) {
      _showSnack('Error exportando PDF: $e');
    }
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg,
            style: const TextStyle(color: NotesTheme.textMain)),
        backgroundColor: NotesTheme.darkGrey,
      ),
    );
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
            fontSize: 16,
            letterSpacing: 1.5,
          ),
        ),
        iconTheme: const IconThemeData(color: NotesTheme.neonCyan),
        actions: [
          // Share as PNG image — available in both modes
          IconButton(
            icon: const Icon(Icons.image_outlined),
            color: NotesTheme.neonCyan,
            onPressed: _exportAsImage,
            tooltip: 'Compartir como imagen',
          ),
          // Export as PDF
          IconButton(
            icon: const Icon(Icons.picture_as_pdf_outlined),
            color: NotesTheme.neonMagenta,
            onPressed: _exportAsPdf,
            tooltip: 'Exportar como PDF',
          ),
          // Edit / preview toggle
          IconButton(
            icon: Icon(
                _isEditing ? Icons.visibility_outlined : Icons.edit_outlined),
            color: NotesTheme.neonCyan,
            onPressed: () {
              if (_isEditing) _saveContent();
              setState(() => _isEditing = !_isEditing);
            },
            tooltip: _isEditing ? 'Ver formato' : 'Editar',
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
                icon: Icons.image_outlined,
                color: NotesTheme.neonMagenta),
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
      decoration: InputDecoration(
        border: InputBorder.none,
        focusedBorder: InputBorder.none,
        enabledBorder: InputBorder.none,
        filled: false,
        hintText: 'Escribe tu nota aquí...',
        hintStyle: const TextStyle(color: NotesTheme.textSecondary),
        contentPadding: const EdgeInsets.only(
            left: 32.0, right: 16.0, top: 16.0, bottom: 16.0),
      ),
    );
  }

  Widget _buildPreview() {
    return SingleChildScrollView(
      child: Container(
        width: double.infinity,
        color: NotesTheme.background,
        padding: const EdgeInsets.all(16.0),
        child: MarkdownBody(
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
            h3: const TextStyle(
                color: NotesTheme.neonCyan,
                fontSize: 16,
                fontWeight: FontWeight.bold),
            p: const TextStyle(
                color: NotesTheme.textMain, fontSize: 16, height: 1.5),
            code: const TextStyle(
                color: NotesTheme.neonYellow,
                backgroundColor: NotesTheme.darkGrey,
                fontSize: 14),
            codeblockDecoration: BoxDecoration(
              color: NotesTheme.darkGrey,
              border: Border.all(
                  color: NotesTheme.neonCyan.withValues(alpha: 0.4)),
              borderRadius: BorderRadius.circular(4),
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
                      color: NotesTheme.neonCyan.withValues(alpha: 0.4),
                      width: 1.5)),
            ),
            listBullet: const TextStyle(
                color: NotesTheme.neonCyan, fontSize: 16),
            strong: const TextStyle(
                color: NotesTheme.textMain, fontWeight: FontWeight.bold),
            em: const TextStyle(
                color: NotesTheme.textMain, fontStyle: FontStyle.italic),
          ),
          // ignore: deprecated_member_use
          imageBuilder: (uri, title, alt) {
            if (uri.scheme == 'file') {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(
                        color: NotesTheme.neonCyan.withValues(alpha: 0.5),
                        width: 1.5),
                    borderRadius: BorderRadius.circular(4),
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
