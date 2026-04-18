import React, { useState } from 'react';
import { useEditor } from '../../BlogEditorContext';
import ColorPickerInput from '../ColorPickerInput';
import { makeNoticiaReference } from '../../utils/insertionUtils';
import { convertirTextoConNotasEnLlaves } from '../../utils/notesUtils';
import * as S from '../../BlogEditorCss';

const NOTE_ZONE_PRESETS = [
  'E0F8F7', 'fffda5', 'fff4cb', 'e3ffd0',
  'ffd0df', 'e2e7ff', 'fdffe2', 'f8e2ff',
];

interface Props {
  pasarANotas: boolean;
  onPasarANotasChange: (v: boolean) => void;
  tituloNota: string;
  onTituloNotaChange: (v: string) => void;
  colorNota: string;
  onColorNotaChange: (v: string) => void;
}

const NoteZoneSection: React.FC<Props> = ({
  pasarANotas, onPasarANotasChange,
  tituloNota, onTituloNotaChange,
  colorNota, onColorNotaChange,
}) => {
  const { textareaRef, insertCode } = useEditor();
  const [refTitulo, setRefTitulo] = useState('');
  const [refEnlace, setRefEnlace] = useState('https://');
  const [refAutor, setRefAutor] = useState('');
  const [refMedio, setRefMedio] = useState('');
  const [refFecha, setRefFecha] = useState('');

  const handleCreateReference = () => {
    insertCode(makeNoticiaReference(refTitulo, refEnlace, refAutor, refMedio, refFecha), '');
    setRefTitulo(''); setRefEnlace('https://'); setRefAutor(''); setRefMedio(''); setRefFecha('');
  };

  const handleImport = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const [newContent, foundTitle, hasNotes] = convertirTextoConNotasEnLlaves(ta.value);
    ta.value = newContent;
    if (hasNotes) { onTituloNotaChange(foundTitle); onPasarANotasChange(true); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
        <input type="checkbox" checked={pasarANotas} onChange={(e) => onPasarANotasChange(e.target.checked)} />
        Convert {'{ }'} to footnotes on export
      </label>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Note title (for anchor IDs)</label>
        <input type="text" style={S.sidebarInput()} value={tituloNota}
          onChange={(e) => onTituloNotaChange(e.target.value)} placeholder="e.g. MyArticle" />
      </div>
      <button style={S.sidebarSecondaryButton()} onClick={handleImport}>
        Import existing footnotes → {'{ }'}
      </button>
      <div style={S.sidebarRow()}>
        <label style={S.sidebarLabel()}>Note zone background color</label>
        <ColorPickerInput value={colorNota} onChange={onColorNotaChange}
          extraPresets={NOTE_ZONE_PRESETS} includeEmpty />
      </div>
      <div style={S.sidebarDivider()} />
      <fieldset style={S.sidebarFieldset()}>
        <legend style={S.sidebarFieldsetLegend()}>New reference</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          <div style={S.sidebarRow()}>
            <label style={S.sidebarLabel()}>Title</label>
            <input type="text" style={S.sidebarInput()} value={refTitulo}
              onChange={(e) => setRefTitulo(e.target.value)} placeholder="Article title" />
          </div>
          <div style={S.sidebarRow()}>
            <label style={S.sidebarLabel()}>Link</label>
            <input type="text" style={S.sidebarInput()} value={refEnlace}
              onChange={(e) => setRefEnlace(e.target.value)} placeholder="https://…" />
          </div>
          <div style={S.sidebarRow()}>
            <label style={S.sidebarLabel()}>Author</label>
            <input type="text" style={S.sidebarInput()} value={refAutor}
              onChange={(e) => setRefAutor(e.target.value)} placeholder="Author name" />
          </div>
          <div style={S.sidebarRow()}>
            <label style={S.sidebarLabel()}>Media outlet</label>
            <input type="text" style={S.sidebarInput()} value={refMedio}
              onChange={(e) => setRefMedio(e.target.value)} placeholder="Newspaper, blog…" />
          </div>
          <div style={S.sidebarRow()}>
            <label style={S.sidebarLabel()}>Date</label>
            <input type="text" style={S.sidebarInput()} value={refFecha}
              onChange={(e) => setRefFecha(e.target.value)} placeholder="2026-04-18" />
          </div>
          <button style={S.sidebarButton()} onClick={handleCreateReference}>Insert reference</button>
        </div>
      </fieldset>
    </div>
  );
};

export default NoteZoneSection;
