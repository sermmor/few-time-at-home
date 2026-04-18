import React from 'react';
import { useEditor } from '../BlogEditorContext';
import WysiwygPanel from './WysiwygPanel';
import * as S from '../BlogEditorCss';

const INITIAL_CONTENT = '<div style="text-align:justify;">\n\n</div>';

interface Props {
  mode: 'edit' | 'wysiwyg' | 'preview';
  previewHtml: string;
  wysiwygInitContent: string;
  onWysiwygUpdate: (html: string) => void;
}

const BlogEditorPanel: React.FC<Props> = ({ mode, previewHtml, wysiwygInitContent, onWysiwygUpdate }) => {
  const { textareaRef } = useEditor();

  return (
    <div style={{ ...S.editorWrapper(), display: 'flex', flexDirection: 'column' }}>
      {/*
        The textarea is ALWAYS mounted so its value is never lost when
        switching between Edit and other modes.
        Hidden (display:none) in wysiwyg and preview modes.
      */}
      <textarea
        ref={textareaRef}
        style={{ ...S.editorTextarea(), display: mode === 'edit' ? 'block' : 'none' }}
        name="contenidoTextoXtender"
        defaultValue={INITIAL_CONTENT}
      />

      {/* WYSIWYG mode — contenteditable editor with its own toolbar */}
      {mode === 'wysiwyg' && (
        <WysiwygPanel
          initialContent={wysiwygInitContent}
          onUpdate={onWysiwygUpdate}
        />
      )}

      {/* Preview mode — rendered HTML */}
      {mode === 'preview' && (
        <div style={S.previewArea()} dangerouslySetInnerHTML={{ __html: previewHtml }} />
      )}
    </div>
  );
};

export default BlogEditorPanel;
