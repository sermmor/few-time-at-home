import React from 'react';
import * as S from '../BlogEditorCss';

interface CharEntry {
  label: string;
  title: string;
  init: string;
  end: string;
}

const CHARS: CharEntry[] = [
  { label: '«»', title: 'Guillemets',         init: '&#171;', end: '&#187;' },
  { label: '⎵',  title: 'Non-breaking space', init: '',       end: '&nbsp;' },
  { label: '—',  title: 'Em dash',            init: '',       end: '&#8212;' },
  { label: '©',  title: 'Copyright',          init: '',       end: '&#169;' },
  { label: '®',  title: 'Registered',         init: '',       end: '&#174;' },
  { label: '™',  title: 'Trademark',          init: '',       end: '&#8482;' },
  { label: '♪',  title: 'Music note',         init: '',       end: '&#9834;' },
  { label: '♫',  title: 'Music notes',        init: '',       end: '&#9835;' },
];

interface Props {
  onInsert: (init: string, end: string) => void;
  onClose: () => void;
}

const SpecialCharsMenu: React.FC<Props> = ({ onInsert, onClose }) => (
  <div style={S.specialCharsDropdown()}>
    {CHARS.map((c) => (
      <button
        key={c.label}
        title={c.title}
        style={S.specialCharBtn()}
        onClick={() => { onInsert(c.init, c.end); onClose(); }}
      >
        {c.label}
      </button>
    ))}
  </div>
);

export default SpecialCharsMenu;
