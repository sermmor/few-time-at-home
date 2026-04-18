import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor } from '../BlogEditorContext';
import LinkPopover from './LinkPopover';
import SpecialCharsMenu from './SpecialCharsMenu';
import * as S from '../BlogEditorCss';

interface ToolDef { id: string; label: string; title: string; }

const SIDEBAR_TOOLS: ToolDef[] = [
  { id: 'table',     label: 'Tbl',   title: 'Insert Table' },
  { id: 'highlight', label: 'Mark',  title: 'Color Highlight' },
  { id: 'quote',     label: 'Quote', title: 'Quote' },
  { id: 'lateral',   label: 'Pull',  title: 'Pull Quote / Lateral Text' },
  { id: 'youtube',   label: '▶',     title: 'Embed YouTube' },
  { id: 'picture',   label: 'Img',   title: 'Insert Picture' },
  { id: 'gallery',   label: 'Gal',   title: 'Picture Gallery' },
  { id: 'notes',     label: 'Notes', title: 'Note Zone' },
  { id: 'find',      label: 'Find',  title: 'Find & Replace / Tools' },
];

interface Props {
  activeTool: string | null;
  onToolToggle: (tool: string) => void;
  mode: 'edit' | 'wysiwyg' | 'preview';
}

const Div: React.FC = () => <span style={S.toolbarDivider()} />;

const BlogEditorToolbar: React.FC<Props> = ({ activeTool, onToolToggle, mode }) => {
  const { insertCode, extractSelectedText, substituteSelectionWithText } = useEditor();

  const [indent, setIndent] = useState('0');
  const [showLink, setShowLink] = useState(false);
  const [showSpecial, setShowSpecial] = useState(false);

  const linkRef = useRef<HTMLDivElement>(null);
  const specialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showLink && linkRef.current && !linkRef.current.contains(e.target as Node)) setShowLink(false);
      if (showSpecial && specialRef.current && !specialRef.current.contains(e.target as Node)) setShowSpecial(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLink, showSpecial]);

  const indentAttr = useCallback(() => {
    const v = indent.trim();
    return v && v !== '0' ? `style="text-indent:${v}pt;"` : '';
  }, [indent]);

  const indentInline = useCallback(() => {
    const v = indent.trim();
    return v && v !== '0' ? `text-indent:${v}pt;` : '';
  }, [indent]);

  const ic = insertCode;

  // HTML toolbar only visible in HTML edit mode; WYSIWYG has its own toolbar
  if (mode !== 'edit') return null;

  return (
    <div style={S.toolbarBar()}>

      {/* Special chars */}
      <div ref={specialRef} style={{ position: 'relative' }}>
        <button style={S.toolbarBtn(showSpecial)} title="Special characters"
          onClick={() => { setShowSpecial((v) => !v); setShowLink(false); }}>
          Ω▾
        </button>
        {showSpecial && (
          <SpecialCharsMenu onInsert={(init, end) => ic(init, end)} onClose={() => setShowSpecial(false)} />
        )}
      </div>

      <Div />

      {/* Case */}
      <button style={S.toolbarBtn()} title="UPPERCASE selection"
        onClick={() => substituteSelectionWithText(extractSelectedText().toUpperCase())}>Aᴬ</button>
      <button style={S.toolbarBtn()} title="lowercase selection"
        onClick={() => substituteSelectionWithText(extractSelectedText().toLowerCase())}>aᵃ</button>

      <Div />

      {/* Inline formatting */}
      <button style={{ ...S.toolbarBtn(), fontWeight: 'bold' }} title="Bold (Ctrl+B)"
        onClick={() => ic('<span style="font-weight: bold;">', '</span>')}>B</button>
      <button style={{ ...S.toolbarBtn(), fontStyle: 'italic' }} title="Italic (Ctrl+I)"
        onClick={() => ic('<span style="font-style: oblique;">', '</span>')}>I</button>
      <button style={{ ...S.toolbarBtn(), textDecoration: 'underline' }} title="Underline"
        onClick={() => ic('<span style="text-decoration: underline;">', '</span>')}>U</button>
      <button style={{ ...S.toolbarBtn(), textDecoration: 'overline' }} title="Overline"
        onClick={() => ic('<span style="text-decoration: overline;">', '</span>')}>Ō</button>
      <button style={{ ...S.toolbarBtn(), textDecoration: 'line-through' }} title="Strikethrough"
        onClick={() => ic('<span style="text-decoration: line-through;">', '</span>')}>S̶</button>
      <button style={S.toolbarBtn()} title="Superscript"
        onClick={() => ic('<span style="vertical-align: super; font-size: 0.75em;">', '</span>')}>x²</button>
      <button style={S.toolbarBtn()} title="Subscript"
        onClick={() => ic('<span style="vertical-align: sub; font-size: 0.75em;">', '</span>')}>x₂</button>

      <Div />

      {/* Headings */}
      <button style={{ ...S.toolbarBtn(), fontWeight: 'bold', fontSize: '13px' }} title="Heading 1"
        onClick={() => ic('<h1>', '</h1>')}>H1</button>
      <button style={{ ...S.toolbarBtn(), fontWeight: 'bold', fontSize: '12px' }} title="Heading 2"
        onClick={() => ic('<h2>', '</h2>')}>H2</button>
      <button style={{ ...S.toolbarBtn(), fontWeight: 'bold', fontSize: '11px' }} title="Heading 3"
        onClick={() => ic('<h3>', '</h3>')}>H3</button>

      <Div />

      {/* Indent + paragraph / alignment */}
      <span style={S.toolbarLabel()}>⇥</span>
      <input type="number" min="0" style={S.toolbarIndentInput()} value={indent}
        onChange={(e) => setIndent(e.target.value)} title="Indentation in pt" />
      <span style={S.toolbarLabel()}>pt</span>

      <button style={S.toolbarBtn()} title="Paragraph"
        onClick={() => ic(`<p ${indentAttr()}>`, '</p>')}>P</button>
      <button style={S.toolbarBtn()} title="Blockquote"
        onClick={() => ic(`<blockquote ${indentAttr()}>`, '</blockquote>')}>BQ</button>
      <button style={S.toolbarBtn()} title="Align left"
        onClick={() => ic(`<div style="text-align:left;${indentInline()}">`, '</div>')}>←</button>
      <button style={S.toolbarBtn()} title="Align center"
        onClick={() => ic(`<div style="text-align:center;${indentInline()}">`, '</div>')}>⊙</button>
      <button style={S.toolbarBtn()} title="Align right"
        onClick={() => ic(`<div style="text-align:right;${indentInline()}">`, '</div>')}>→</button>
      <button style={S.toolbarBtn()} title="Justify"
        onClick={() => ic(`<div style="text-align:justify;${indentInline()}">`, '</div>')}>≡</button>
      <button style={S.toolbarBtn()} title="2 Columns"
        onClick={() => ic('', '<table><tr><td>\n\n</td><td>\n\n</td></tr></table>')}>‖</button>

      <Div />

      {/* Lists */}
      <button style={S.toolbarBtn()} title="List item" onClick={() => ic('<li>', '</li>')}>•</button>
      <button style={S.toolbarBtn()} title="Unordered list" onClick={() => ic('<ul>\n    <li>', '</li>\n</ul>')}>ul</button>
      <button style={S.toolbarBtn()} title="Ordered list" onClick={() => ic('<ol>\n    <li>', '</li>\n</ol>')}>ol</button>
      <button style={S.toolbarBtn()} title="Convert '- ' lines to <ul>"
        onClick={() => {
          let text = extractSelectedText();
          text = text.replace(/- /gi, '    </li><li>');
          text = '<ul>\n' + text + '\n</ul>';
          text = text.replace('</li>', '');
          substituteSelectionWithText(text);
        }}>-→ul</button>
      <button style={S.toolbarBtn()} title="Convert '#- ' lines to <ol>"
        onClick={() => {
          let text = extractSelectedText();
          text = text.replace(/#- /gi, '    </li><li>');
          text = '<ol>\n' + text + '\n</ol>';
          text = text.replace('</li>', '');
          substituteSelectionWithText(text);
        }}>#→ol</button>

      <Div />

      {/* Link */}
      <div ref={linkRef} style={{ position: 'relative' }}>
        <button style={S.toolbarBtn(showLink)} title="Insert link"
          onClick={() => { setShowLink((v) => !v); setShowSpecial(false); }}>
          🔗
        </button>
        {showLink && (
          <LinkPopover onInsert={(url) => ic(`<a href="${url}" target='_blank'>`, '</a>')} onClose={() => setShowLink(false)} />
        )}
      </div>

      <span style={{ ...S.toolbarDivider(), margin: '0 8px', backgroundColor: '#c4b5fd' }} />

      {/* Sidebar tool buttons */}
      {SIDEBAR_TOOLS.map((t) => (
        <button key={t.id} style={S.toolbarBtn(activeTool === t.id)} title={t.title}
          onClick={() => onToolToggle(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
};

export default BlogEditorToolbar;
