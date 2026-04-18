import React, { useState } from 'react';
import { useEditor } from '../../BlogEditorContext';
import { fromPDFFormatToText, findAndSelect } from '../../utils/textUtils';
import * as S from '../../BlogEditorCss';

interface Props {
  pasarABr: boolean;
  onPasarABrChange: (v: boolean) => void;
}

const ToolsSection: React.FC<Props> = ({ pasarABr, onPasarABrChange }) => {
  const { textareaRef, extractSelectedText, substituteSelectionWithText, setSelRange } = useEditor();
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  const handleReplaceSearch = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const selected = extractSelectedText();
    if (selected.toLowerCase() === searchText.toLowerCase()) {
      substituteSelectionWithText(replaceText);
    }
    const [start, end] = findAndSelect(ta.value, searchText);
    setSelRange(start, end);
  };

  const handlePdfFormat = () => {
    substituteSelectionWithText(fromPDFFormatToText(extractSelectedText()));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Search</label>
        <input type="text" style={S.sidebarInput()} value={searchText}
          onChange={(e) => setSearchText(e.target.value)} placeholder="Search for…"
          onKeyDown={(e) => { if (e.key === 'Enter') handleReplaceSearch(); }} />
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Replace with</label>
        <input type="text" style={S.sidebarInput()} value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)} placeholder="Replace with…"
          onKeyDown={(e) => { if (e.key === 'Enter') handleReplaceSearch(); }} />
      </div>
      <button style={S.sidebarButton()} onClick={handleReplaceSearch}>Replace / Find Next</button>
      <div style={S.sidebarDivider()} />
      <button style={S.sidebarSecondaryButton()} onClick={handlePdfFormat}>Format PDF paste</button>
      <span style={{ fontSize: '11px', color: '#6b7280' }}>
        Select pasted PDF text, then click to clean up line breaks.
      </span>
      <div style={S.sidebarDivider()} />
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
        <input type="checkbox" checked={pasarABr} onChange={(e) => onPasarABrChange(e.target.checked)} />
        Replace line breaks with &lt;br /&gt;
      </label>
    </div>
  );
};

export default ToolsSection;
