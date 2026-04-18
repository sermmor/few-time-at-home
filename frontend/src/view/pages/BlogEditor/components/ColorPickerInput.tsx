import React, { useRef } from 'react';
import * as S from '../BlogEditorCss';

const PRESET_COLORS = [
  'fffda5', 'fff4cb', 'ffcfa1', 'e3ffd0',
  'ffd0df', 'e2e7ff', 'fdffe2', 'f8e2ff',
];

interface Props {
  value: string;
  onChange: (hex: string) => void;
  extraPresets?: string[];
  includeEmpty?: boolean;
}

const ColorPickerInput: React.FC<Props> = ({
  value,
  onChange,
  extraPresets,
  includeEmpty = false,
}) => {
  const nativePickerRef = useRef<HTMLInputElement>(null);
  const presets = extraPresets ?? PRESET_COLORS;

  return (
    <div style={S.colorPickerWrapper()}>
      <div style={S.colorPickerRow()}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={S.colorHexInput()}
          placeholder="rrggbb"
          maxLength={6}
        />
        <input
          ref={nativePickerRef}
          type="color"
          value={value ? '#' + value : '#ffffff'}
          onChange={(e) => onChange(e.target.value.replace('#', ''))}
          style={{ cursor: 'pointer', width: '32px', height: '28px', border: 'none', padding: 0, borderRadius: '4px' }}
          title="Pick a color"
        />
        {value && (
          <div
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: '#' + value,
              border: '1px solid #d1d5db',
              borderRadius: '5px',
              flexShrink: 0,
            }}
          />
        )}
      </div>
      <div style={S.colorSwatchRow()}>
        {presets.map((c) => (
          <div key={c} style={S.colorSwatch(c)} title={'#' + c} onClick={() => onChange(c)} />
        ))}
        {includeEmpty && (
          <div style={S.colorSwatch('')} title="No color" onClick={() => onChange('')} />
        )}
      </div>
    </div>
  );
};

export default ColorPickerInput;
