import React, { useState } from 'react';
import { useEditor } from '../../BlogEditorContext';
import { makeImageList } from '../../utils/insertionUtils';
import * as S from '../../BlogEditorCss';

interface ImageEntry { url: string; caption: string; }

const PictureListSection: React.FC = () => {
  const { insertCode } = useEditor();
  const [listTitle, setListTitle] = useState('');
  const [urlToAdd, setUrlToAdd] = useState('https://');
  const [captionToAdd, setCaptionToAdd] = useState('');
  const [images, setImages] = useState<ImageEntry[]>([]);

  const handleAdd = () => {
    if (!urlToAdd || urlToAdd === 'https://') return;
    setImages((prev) => [...prev, { url: urlToAdd, caption: captionToAdd }]);
    setUrlToAdd('https://'); setCaptionToAdd('');
  };

  const handleInsert = () => {
    if (!listTitle || images.length === 0) return;
    insertCode('', makeImageList(listTitle, images));
    setImages([]); setListTitle(''); setUrlToAdd('https://'); setCaptionToAdd('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Gallery title</label>
        <input type="text" style={S.sidebarInput()} value={listTitle}
          onChange={(e) => setListTitle(e.target.value)} placeholder="My gallery" />
      </div>
      <div style={S.sidebarDivider()} />
      <span style={S.sidebarLabel()}>Add image</span>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Image URL</label>
        <input type="text" style={S.sidebarInput()} value={urlToAdd}
          onChange={(e) => setUrlToAdd(e.target.value)} placeholder="https://…" />
      </div>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Caption</label>
        <input type="text" style={S.sidebarInput()} value={captionToAdd}
          onChange={(e) => setCaptionToAdd(e.target.value)} placeholder="Optional caption" />
      </div>
      <button style={S.sidebarSecondaryButton()} onClick={handleAdd}>+ Add to gallery</button>
      {images.length > 0 && (
        <>
          <div style={S.sidebarDivider()} />
          <span style={S.sidebarLabel()}>Images ({images.length})</span>
          <div style={S.imagePreviewStrip()}>
            {images.map((img, idx) => (
              <div key={idx} style={{ position: 'relative', display: 'inline-block' }} title={img.caption}>
                <img src={img.url} alt={img.caption}
                  style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #e5e7eb' }} />
                <button onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px',
                    borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', border: 'none',
                    cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Remove">✕</button>
              </div>
            ))}
          </div>
          <button style={S.sidebarButton()} onClick={handleInsert}>Insert Gallery</button>
        </>
      )}
    </div>
  );
};

export default PictureListSection;
