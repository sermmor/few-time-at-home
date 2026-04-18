import React, { useState } from 'react';
import { useEditor } from '../../BlogEditorContext';
import { makeFraseLateral } from '../../utils/insertionUtils';
import * as S from '../../BlogEditorCss';

type Alignment = 'center' | 'left' | 'right';

const LateralTextSection: React.FC = () => {
  const { insertCode } = useEditor();
  const [alignment, setAlignment] = useState<Alignment>('center');
  const [text, setText] = useState('');

  const handleOk = () => {
    if (!text.trim()) return;
    insertCode('', makeFraseLateral(text, alignment));
    setText(''); setAlignment('center');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Alignment</label>
        <div style={S.sidebarRadioGroup()}>
          <label><input type="radio" name="FraseLateralAlign" checked={alignment === 'left'} onChange={() => setAlignment('left')} /> Left</label>
          <label><input type="radio" name="FraseLateralAlign" checked={alignment === 'center'} onChange={() => setAlignment('center')} /> Center</label>
          <label><input type="radio" name="FraseLateralAlign" checked={alignment === 'right'} onChange={() => setAlignment('right')} /> Right</label>
        </div>
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Pull-quote text</label>
        <textarea style={S.sidebarTextarea()} value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter pull-quote text…" />
      </div>
      <button style={S.sidebarButton()} onClick={handleOk}>Insert Pull Quote</button>
    </div>
  );
};

export default LateralTextSection;
