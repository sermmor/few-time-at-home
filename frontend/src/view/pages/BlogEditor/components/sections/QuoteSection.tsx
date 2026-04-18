import React, { useState } from 'react';
import { useEditor } from '../../BlogEditorContext';
import ColorPickerInput from '../ColorPickerInput';
import { makeCita } from '../../utils/insertionUtils';
import * as S from '../../BlogEditorCss';

const QuoteSection: React.FC = () => {
  const { insertCode } = useEditor();
  const [color, setColor] = useState('fffda5');
  const [enBloque, setEnBloque] = useState(true);

  const handleOk = () => {
    const [open, close] = makeCita(color, enBloque);
    insertCode(open, close);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Quote type</label>
        <div style={S.sidebarRadioGroup()}>
          <label>
            <input type="radio" name="citaTipo" checked={enBloque} onChange={() => setEnBloque(true)} />{' '}Block
          </label>
          <label>
            <input type="radio" name="citaTipo" checked={!enBloque} onChange={() => setEnBloque(false)} />{' '}Inline
          </label>
        </div>
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Quote color</label>
        <ColorPickerInput value={color} onChange={setColor} />
      </div>
      <button style={S.sidebarButton()} onClick={handleOk}>Apply Quote</button>
    </div>
  );
};

export default QuoteSection;
