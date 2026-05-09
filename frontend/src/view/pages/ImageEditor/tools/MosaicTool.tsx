import React from 'react';
import { ModalCloudImagePicker } from '../../../molecules/ModalCloudImagePicker/ModalCloudImagePicker';
import { ModalCloudBrowser }     from '../../../molecules/ModalCloudBrowser/ModalCloudBrowser';
import { ImageEditorActions }    from '../../../../core/actions/imageEditor';
import { cloudImageStreamUrl }   from '../../../../core/urls-and-end-points';

interface Props {
  onDone:  (msg: string) => void;
  onError: (msg: string) => void;
}

export const MosaicTool: React.FC<Props> = ({ onDone, onError }) => {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [folderOpen, setFolderOpen] = React.useState(false);
  const [images,     setImages    ] = React.useState<string[]>([]);
  const [cols,       setCols      ] = React.useState(3);
  const [cellW,      setCellW     ] = React.useState(400);
  const [cellH,      setCellH     ] = React.useState(300);
  const [gap,        setGap       ] = React.useState(10);
  const [bg,         setBg        ] = React.useState('#ffffff');
  const [outFolder,  setOutFolder ] = React.useState('');
  const [outName,    setOutName   ] = React.useState('mosaico.jpg');
  const [busy,       setBusy      ] = React.useState(false);

  const addImage = (path: string) => {
    setImages(prev => prev.includes(path) ? prev : [...prev, path]);
  };
  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const outputPath = outFolder && outName ? `${outFolder}/${outName}` : '';
  const rows  = Math.ceil(images.length / Math.max(1, cols));
  const totalW = cols * cellW + Math.max(0, cols - 1) * gap;
  const totalH = rows * cellH + Math.max(0, rows - 1) * gap;

  // ── Preview scale: fit the grid in the available central area ────────────
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el || totalW <= 0 || totalH <= 0) return;
    const availW = el.clientWidth  - 48;
    const availH = el.clientHeight - 48;
    if (availW <= 0 || availH <= 0) return;
    setPreviewScale(Math.min(availW / totalW, availH / totalH, 1));
  }, [totalW, totalH, images.length]);

  const pCellW = Math.round(cellW * previewScale);
  const pCellH = Math.round(cellH * previewScale);
  const pGap   = Math.max(1, Math.round(gap * previewScale));

  const handleRun = async () => {
    if (images.length < 2 || !outputPath) return;
    setBusy(true);
    try {
      const res = await ImageEditorActions.mosaic({
        inputPaths: images, cols, cellWidth: cellW, cellHeight: cellH,
        gap, background: bg, outputPath,
      });
      if (res.ok) onDone(`Guardado en ${res.outputPath}`);
      else        onError('El servidor devolvió un error.');
    } catch (e: any) {
      onError(e?.message ?? 'Error al crear mosaico.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── Left options panel ── */}
      <div className="ie-options" style={{ width: 260 }}>

        {/* Image list */}
        <div>
          <div className="ie-section-label">Imágenes ({images.length})</div>
          <div className="ie-mosaic-list">
            {images.map((p, i) => (
              <div key={p} className="ie-mosaic-item">
                <span className="name">{p.split('/').pop()}</span>
                <button onClick={() => removeImage(i)}>✕</button>
              </div>
            ))}
            {images.length === 0 && (
              <div style={{ fontSize: 11, color: '#2a4a6a', padding: '8px 0' }}>
                Añade al menos 2 imágenes
              </div>
            )}
          </div>
          <button className="ie-btn ie-btn-secondary" style={{ marginTop: 6 }}
            onClick={() => setPickerOpen(true)}>
            + Añadir imagen
          </button>
        </div>

        {/* Grid options */}
        <div>
          <div className="ie-section-label">Configuración del mosaico</div>
          <div className="ie-input-row">
            <div className="ie-field" style={{ flex: 1 }}>
              <label>Columnas</label>
              <input className="ie-input" type="number" min={1} value={cols}
                onChange={e => setCols(Math.max(1, +e.target.value))} />
            </div>
            <div className="ie-field" style={{ flex: 1 }}>
              <label>Separación (px)</label>
              <input className="ie-input" type="number" min={0} value={gap}
                onChange={e => setGap(Math.max(0, +e.target.value))} />
            </div>
          </div>
          <div className="ie-input-row" style={{ marginTop: 6 }}>
            <div className="ie-field" style={{ flex: 1 }}>
              <label>Celda ancho (px)</label>
              <input className="ie-input" type="number" min={10} value={cellW}
                onChange={e => setCellW(Math.max(10, +e.target.value))} />
            </div>
            <div className="ie-field" style={{ flex: 1 }}>
              <label>Celda alto (px)</label>
              <input className="ie-input" type="number" min={10} value={cellH}
                onChange={e => setCellH(Math.max(10, +e.target.value))} />
            </div>
          </div>
          <div className="ie-field" style={{ marginTop: 6 }}>
            <label>Fondo</label>
            <input className="ie-input" type="color" value={bg}
              onChange={e => setBg(e.target.value)} />
          </div>
          {images.length > 0 && (
            <div className="ie-meta" style={{ marginTop: 6 }}>
              Resultado: {totalW} × {totalH} px ({rows} filas × {cols} cols)
            </div>
          )}
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
              placeholder="mosaico.jpg"
              onChange={e => setOutName(e.target.value)} />
          </div>
          <button className="ie-btn"
            disabled={images.length < 2 || !outputPath || busy}
            onClick={handleRun}>
            {busy ? 'Procesando…' : 'Crear mosaico'}
          </button>
        </div>
      </div>

      {/* ── Central preview area ── */}
      <div
        ref={wrapperRef}
        className="ie-preview"
        style={{ alignItems: 'flex-start', justifyContent: 'flex-start',
                 overflow: 'auto', padding: 24 }}
      >
        {images.length > 0 ? (
          <div style={{
            display: 'inline-grid',
            gridTemplateColumns: `repeat(${cols}, ${pCellW}px)`,
            gap: `${pGap}px`,
            background: bg,
            padding: pGap,
            border: '1px solid #1a3a5c',
            borderRadius: 4,
            flexShrink: 0,
          }}>
            {images.map((p, i) => (
              <img
                key={i}
                src={cloudImageStreamUrl(p)}
                alt=""
                style={{
                  width: pCellW, height: pCellH,
                  objectFit: 'contain',
                  background: bg,
                  display: 'block',
                }}
              />
            ))}
          </div>
        ) : (
          <div className="ie-preview-empty" style={{ margin: 'auto' }}>
            <div style={{ fontSize: 64, opacity: 0.15 }}>⊞</div>
            <span>Añade imágenes para ver la previsualización</span>
            <span style={{ fontSize: 11 }}>La cuadrícula aparecerá aquí</span>
          </div>
        )}
      </div>

      <ModalCloudImagePicker isOpen={pickerOpen} onClose={() => setPickerOpen(false)}
        title="Añadir imagen al mosaico" onAccept={addImage} />
      <ModalCloudBrowser isOpen={folderOpen} onClose={() => setFolderOpen(false)}
        title="Carpeta de destino" onAccept={p => setOutFolder(p)} />
    </div>
  );
};
