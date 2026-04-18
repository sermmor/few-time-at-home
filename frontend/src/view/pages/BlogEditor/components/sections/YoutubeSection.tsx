import React, { useState } from 'react';
import { useEditor } from '../../BlogEditorContext';
import { makeYoutubeCode } from '../../utils/insertionUtils';
import * as S from '../../BlogEditorCss';

type Alignment = 'center' | 'left' | 'right';

const YoutubeSection: React.FC = () => {
  const { insertCode } = useEditor();
  const [alignment, setAlignment] = useState<Alignment>('center');
  const [code, setCode] = useState('');
  const [caption, setCaption] = useState('');

  const handleOk = () => {
    if (!code.trim()) return;
    insertCode('', makeYoutubeCode(code, caption, alignment));
    setCode(''); setCaption(''); setAlignment('center');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Alignment</label>
        <div style={S.sidebarRadioGroup()}>
          <label><input type="radio" name="YoutubeInsertAlign" checked={alignment === 'left'} onChange={() => setAlignment('left')} /> Left</label>
          <label><input type="radio" name="YoutubeInsertAlign" checked={alignment === 'center'} onChange={() => setAlignment('center')} /> Center</label>
          <label><input type="radio" name="YoutubeInsertAlign" checked={alignment === 'right'} onChange={() => setAlignment('right')} /> Right</label>
        </div>
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>YouTube embed code</label>
        <input type="text" style={S.sidebarInput()} value={code} onChange={(e) => setCode(e.target.value)} placeholder='<iframe src="…"></iframe>' />
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Caption</label>
        <textarea style={S.sidebarTextarea()} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional caption…" />
      </div>
      <button style={S.sidebarButton()} onClick={handleOk}>Insert Video</button>
    </div>
  );
};

export default YoutubeSection;
