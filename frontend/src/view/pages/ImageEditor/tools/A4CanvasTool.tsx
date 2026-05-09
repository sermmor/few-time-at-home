import React from 'react';
import { v4 as uuid } from 'uuid';
import { ModalCloudImagePicker } from '../../../molecules/ModalCloudImagePicker/ModalCloudImagePicker';
import { ModalCloudBrowser }     from '../../../molecules/ModalCloudBrowser/ModalCloudBrowser';
import { ImageEditorActions }    from '../../../../core/actions/imageEditor';
import { cloudImageStreamUrl }   from '../../../../core/urls-and-end-points';
import { A4CanvasLayer }         from '../types';

// A4 portrait canvas display size (595 × 842 ≈ A4 at 72 dpi)
const CANVAS_W = 595;
const CANVAS_H = 842;

interface Props {
  onDone:  (msg: string) => void;
  onError: (msg: string) => void;
}

interface DragState  { id: string; startX: number; startY: number; origX: number; origY: number }
interface ResizeState { id: string; startX: number; startY: number; origW: number; origH: number; aspect: number }

export const A4CanvasTool: React.FC<Props> = ({ onDone, onError }) => {
  const [pickerOpen,   setPickerOpen  ] = React.useState(false);
  const [folderOpen,   setFolderOpen  ] = React.useState(false);
  const [layers,       setLayers      ] = React.useState<A4CanvasLayer[]>([]);
  const [selected,     setSelected    ] = React.useState<string | null>(null);
  const [bg,           setBg          ] = React.useState('#ffffff');
  const [dpi,          setDpi         ] = React.useState<150 | 300>(150);
  const [outFolder,    setOutFolder   ] = React.useState('');
  const [outName,      setOutName     ] = React.useState('a4_export.pdf');
  const [busy,         setBusy        ] = React.useState(false);

  const dragging = React.useRef<DragState | null>(null);
  const resizing = React.useRef<ResizeState | null>(null);

  // ── Global mouse handlers ───────────────────────────────────────────────
  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const { id, startX, startY, origX, origY } = dragging.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        setLayers(prev => prev.map(l => l.id === id
          ? { ...l, x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) }
          : l
        ));
      }
      if (resizing.current) {
        const { id, startX, startY, origW, origH, aspect } = resizing.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        // Use the average diagonal delta to drive proportional resize.
        const delta = (dx + dy) / 2;
        const newW  = Math.max(20, origW + delta);
        const newH  = Math.max(20, Math.round(newW / aspect));
        setLayers(prev => prev.map(l => l.id === id
          ? { ...l, width: newW, height: newH }
          : l
        ));
      }
    };
    const onUp = () => { dragging.current = null; resizing.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ── Add image from cloud picker ─────────────────────────────────────────
  const handleAddImage = async (path: string) => {
    const meta = await ImageEditorActions.getMetadata(path).catch(() => ({ width: 200, height: 200, format: '' }));
    // Scale image to fit inside canvas (max 50% of canvas width initially)
    const maxW = Math.round(CANVAS_W * 0.5);
    const scale = meta.width > maxW ? maxW / meta.width : 1;
    const w = Math.round(meta.width  * scale);
    const h = Math.round(meta.height * scale);
    const newLayer: A4CanvasLayer = {
      id: uuid(),
      cloudPath: path,
      previewUrl: cloudImageStreamUrl(path),
      x: Math.round((CANVAS_W - w) / 2),
      y: Math.round((CANVAS_H - h) / 2),
      width: w,
      height: h,
    };
    setLayers(prev => [...prev, newLayer]);
    setSelected(newLayer.id);
  };

  // ── Layer interaction ───────────────────────────────────────────────────
  const startDrag = (e: React.MouseEvent, layer: A4CanvasLayer) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(layer.id);
    dragging.current = { id: layer.id, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y };
  };

  const startResize = (e: React.MouseEvent, layer: A4CanvasLayer) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = {
      id: layer.id,
      startX: e.clientX, startY: e.clientY,
      origW: layer.width, origH: layer.height,
      aspect: layer.width / Math.max(1, layer.height),
    };
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selected === id) setSelected(null);
  };

  // ── Export ──────────────────────────────────────────────────────────────
  const outputPath = outFolder && outName ? `${outFolder}/${outName}` : '';

  const handleExport = async () => {
    if (layers.length === 0 || !outputPath) return;
    setBusy(true);
    try {
      const res = await ImageEditorActions.a4Export({
        layers: layers.map(l => ({
          cloudPath: l.cloudPath,
          x: l.x, y: l.y, width: l.width, height: l.height,
        })),
        dpi, background: bg, outputPath,
        canvasWidth: CANVAS_W, canvasHeight: CANVAS_H,
      });
      if (res.ok) onDone(`A4 guardado en ${res.outputPath}`);
      else        onError('El servidor devolvió un error.');
    } catch (e: any) {
      onError(e?.message ?? 'Error al exportar A4.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* ── Left options panel ── */}
      <div className="ie-options" style={{ width: 240 }}>
        <div>
          <div className="ie-section-label">Lienzo A4</div>
          <div style={{ fontSize: 11, color: '#4a7a9b', lineHeight: 1.5 }}>
            {CANVAS_W} × {CANVAS_H} px (vista) → {dpi === 150 ? '1240 × 1754' : '2480 × 3508'} px (export)
          </div>
        </div>

        <div className="ie-field">
          <label>Fondo</label>
          <input className="ie-input" type="color" value={bg}
            onChange={e => setBg(e.target.value)} />
        </div>

        <div className="ie-field">
          <label>Resolución de exportación</label>
          <select className="ie-input" value={dpi}
            onChange={e => setDpi(+e.target.value as 150 | 300)}>
            <option value={150}>150 DPI (1240 × 1754 px)</option>
            <option value={300}>300 DPI (2480 × 3508 px)</option>
          </select>
        </div>

        <button className="ie-btn ie-btn-secondary" onClick={() => setPickerOpen(true)}>
          + Añadir imagen
        </button>

        {/* Layer list */}
        {layers.length > 0 && (
          <div>
            <div className="ie-section-label">Capas ({layers.length})</div>
            <div className="ie-mosaic-list">
              {[...layers].reverse().map(l => (
                <div key={l.id} className={`ie-mosaic-item`}
                  style={{ cursor: 'pointer', outline: selected === l.id ? '1px solid #00ffe7' : 'none' }}
                  onClick={() => setSelected(l.id)}>
                  <span className="name">{l.cloudPath.split('/').pop()}</span>
                  <button onClick={e => { e.stopPropagation(); deleteLayer(l.id); }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output */}
        <div className="ie-output-section" style={{ marginTop: 'auto' }}>
          <div className="ie-section-label">Exportar A4</div>
          <div className="ie-folder-strip" onClick={() => setFolderOpen(true)}>
            <span className={outFolder ? 'set' : ''}>{outFolder || 'Seleccionar carpeta…'}</span>
            <span style={{ fontSize: 10, color: '#4a7a9b', flexShrink: 0 }}>📁</span>
          </div>
          <div className="ie-field">
            <label>Nombre del archivo</label>
            <input className="ie-input" type="text" value={outName}
              placeholder="a4_export.pdf"
              onChange={e => {
                const v = e.target.value;
                setOutName(v.endsWith('.pdf') ? v : v.replace(/\.[^/.]*$/, '') + '.pdf');
              }} />
          </div>
          <button className="ie-btn"
            disabled={layers.length === 0 || !outputPath || busy}
            onClick={handleExport}>
            {busy ? 'Exportando…' : 'Exportar A4'}
          </button>
        </div>
      </div>

      {/* ── A4 canvas area ── */}
      <div className="ie-a4-wrapper">
        <div className="ie-a4-toolbar">
          <span>{layers.length} imagen{layers.length !== 1 ? 'es' : ''} · Arrastra para mover · Esquina inferior-derecha para redimensionar</span>
        </div>

        <div
          className="ie-a4-sheet"
          style={{
            width: CANVAS_W, height: CANVAS_H,
            backgroundColor: bg,
          }}
          onClick={() => setSelected(null)}
        >
          {layers.map(layer => (
            <div
              key={layer.id}
              className={`ie-a4-layer${selected === layer.id ? ' selected' : ''}`}
              style={{ left: layer.x, top: layer.y, width: layer.width, height: layer.height }}
              onMouseDown={e => startDrag(e, layer)}
            >
              <img src={layer.previewUrl} alt={layer.cloudPath.split('/').pop()} draggable={false} />

              {/* Resize handle (bottom-right) */}
              <div
                className="ie-resize-handle"
                onMouseDown={e => startResize(e, layer)}
              />

              {/* Delete button (only when selected) */}
              <button
                className="ie-delete-handle"
                onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }}
                title="Eliminar imagen"
              >
                ✕
              </button>
            </div>
          ))}

          {layers.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              color: '#ccc', fontSize: 13, pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 40, opacity: 0.3 }}>🖼</div>
              <span>Añade imágenes con el panel izquierdo</span>
            </div>
          )}
        </div>
      </div>

      <ModalCloudImagePicker isOpen={pickerOpen} onClose={() => setPickerOpen(false)}
        title="Añadir imagen al lienzo A4" onAccept={handleAddImage} />
      <ModalCloudBrowser isOpen={folderOpen} onClose={() => setFolderOpen(false)}
        title="Carpeta de destino" onAccept={p => setOutFolder(p)} />
    </div>
  );
};
