import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { EditorProvider, useEditor } from './BlogEditorContext';
import BlogEditorHeader from './components/BlogEditorHeader';
import BlogEditorToolbar from './components/BlogEditorToolbar';
import BlogEditorPanel from './components/BlogEditorPanel';
import BlogEditorSidebar from './components/BlogEditorSidebar';
import ExportModal from './components/ExportModal';
import ImportMarkdownModal from './components/ImportMarkdownModal';
import { ModalOpenFromCloud } from './components/ModalOpenFromCloud';
import { ModalSaveToCloud } from './components/ModalSaveToCloud';
import { createCodeEntry } from './utils/previewUtils';
import { htmlToMarkdown, markdownToHtml } from './utils/markdownUtils';
import { CloudActions } from '../../../core/actions/cloud';
import { TemporalData } from '../../../service/temporalData.service';
import * as S from './BlogEditorCss';

// ── Inner component (needs EditorProvider already mounted) ────────────────────

const BlogEditorInner: React.FC = () => {
  const { insertCode, getContent, textareaRef } = useEditor();

  const [mode, setMode] = useState<'edit' | 'wysiwyg' | 'preview'>('edit');
  const [previewHtml, setPreviewHtml] = useState('');
  const [wysiwygInitContent, setWysiwygInitContent] = useState('');
  const wysiwygHtmlRef = useRef('');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [exportData, setExportData] = useState<{ embedded: string; full: string; markdown: string } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Note-zone / tools settings
  const [pasarABr, setPasarABr]       = useState(false);
  const [pasarANotas, setPasarANotas] = useState(false);
  const [tituloNota, setTituloNota]   = useState('');
  const [colorNota, setColorNota]     = useState('FFD0DF');

  // Cloud open/save state
  const [cloudFilePath, setCloudFilePath] = useState<string | null>(null);
  const [showOpenModal, setShowOpenModal]     = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const closeSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  // ── Load file passed from Cloud via TemporalData bridge (on first mount) ────
  useEffect(() => {
    const content = TemporalData.EditorTextData;
    const path    = TemporalData.LastPathInTextEditor;
    if (content && path) {
      const ta = textareaRef.current;
      if (ta) {
        ta.value = path.toLowerCase().endsWith('.md') ? markdownToHtml(content) : content;
        ta.focus();
      }
      setCloudFilePath(path);
      TemporalData.EditorTextData = '';
      TemporalData.LastPathInTextEditor = '';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WYSIWYG helpers ───────────────────────────────────────────────────────────
  const handleWysiwygUpdate = useCallback((html: string) => {
    wysiwygHtmlRef.current = html;
  }, []);

  /** Returns the live content regardless of current mode. */
  const getCurrentContent = useCallback(() => {
    if (mode === 'wysiwyg') return wysiwygHtmlRef.current;
    return getContent();
  }, [mode, getContent]);

  // ── Tool toggle ──────────────────────────────────────────────────────────────
  const handleToolToggle = useCallback((tool: string) => {
    setActiveTool((prev) => (prev === tool ? null : tool));
  }, []);

  // ── Mode (Edit / WYSIWYG / Preview) ─────────────────────────────────────────
  const handleModeChange = useCallback((newMode: 'edit' | 'wysiwyg' | 'preview') => {
    // Leaving wysiwyg → flush contenteditable HTML back to the textarea
    if (mode === 'wysiwyg' && newMode !== 'wysiwyg') {
      const ta = textareaRef.current;
      if (ta) ta.value = wysiwygHtmlRef.current;
    }

    if (newMode === 'wysiwyg') {
      // Seed the WYSIWYG editor from the current textarea content
      const seed = getContent();
      wysiwygHtmlRef.current = seed;
      setWysiwygInitContent(seed);
      setActiveTool(null); // hide sidebar
    }

    if (newMode === 'preview') {
      const content = getCurrentContent();
      setPreviewHtml(createCodeEntry(content, tituloNota, pasarANotas, pasarABr, colorNota));
    }

    setMode(newMode);
  }, [mode, getContent, getCurrentContent, textareaRef, tituloNota, pasarANotas, pasarABr, colorNota]);

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const content = getCurrentContent();
    const embedded = createCodeEntry(content, tituloNota, pasarANotas, true, colorNota);
    const full =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtmlll/DTD/xhtmlll.dtd">\n` +
      `<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="es">\n<head>\n` +
      `  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>\n` +
      `  <title></title>\n</head>\n\n<body>\n` +
      embedded + '\n<br /><br /><i>Created with BlogXtender.</i>' +
      `\n</body>\n</html>\n`;
    setExportData({ embedded, full, markdown: htmlToMarkdown(embedded) });
  }, [getCurrentContent, tituloNota, pasarANotas, colorNota]);

  // ── Import Markdown (append) ─────────────────────────────────────────────────
  const handleImportMarkdown = useCallback((html: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.value = ta.value + '\n' + html;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [textareaRef]);

  // ── Open from Cloud ──────────────────────────────────────────────────────────
  const handleOpenFromCloud = useCallback((
    _drive: string,
    path: string,
    content: string,
    _filename: string,
  ) => {
    const ta = textareaRef.current;
    if (!ta) return;
    // Convert .md → HTML before loading
    ta.value = path.toLowerCase().endsWith('.md') ? markdownToHtml(content) : content;
    ta.focus();
    setCloudFilePath(path);
    setMode('edit');
  }, [textareaRef]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const doSave = useCallback(async (filePath: string) => {
    const content = getCurrentContent();
    const textContent = filePath.toLowerCase().endsWith('.md')
      ? htmlToMarkdown(content)
      : content;
    try {
      const result = await CloudActions.saveFile({ filePath, textContent });
      if (result.isUpdated) {
        setCloudFilePath(filePath);
        setSnackbar({ open: true, message: `Guardado en ${filePath}`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Error al guardar el fichero', severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, message: 'Error al guardar el fichero', severity: 'error' });
    }
  }, [getCurrentContent]);

  const handleSave = useCallback(() => {
    if (cloudFilePath) {
      doSave(cloudFilePath);
    } else {
      setShowSaveAsModal(true);
    }
  }, [cloudFilePath, doSave]);

  const handleSaveAs = useCallback((filePath: string) => {
    doSave(filePath);
  }, [doSave]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S works in all modes; Ctrl+B / Ctrl+I only in HTML edit mode
      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        if (mode !== 'edit' && e.key !== 's') return;
        if (e.key === 'b') {
          e.preventDefault();
          insertCode('<span style="font-weight: bold;">', '</span>');
        } else if (e.key === 'i') {
          e.preventDefault();
          insertCode('<span style="font-style: oblique;">', '</span>');
        } else if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mode, insertCode, handleSave]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      marginLeft: '-1rem',
      marginRight: '-1rem',
      marginTop: '-1.5rem',
      height: 'calc(100vh - 5.5rem)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#111827',
    }}>

      {/* Export modal */}
      {exportData && (
        <ExportModal
          embedded={exportData.embedded}
          full={exportData.full}
          markdown={exportData.markdown}
          onClose={() => setExportData(null)}
        />
      )}

      {/* Import Markdown modal */}
      {showImportModal && (
        <ImportMarkdownModal
          onImport={handleImportMarkdown}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Open from Cloud modal */}
      <ModalOpenFromCloud
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        onOpen={handleOpenFromCloud}
      />

      {/* Save As modal */}
      <ModalSaveToCloud
        isOpen={showSaveAsModal}
        onClose={() => setShowSaveAsModal(false)}
        onSave={handleSaveAs}
        initialFilename={cloudFilePath ? (cloudFilePath.split('/').pop() ?? '') : ''}
      />

      {/* Header */}
      <BlogEditorHeader
        mode={mode}
        onModeChange={handleModeChange}
        onExport={handleExport}
        onImportMarkdown={() => setShowImportModal(true)}
        onOpenFromCloud={() => setShowOpenModal(true)}
        onSave={handleSave}
        cloudFilePath={cloudFilePath}
      />

      {/* Toolbar */}
      <BlogEditorToolbar
        activeTool={activeTool}
        onToolToggle={handleToolToggle}
        mode={mode}
      />

      {/* Editor + Sidebar */}
      <div style={S.contentArea()}>
        <BlogEditorPanel
          mode={mode}
          previewHtml={previewHtml}
          wysiwygInitContent={wysiwygInitContent}
          onWysiwygUpdate={handleWysiwygUpdate}
        />
        {mode !== 'wysiwyg' && <BlogEditorSidebar
          activeTool={activeTool}
          onClose={() => setActiveTool(null)}
          pasarABr={pasarABr}
          onPasarABrChange={setPasarABr}
          pasarANotas={pasarANotas}
          onPasarANotasChange={setPasarANotas}
          tituloNota={tituloNota}
          onTituloNotaChange={setTituloNota}
          colorNota={colorNota}
          onColorNotaChange={setColorNota}
        />}
      </div>

      {/* Save snackbar */}
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={closeSnackbar}
        sx={{ zIndex: 9999 }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

// ── Exported page (wraps with EditorProvider) ─────────────────────────────────

export const BlogEditor: React.FC = () => (
  <EditorProvider>
    <BlogEditorInner />
  </EditorProvider>
);
