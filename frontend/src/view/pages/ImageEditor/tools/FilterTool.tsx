import React from 'react';
import { ModalCloudImagePicker } from '../../../molecules/ModalCloudImagePicker/ModalCloudImagePicker';
import { ModalCloudBrowser }     from '../../../molecules/ModalCloudBrowser/ModalCloudBrowser';
import { ImageEditorActions }    from '../../../../core/actions/imageEditor';
import { cloudImageStreamUrl }   from '../../../../core/urls-and-end-points';
import { suggestOutputName }     from '../types';

// ── Filter definitions ────────────────────────────────────────────────────────
interface FilterPreset {
  id:          string;
  label:       string;
  cssFilter:   string;   // CSS approximation for live preview
  // Backend sharp params (all optional — undefined = no change)
  grayscale?:  boolean;
  brightness?: number;
  saturation?: number;
  hue?:        number;
  linearMul?:  number;
  linearAdd?:  number;
}

export const FILTERS: FilterPreset[] = [
  { id: 'normal',    label: 'Normal',
    cssFilter: 'none' },

  { id: 'clarendon', label: 'Clarendon',
    cssFilter: 'brightness(1.1) contrast(1.2) saturate(1.35)',
    brightness: 1.1, saturation: 1.35, linearMul: 1.2, linearAdd: -15 },

  { id: 'gingham',   label: 'Gingham',
    cssFilter: 'brightness(1.05) contrast(0.9) saturate(0.65) sepia(0.15)',
    brightness: 1.05, saturation: 0.65, hue: 10, linearMul: 0.9, linearAdd: 15 },

  { id: 'moon',      label: 'Moon',
    cssFilter: 'grayscale(1) brightness(1.1) contrast(1.25)',
    grayscale: true, brightness: 1.1, linearMul: 1.25, linearAdd: -18 },

  { id: 'lark',      label: 'Lark',
    cssFilter: 'brightness(1.15) contrast(0.95) saturate(0.85) hue-rotate(-8deg)',
    brightness: 1.15, saturation: 0.85, hue: -8, linearMul: 0.95, linearAdd: 8 },

  { id: 'reyes',     label: 'Reyes',
    cssFilter: 'brightness(1.1) contrast(0.85) saturate(0.75) sepia(0.2)',
    brightness: 1.1, saturation: 0.75, hue: 12, linearMul: 0.85, linearAdd: 25 },

  { id: 'juno',      label: 'Juno',
    cssFilter: 'brightness(1.05) contrast(1.12) saturate(1.2) hue-rotate(15deg)',
    brightness: 1.05, saturation: 1.2, hue: 15, linearMul: 1.12, linearAdd: -8 },

  { id: 'slumber',   label: 'Slumber',
    cssFilter: 'brightness(0.88) contrast(1.1) saturate(0.7) hue-rotate(-12deg)',
    brightness: 0.88, saturation: 0.7, hue: -12, linearMul: 1.1, linearAdd: -5 },

  { id: 'crema',     label: 'Crema',
    cssFilter: 'brightness(1.05) contrast(0.88) saturate(0.7) sepia(0.15)',
    brightness: 1.05, saturation: 0.7, hue: 15, linearMul: 0.88, linearAdd: 22 },

  { id: 'ludwig',    label: 'Ludwig',
    cssFilter: 'brightness(1.1) contrast(1.25) sepia(0.1) hue-rotate(10deg)',
    brightness: 1.1, saturation: 1.0, hue: 10, linearMul: 1.25, linearAdd: -20 },

  { id: 'aden',      label: 'Aden',
    cssFilter: 'brightness(1.1) contrast(0.88) saturate(0.8) hue-rotate(-15deg)',
    brightness: 1.1, saturation: 0.8, hue: -15, linearMul: 0.88, linearAdd: 18 },

  { id: 'valencia',  label: 'Valencia',
    cssFilter: 'brightness(1.05) contrast(1.1) saturate(1.1) sepia(0.15) hue-rotate(20deg)',
    brightness: 1.05, saturation: 1.1, hue: 20, linearMul: 1.1, linearAdd: -6 },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onDone:  (msg: string) => void;
  onError: (msg: string) => void;
}

export const FilterTool: React.FC<Props> = ({ onDone, onError }) => {
  const [pickerOpen,      setPickerOpen     ] = React.useState(false);
  const [folderOpen,      setFolderOpen     ] = React.useState(false);
  const [sourcePath,      setSourcePath     ] = React.useState('');
  const [meta,            setMeta           ] = React.useState({ width: 0, height: 0, format: '' });
  const [selectedId,      setSelectedId     ] = React.useState('normal');
  const [outFolder,       setOutFolder      ] = React.useState('');
  const [outName,         setOutName        ] = React.useState('');
  const [busy,            setBusy           ] = React.useState(false);

  const activeFilter = FILTERS.find(f => f.id === selectedId)!;
  const srcUrl       = sourcePath ? cloudImageStreamUrl(sourcePath) : '';
  const outputPath   = outFolder && outName ? `${outFolder}/${outName}` : '';

  const handleSourcePicked = async (path: string) => {
    setSourcePath(path);
    const m = await ImageEditorActions.getMetadata(path).catch(() => ({ width: 0, height: 0, format: '' }));
    setMeta(m);
    setOutName(suggestOutputName(path, selectedId === 'normal' ? 'filtered' : selectedId));
  };

  // Update suggested filename when filter changes.
  React.useEffect(() => {
    if (sourcePath) {
      setOutName(suggestOutputName(sourcePath, selectedId === 'normal' ? 'filtered' : selectedId));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleRun = async () => {
    if (!sourcePath || !outputPath) return;
    setBusy(true);
    try {
      // Extract only the backend-relevant fields.
      const { id: _id, label: _l, cssFilter: _c, ...params } = activeFilter;
      const res = await ImageEditorActions.filter({ inputPath: sourcePath, outputPath, ...params });
      if (res.ok) onDone(`Guardado en ${res.outputPath}`);
      else        onError('El servidor devolvió un error.');
    } catch (e: any) {
      onError(e?.message ?? 'Error al aplicar filtro.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── Left panel ── */}
      <div className="ie-options" style={{ width: 240 }}>

        {/* Source */}
        <div>
          <div className="ie-section-label">Imagen fuente</div>
          <div className="ie-source-strip" onClick={() => setPickerOpen(true)}>
            <span className={`path ${sourcePath ? 'set' : ''}`}>
              {sourcePath ? sourcePath.split('/').pop() : 'Seleccionar imagen…'}
            </span>
            <span style={{ fontSize: 10, color: '#4a7a9b', flexShrink: 0 }}>📂</span>
          </div>
          {meta.width > 0 && (
            <div className="ie-meta" style={{ marginTop: 4 }}>
              {meta.width} × {meta.height} px · {meta.format.toUpperCase()}
            </div>
          )}
        </div>

        {/* Selected filter info */}
        <div>
          <div className="ie-section-label">Filtro activo</div>
          <div style={{
            fontSize: 13, fontWeight: 'bold', color: '#00ffe7',
            letterSpacing: 1, padding: '6px 0',
          }}>
            {activeFilter.label}
          </div>
          <div style={{ fontSize: 10, color: '#4a7a9b', lineHeight: 1.5 }}>
            Selecciona un filtro en la franja inferior · La previsualización se actualiza al instante
          </div>
        </div>

        {/* Output */}
        <div className="ie-output-section" style={{ marginTop: 'auto' }}>
          <div className="ie-section-label">Guardar como</div>
          <div className="ie-folder-strip" onClick={() => setFolderOpen(true)}>
            <span className={outFolder ? 'set' : ''}>{outFolder || 'Seleccionar carpeta…'}</span>
            <span style={{ fontSize: 10, color: '#4a7a9b', flexShrink: 0 }}>📁</span>
          </div>
          <div className="ie-field">
            <label>Nombre del archivo</label>
            <input className="ie-input" type="text" value={outName}
              placeholder="photo_clarendon.jpg"
              onChange={e => setOutName(e.target.value)} />
          </div>
          <button className="ie-btn"
            disabled={!sourcePath || !outputPath || busy || selectedId === 'normal'}
            onClick={handleRun}>
            {busy ? 'Procesando…' : 'Aplicar filtro'}
          </button>
          {selectedId === 'normal' && sourcePath && (
            <div style={{ fontSize: 10, color: '#4a7a9b', textAlign: 'center' }}>
              Selecciona un filtro para activar el botón
            </div>
          )}
        </div>
      </div>

      {/* ── Central area: big preview + filter strip ── */}
      <div className="ie-filter-center">

        {/* Big preview */}
        <div className="ie-filter-preview">
          {srcUrl ? (
            <img
              key={srcUrl}
              src={srcUrl}
              alt="preview"
              className="ie-preview-img"
              style={{ filter: activeFilter.cssFilter }}
            />
          ) : (
            <div className="ie-preview-empty">
              <div style={{ fontSize: 64, opacity: 0.15 }}>🎨</div>
              <span>Selecciona una imagen fuente</span>
              <span style={{ fontSize: 11 }}>Elige una imagen y luego un filtro</span>
            </div>
          )}
        </div>

        {/* Filter strip */}
        <div className="ie-filter-strip">
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`ie-filter-thumb${selectedId === f.id ? ' selected' : ''}`}
              onClick={() => setSelectedId(f.id)}
              title={f.label}
            >
              {srcUrl ? (
                <img
                  src={srcUrl}
                  alt={f.label}
                  className="ie-filter-thumb-img"
                  style={{ filter: f.cssFilter }}
                />
              ) : (
                <div className="ie-filter-placeholder" />
              )}
              <span className="ie-filter-thumb-label">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <ModalCloudImagePicker isOpen={pickerOpen} onClose={() => setPickerOpen(false)}
        title="Seleccionar imagen fuente" onAccept={handleSourcePicked} />
      <ModalCloudBrowser isOpen={folderOpen} onClose={() => setFolderOpen(false)}
        title="Carpeta de destino" onAccept={p => setOutFolder(p)} />
    </div>
  );
};
