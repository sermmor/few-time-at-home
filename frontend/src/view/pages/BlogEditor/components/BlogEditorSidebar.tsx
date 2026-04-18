import React from 'react';
import * as S from '../BlogEditorCss';
import TableSection from './sections/TableSection';
import ColorUnderlineSection from './sections/ColorUnderlineSection';
import QuoteSection from './sections/QuoteSection';
import LateralTextSection from './sections/LateralTextSection';
import YoutubeSection from './sections/YoutubeSection';
import PictureSection from './sections/PictureSection';
import PictureListSection from './sections/PictureListSection';
import NoteZoneSection from './sections/NoteZoneSection';
import ToolsSection from './sections/ToolsSection';

const TOOL_TITLES: Record<string, string> = {
  table:     'Insert Table',
  highlight: 'Color Highlight',
  quote:     'Quote',
  lateral:   'Pull Quote',
  youtube:   'Embed Video',
  picture:   'Insert Picture',
  gallery:   'Picture Gallery',
  notes:     'Note Zone',
  find:      'Find & Replace',
};

interface Props {
  activeTool: string | null;
  onClose: () => void;
  pasarABr: boolean;
  onPasarABrChange: (v: boolean) => void;
  pasarANotas: boolean;
  onPasarANotasChange: (v: boolean) => void;
  tituloNota: string;
  onTituloNotaChange: (v: string) => void;
  colorNota: string;
  onColorNotaChange: (v: string) => void;
}

const BlogEditorSidebar: React.FC<Props> = ({
  activeTool, onClose,
  pasarABr, onPasarABrChange,
  pasarANotas, onPasarANotasChange,
  tituloNota, onTituloNotaChange,
  colorNota, onColorNotaChange,
}) => (
  <div style={S.sidebarContainer(!!activeTool)}>
    {activeTool && (
      <>
        <div style={S.sidebarHeader()}>
          <span style={S.sidebarTitle()}>{TOOL_TITLES[activeTool] ?? activeTool}</span>
          <button style={S.sidebarCloseBtn()} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={S.sidebarContent()}>
          {activeTool === 'table'     && <TableSection />}
          {activeTool === 'highlight' && <ColorUnderlineSection />}
          {activeTool === 'quote'     && <QuoteSection />}
          {activeTool === 'lateral'   && <LateralTextSection />}
          {activeTool === 'youtube'   && <YoutubeSection />}
          {activeTool === 'picture'   && <PictureSection />}
          {activeTool === 'gallery'   && <PictureListSection />}
          {activeTool === 'notes'     && (
            <NoteZoneSection
              pasarANotas={pasarANotas} onPasarANotasChange={onPasarANotasChange}
              tituloNota={tituloNota} onTituloNotaChange={onTituloNotaChange}
              colorNota={colorNota} onColorNotaChange={onColorNotaChange}
            />
          )}
          {activeTool === 'find'      && (
            <ToolsSection pasarABr={pasarABr} onPasarABrChange={onPasarABrChange} />
          )}
        </div>
      </>
    )}
  </div>
);

export default BlogEditorSidebar;
