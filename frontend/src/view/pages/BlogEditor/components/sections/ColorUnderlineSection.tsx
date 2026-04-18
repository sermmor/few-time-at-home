import React, { useState } from 'react';
import { useEditor } from '../../BlogEditorContext';
import ColorPickerInput from '../ColorPickerInput';
import { makeSubrayado } from '../../utils/insertionUtils';
import * as S from '../../BlogEditorCss';

const ColorUnderlineSection: React.FC = () => {
  const { insertCode } = useEditor();
  const [color, setColor] = useState('fffda5');

  const handleOk = () => {
    const [open, close] = makeSubrayado(color);
    insertCode(open, close);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Highlight color</label>
        <ColorPickerInput value={color} onChange={setColor} />
      </div>
      <button style={S.sidebarButton()} onClick={handleOk}>Apply Highlight</button>
    </div>
  );
};

export default ColorUnderlineSection;
