import React, { useState, useEffect, useRef } from 'react';
import * as S from '../BlogEditorCss';

interface Props {
  onInsert: (url: string) => void;
  onClose: () => void;
}

const LinkPopover: React.FC<Props> = ({ onInsert, onClose }) => {
  const [url, setUrl] = useState('https://');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleConfirm = () => {
    if (url.trim()) onInsert(url.trim());
    onClose();
  };

  return (
    <div style={S.linkPopoverInner()}>
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleConfirm();
          if (e.key === 'Escape') onClose();
        }}
        style={S.linkPopoverInput()}
        placeholder="Paste or type URL…"
      />
      <button style={S.linkConfirmBtn()} onClick={handleConfirm}>Apply</button>
      <button style={S.linkCancelBtn()} onClick={onClose}>✕</button>
    </div>
  );
};

export default LinkPopover;
