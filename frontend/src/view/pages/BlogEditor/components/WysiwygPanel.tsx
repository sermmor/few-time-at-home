/**
 * WysiwygPanel — visual "word-processor" editor built on the browser's
 * native contenteditable API + document.execCommand.
 *
 * No external library is required.
 *
 * Key design decisions
 * ────────────────────
 * • All toolbar buttons use onMouseDown + e.preventDefault() so they never
 *   steal focus from the editor (and therefore never lose the selection).
 * • document.execCommand() is "deprecated" in the spec but is fully
 *   supported in every modern browser and is the standard foundation that
 *   open-source editors like Tiptap/Quill use under the hood.
 * • For link insertion the selection is saved before the popover opens
 *   (clicking in the URL input would otherwise clear the caret) and
 *   restored just before createLink executes.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import LinkPopover from './LinkPopover';
import * as S from '../BlogEditorCss';
import './wysiwyg.css';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialContent: string;
  onUpdate: (html: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True when the current selection / caret has the given command active. */
function queryState(cmd: string): boolean {
  try { return document.queryCommandState(cmd); } catch { return false; }
}

/** The current block-level tag name, e.g. "h1", "p", "blockquote". */
function queryBlock(): string {
  try { return document.queryCommandValue('formatBlock').toLowerCase(); } catch { return ''; }
}

/** Save the current window selection as a Range (or null). */
function saveSelection(): Range | null {
  const sel = window.getSelection();
  return sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
}

/** Restore a previously saved Range into the window selection. */
function restoreSelection(range: Range | null): void {
  if (!range) return;
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

// ── Toolbar divider ───────────────────────────────────────────────────────────

const Div: React.FC = () => <span style={S.toolbarDivider()} />;

// ── Component ─────────────────────────────────────────────────────────────────

const WysiwygPanel: React.FC<Props> = ({ initialContent, onUpdate }) => {
  const editorRef  = useRef<HTMLDivElement>(null);
  const savedSel   = useRef<Range | null>(null);
  const [tick,     setTick]     = useState(0);   // forces toolbar re-render on selection change
  const [showLink, setShowLink] = useState(false);
  const linkRef    = useRef<HTMLDivElement>(null);

  // ── Initialise content once on mount ─────────────────────────────────────
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
      editorRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toolbar active-state: re-render when selection changes ────────────────
  useEffect(() => {
    const handle = () => setTick((n) => n + 1);
    document.addEventListener('selectionchange', handle);
    return () => document.removeEventListener('selectionchange', handle);
  }, []);

  // ── Close link popover on outside click ───────────────────────────────────
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (showLink && linkRef.current && !linkRef.current.contains(e.target as Node)) {
        setShowLink(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showLink]);

  // ── Core execCommand wrapper ──────────────────────────────────────────────
  const exec = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value ?? undefined);
    if (editorRef.current) {
      onUpdate(editorRef.current.innerHTML);
      editorRef.current.focus();
    }
    setTick((n) => n + 1);
  }, [onUpdate]);

  /**
   * Toolbar button handler.
   * Uses onMouseDown + preventDefault so the editor never loses focus /
   * selection when the user clicks a button.
   */
  const tool = useCallback(
    (cmd: string, value?: string) =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        exec(cmd, value);
      },
    [exec],
  );

  // ── Sync on user input ────────────────────────────────────────────────────
  const handleInput = useCallback(() => {
    if (editorRef.current) onUpdate(editorRef.current.innerHTML);
  }, [onUpdate]);

  // ── Link helpers ──────────────────────────────────────────────────────────
  const handleLinkBtnMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    savedSel.current = saveSelection(); // snapshot before focus is lost
    setShowLink((v) => !v);
  };

  const handleLinkInsert = useCallback((url: string) => {
    restoreSelection(savedSel.current);
    exec('createLink', url);
    setShowLink(false);
  }, [exec]);

  // ── Image helper ──────────────────────────────────────────────────────────
  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const src = window.prompt('Image URL:');
    if (src) exec('insertImage', src);
  };

  // ── Toolbar button style ──────────────────────────────────────────────────
  const btn = (active: boolean, extra?: React.CSSProperties): React.CSSProperties =>
    ({ ...S.toolbarBtn(active), ...extra });

  void tick; // consumed only to keep eslint happy

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* ── WYSIWYG Toolbar ── */}
      <div style={S.toolbarBar()}>

        {/* History */}
        <button style={btn(false)} title="Undo (Ctrl+Z)"  onMouseDown={tool('undo')}>↶</button>
        <button style={btn(false)} title="Redo (Ctrl+Y)"  onMouseDown={tool('redo')}>↷</button>

        <Div />

        {/* Inline formatting */}
        <button style={btn(queryState('bold'),          { fontWeight:     'bold'         })} title="Bold"          onMouseDown={tool('bold')}>B</button>
        <button style={btn(queryState('italic'),        { fontStyle:      'italic'       })} title="Italic"        onMouseDown={tool('italic')}>I</button>
        <button style={btn(queryState('underline'),     { textDecoration: 'underline'    })} title="Underline"     onMouseDown={tool('underline')}>U</button>
        <button style={btn(queryState('strikeThrough'), { textDecoration: 'line-through' })} title="Strikethrough" onMouseDown={tool('strikeThrough')}>S̶</button>

        <Div />

        {/* Headings / paragraph */}
        <button style={btn(queryBlock() === 'h1', { fontWeight: 'bold', fontSize: '13px' })} title="Heading 1" onMouseDown={tool('formatBlock', 'h1')}>H1</button>
        <button style={btn(queryBlock() === 'h2', { fontWeight: 'bold', fontSize: '12px' })} title="Heading 2" onMouseDown={tool('formatBlock', 'h2')}>H2</button>
        <button style={btn(queryBlock() === 'h3', { fontWeight: 'bold', fontSize: '11px' })} title="Heading 3" onMouseDown={tool('formatBlock', 'h3')}>H3</button>
        <button style={btn(queryBlock() === 'p')}                                            title="Paragraph" onMouseDown={tool('formatBlock', 'p')}>P</button>

        <Div />

        {/* Text alignment */}
        <button style={btn(queryState('justifyLeft'))}   title="Align left"   onMouseDown={tool('justifyLeft')}>←</button>
        <button style={btn(queryState('justifyCenter'))} title="Align center" onMouseDown={tool('justifyCenter')}>⊙</button>
        <button style={btn(queryState('justifyRight'))}  title="Align right"  onMouseDown={tool('justifyRight')}>→</button>
        <button style={btn(queryState('justifyFull'))}   title="Justify"      onMouseDown={tool('justifyFull')}>≡</button>

        <Div />

        {/* Lists */}
        <button style={btn(queryState('insertUnorderedList'))} title="Bullet list"   onMouseDown={tool('insertUnorderedList')}>•</button>
        <button style={btn(queryState('insertOrderedList'))}   title="Numbered list" onMouseDown={tool('insertOrderedList')}>1.</button>

        <Div />

        {/* Indent */}
        <button style={btn(false)} title="Indent"  onMouseDown={tool('indent')}>→|</button>
        <button style={btn(false)} title="Outdent" onMouseDown={tool('outdent')}>|←</button>

        <Div />

        {/* Block quote + separator */}
        <button style={btn(queryBlock() === 'blockquote')} title="Blockquote"      onMouseDown={tool('formatBlock', 'blockquote')}>BQ</button>
        <button style={btn(false)}                         title="Horizontal rule" onMouseDown={tool('insertHorizontalRule')}>─</button>

        <Div />

        {/* Link */}
        <div ref={linkRef} style={{ position: 'relative' }}>
          <button style={btn(showLink)} title="Insert link" onMouseDown={handleLinkBtnMouseDown}>🔗</button>
          {showLink && (
            <LinkPopover onInsert={handleLinkInsert} onClose={() => setShowLink(false)} />
          )}
        </div>

        {/* Image */}
        <button style={btn(false)} title="Insert image by URL" onMouseDown={handleImageMouseDown}>Img</button>

      </div>

      {/* ── Editable content area ── */}
      <div
        ref={editorRef}
        className="wysiwyg-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px 28px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          cursor: 'default',
        }}
      />

    </div>
  );
};

export default WysiwygPanel;
