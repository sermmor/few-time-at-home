import React from 'react';
import { useEditor } from '../BlogEditorContext';
import * as S from '../BlogEditorCss';

const INITIAL_CONTENT = '<div style="text-align:justify;">\n\n</div>';

interface Props {
  mode: 'edit' | 'preview';
  previewHtml: string;
}

const BlogEditorPanel: React.FC<Props> = ({ mode, previewHtml }) => {
  const { textareaRef } = useEditor();

  return (
    <div style={S.editorWrapper()}>
      <textarea
        ref={textareaRef}
        style={{ ...S.editorTextarea(), display: mode === 'edit' ? 'block' : 'none' }}
        name="contenidoTextoXtender"
        defaultValue={INITIAL_CONTENT}
      />
      {mode === 'preview' && (
        <div style={S.previewArea()} dangerouslySetInnerHTML={{ __html: previewHtml }} />
      )}
    </div>
  );
};

export default BlogEditorPanel;
