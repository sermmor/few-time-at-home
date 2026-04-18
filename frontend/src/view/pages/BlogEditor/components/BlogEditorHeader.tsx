import React from 'react';
import * as S from '../BlogEditorCss';

export type EditorMode = 'edit' | 'wysiwyg' | 'preview';

const MODES: { id: EditorMode; label: string; title: string }[] = [
  { id: 'edit',    label: 'Edit HTML', title: 'Edit raw HTML source' },
  { id: 'preview', label: 'Preview',   title: 'Render preview of the final output' },
  { id: 'wysiwyg', label: 'Edit View', title: 'Edit visually like a word processor' },
];

interface Props {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onExport: () => void;
  onImportMarkdown: () => void;
  onOpenFromCloud: () => void;
  onSave: () => void;
  cloudFilePath: string | null;
}

const BlogEditorHeader: React.FC<Props> = ({
  mode, onModeChange, onExport, onImportMarkdown, onOpenFromCloud, onSave, cloudFilePath,
}) => {
  const filename = cloudFilePath
    ? cloudFilePath.split('/').pop() ?? cloudFilePath
    : null;

  return (
    <div style={S.headerBar()}>
      <div style={S.headerLeft()}>
        <span style={S.logoText()}>BlogXtender</span>
        {filename && (
          <span style={{ fontSize: '12px', color: '#6b7280', maxWidth: '260px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={cloudFilePath ?? ''}>
            {filename}
          </span>
        )}
        <div style={S.modeToggleGroup()}>
          {MODES.map(({ id, label, title }) => (
            <button key={id} style={S.modeToggleBtn(mode === id)} title={title}
              onClick={() => onModeChange(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={S.headerRight()}>
        <button
          style={{ ...S.exportBtn(), background: 'transparent', color: '#7c3aed', border: '1px solid #7c3aed' }}
          onClick={onOpenFromCloud}
          title="Open a .txt / .html / .md file from Cloud"
        >
          Open
        </button>
        <button
          style={{ ...S.exportBtn(), background: 'transparent', color: '#059669', border: '1px solid #059669' }}
          onClick={onSave}
          title={cloudFilePath ? `Save to ${cloudFilePath}` : 'Save As… (pick location in Cloud)'}
        >
          {cloudFilePath ? 'Save' : 'Save As…'}
        </button>
        <button
          style={{ ...S.exportBtn(), background: 'transparent', color: '#7c3aed', border: '1px solid #7c3aed' }}
          onClick={onImportMarkdown}
          title="Import Markdown and append to editor"
        >
          Import MD
        </button>
        <button style={S.exportBtn()} onClick={onExport}>Export</button>
      </div>
    </div>
  );
};

export default BlogEditorHeader;
