import React, { useState, useEffect, useRef } from 'react';
import * as S from '../BlogEditorCss';
import { markdownToHtml } from '../utils/markdownUtils';

interface Props {
  onImport: (html: string) => void;
  onClose: () => void;
}

const ImportMarkdownModal: React.FC<Props> = ({ onImport, onClose }) => {
  const [markdown, setMarkdown] = useState('');
  const [preview, setPreview] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleImport = () => {
    if (!markdown.trim()) return;
    onImport(markdownToHtml(markdown));
    onClose();
  };

  return (
    <div style={S.modalOverlay()} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...S.modalBox(), width: '680px', maxWidth: '94vw' }}>
        <div style={S.modalHead()}>
          <span style={S.modalTitle()}>Import Markdown</span>
          <button style={S.modalCloseBtn()} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalTabBar()}>
          <button style={S.modalTab(tab === 'write')} onClick={() => setTab('write')}>Write</button>
          <button style={S.modalTab(tab === 'preview')} onClick={() => { setPreview(markdownToHtml(markdown)); setTab('preview'); }}>
            Preview HTML
          </button>
        </div>
        <div style={S.modalBody()}>
          {tab === 'write' ? (
            <>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, flexShrink: 0 }}>
                Paste your Markdown here. It will be converted to HTML and appended to the editor.
              </p>
              <textarea
                ref={textareaRef}
                style={{ ...S.modalCode(), resize: 'vertical' }}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="# Heading&#10;&#10;**Bold**, *italic*&#10;&#10;- List item"
                readOnly={false}
              />
            </>
          ) : (
            <>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, flexShrink: 0 }}>
                This HTML will be appended to your editor content.
              </p>
              <textarea style={S.modalCode()} value={preview} readOnly />
            </>
          )}
        </div>
        <div style={S.modalFooter()}>
          <span style={S.charCount()}>{markdown.length.toLocaleString()} characters</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ ...S.copyBtn(false), background: 'transparent', color: '#6b7280', border: '1px solid #d1d5db' }} onClick={onClose}>
              Cancel
            </button>
            <button style={S.copyBtn(false)} onClick={handleImport} disabled={!markdown.trim()}>
              Import &amp; Append
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportMarkdownModal;
