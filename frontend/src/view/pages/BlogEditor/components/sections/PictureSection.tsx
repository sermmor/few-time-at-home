import React, { useState } from 'react';
import { useEditor } from '../../BlogEditorContext';
import { makeImagen } from '../../utils/insertionUtils';
import * as S from '../../BlogEditorCss';

type Alignment = 'center' | 'left' | 'right';

const PictureSection: React.FC = () => {
  const { insertCode } = useEditor();
  const [titleImg, setTitleImg] = useState('');
  const [altImg, setAltImg] = useState('');
  const [urlImg, setUrlImg] = useState('https://');
  const [alignment, setAlignment] = useState<Alignment>('center');
  const [caption, setCaption] = useState('');

  const handleOk = () => {
    insertCode('', makeImagen(titleImg, altImg, urlImg, caption, alignment));
    setTitleImg(''); setAltImg(''); setUrlImg('https://'); setCaption(''); setAlignment('center');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Image URL</label>
        <input type="text" style={S.sidebarInput()} value={urlImg} onChange={(e) => setUrlImg(e.target.value)} placeholder="https://…" />
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Alt text</label>
        <input type="text" style={S.sidebarInput()} value={altImg} onChange={(e) => setAltImg(e.target.value)} placeholder="Describe the image" />
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Title</label>
        <input type="text" style={S.sidebarInput()} value={titleImg} onChange={(e) => setTitleImg(e.target.value)} placeholder="Image title" />
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Alignment</label>
        <div style={S.sidebarRadioGroup()}>
          <label><input type="radio" name="imagenAlign" checked={alignment === 'left'} onChange={() => setAlignment('left')} /> Left</label>
          <label><input type="radio" name="imagenAlign" checked={alignment === 'center'} onChange={() => setAlignment('center')} /> Center</label>
          <label><input type="radio" name="imagenAlign" checked={alignment === 'right'} onChange={() => setAlignment('right')} /> Right</label>
        </div>
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Caption</label>
        <textarea style={S.sidebarTextarea()} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional caption…" />
      </div>
      <button style={S.sidebarButton()} onClick={handleOk}>Insert Picture</button>
    </div>
  );
};

export default PictureSection;
