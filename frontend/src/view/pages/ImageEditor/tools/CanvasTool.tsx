import React from 'react';
import { ModalCloudImagePicker } from '../../../molecules/ModalCloudImagePicker/ModalCloudImagePicker';
import { ModalCloudBrowser }     from '../../../molecules/ModalCloudBrowser/ModalCloudBrowser';
import { ImageEditorActions }    from '../../../../core/actions/imageEditor';
import { cloudImageStreamUrl }   from '../../../../core/urls-and-end-points';
import { suggestOutputName }     from '../types';

interface Props {
  onDone:          (msg: string) => void;
  onError:         (msg: string) => void;
  onPreviewChange: (url: string) => void;
}

// ── Inline live preview ───────────────────────────────────────────────────────
const PREV_MAX_W = 230;
const PREV_MAX_H = 150;

const CanvasPreview: React.FC<{
  srcUrl: string;
  origW: number; origH: number;
  top: number; right: number; bottom: number; left: number;
  bg: string;
}> = ({ srcUrl, origW, origH, top, right, bottom, left, bg }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !origW) return;

    const newW = Math.max(1, origW + left + right);
    const newH = Math.max(1, origH + top  + bottom);
    const scale = Math.min(PREV_MAX_W / newW, PREV_MAX_H / newH, 1);

    cvs.width  = Math.round(newW * scale);
    cvs.height = Math.round(newH * scale);

    const ctx = cvs.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Source region to draw (handles negative = crop)
      const srcX = Math.max(0, -left);
      const srcY = Math.max(0, -top);
      const srcW = Math.max(1, origW - Math.max(0, -left) - Math.max(0, -right));
      const srcH = Math.max(1, origH - Math.max(0, -top)  - Math.max(0, -bottom));
      // Destination position in the new canvas
      const dstX = Math.max(0, left)  * scale;
      const dstY = Math.max(0, top)   * scale;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, dstX, dstY, srcW * scale, srcH * scale);
    };
    img.src = srcUrl;
  }, [srcUrl, origW, origH, top, right, bottom, left, bg]);

  return (
    <div style={{ marginTop: 8 }}>
      <div className="ie-section-label">Previsualización</div>
      <div style={{
        background: '#040d18', border: '1px solid #1a3a5c', borderRadius: 4,
        padding: 8, display: 'flex', justifyContent: 'center',
      }}>
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', maxWidth: '100%' }} />
      </div>
    </div>
  );
};

// ── Tool ──────────────────────────────────────────────────────────────────────
export const CanvasTool: React.FC<Props> = ({ onDone, onError, onPreviewChange }) => {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [folderOpen, setFolderOpen] = React.useState(false);
  const [sourcePath, setSourcePath] = React.useState('');
  const [meta,       setMeta      ] = React.useState({ width: 0, height: 0, format: '' });
  const [outFolder,  setOutFolder ] = React.useState('');
  const [outName,    setOutName   ] = React.useState('');
  const [top,        setTop       ] = React.useState(0);
  const [right,      setRight     ] = React.useState(0);
  const [bottom,     setBottom    ] = React.useState(0);
  const [left,       setLeft      ] = React.useState(0);
  const [symmetric,  setSymmetric ] = React.useState(false);
  const [bg,         setBg        ] = React.useState('#ffffff');
  const [busy,       setBusy      ] = React.useState(false);

  const handleSourcePicked = async (path: string) => {
    setSourcePath(path);
    onPreviewChange(cloudImageStreamUrl(path));
    const m = await ImageEditorActions.getMetadata(path);
    setMeta(m);
    setOutName(suggestOutputName(path, 'canvas'));
  };

  const handleSymmetricChange = (val: number) => {
    setTop(val); setRight(val); setBottom(val); setLeft(val);
  };

  const outputPath = outFolder && outName ? `${outFolder}/${outName}` : '';
  const newW = Math.max(1, (meta.width  || 0) + left + right);
  const newH = Math.max(1, (meta.height || 0) + top  + bottom);
  const hasCrop = top < 0 || right < 0 || bottom < 0 || left < 0;

  const handleRun = async () => {
    if (!sourcePath || !outputPath) return;
    setBusy(true);
    try {
      const res = await ImageEditorActions.canvas({
        inputPath: sourcePath, top, right, bottom, left, background: bg, outputPath,
      });
      if (res.ok) onDone(`Guardado en ${res.outputPath}`);
      else        onError('El servidor devolvió un error.');
    } catch (e: any) {
      onError(e?.message ?? 'Error al modificar lienzo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
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
            {meta.width} × {meta.height} px
          </div>
        )}
      </div>

      {/* Padding / crop */}
      <div>
        <div className="ie-section-label">Lienzo (px) · negativo = recortar</div>
        <label className="ie-checkbox-row" style={{ marginBottom: 8 }}>
          <input type="checkbox" checked={symmetric}
            onChange={e => setSymmetric(e.target.checked)} />
          Simétrico (mismo valor en todos los lados)
        </label>
        {symmetric ? (
          <div className="ie-field">
            <label>Todos los lados</label>
            <input className="ie-input" type="number" value={top}
              onChange={e => handleSymmetricChange(+e.target.value)} />
          </div>
        ) : (
          <>
            <div className="ie-input-row">
              <div className="ie-field" style={{ flex: 1 }}>
                <label>Arriba</label>
                <input className="ie-input" type="number" value={top}
                  onChange={e => setTop(+e.target.value)} />
              </div>
              <div className="ie-field" style={{ flex: 1 }}>
                <label>Abajo</label>
                <input className="ie-input" type="number" value={bottom}
                  onChange={e => setBottom(+e.target.value)} />
              </div>
            </div>
            <div className="ie-input-row" style={{ marginTop: 6 }}>
              <div className="ie-field" style={{ flex: 1 }}>
                <label>Izquierda</label>
                <input className="ie-input" type="number" value={left}
                  onChange={e => setLeft(+e.target.value)} />
              </div>
              <div className="ie-field" style={{ flex: 1 }}>
                <label>Derecha</label>
                <input className="ie-input" type="number" value={right}
                  onChange={e => setRight(+e.target.value)} />
              </div>
            </div>
          </>
        )}
        <div className="ie-field" style={{ marginTop: 8 }}>
          <label>Color de relleno</label>
          <input className="ie-input" type="color" value={bg}
            onChange={e => setBg(e.target.value)} />
        </div>
        {meta.width > 0 && (
          <div className="ie-meta" style={{ marginTop: 6 }}>
            Resultado: {newW} × {newH} px
            {hasCrop && <span style={{ color: '#ffaa44', marginLeft: 6 }}>· con recorte</span>}
          </div>
        )}
      </div>

      {/* Live preview */}
      {meta.width > 0 && sourcePath && (
        <CanvasPreview
          srcUrl={cloudImageStreamUrl(sourcePath)}
          origW={meta.width} origH={meta.height}
          top={top} right={right} bottom={bottom} left={left}
          bg={bg}
        />
      )}

      {/* Output */}
      <div className="ie-output-section">
        <div className="ie-section-label">Guardar como</div>
        <div className="ie-folder-strip" onClick={() => setFolderOpen(true)}>
          <span className={outFolder ? 'set' : ''}>{outFolder || 'Seleccionar carpeta…'}</span>
          <span style={{ fontSize: 10, color: '#4a7a9b', flexShrink: 0 }}>📁</span>
        </div>
        <div className="ie-field">
          <label>Nombre del archivo</label>
          <input className="ie-input" type="text" value={outName}
            placeholder="photo_canvas.jpg"
            onChange={e => setOutName(e.target.value)} />
        </div>
        <button className="ie-btn" disabled={!sourcePath || !outputPath || busy} onClick={handleRun}>
          {busy ? 'Procesando…' : hasCrop ? 'Recortar / ampliar' : 'Ampliar lienzo'}
        </button>
      </div>

      <ModalCloudImagePicker isOpen={pickerOpen} onClose={() => setPickerOpen(false)}
        title="Seleccionar imagen fuente" onAccept={handleSourcePicked} />
      <ModalCloudBrowser isOpen={folderOpen} onClose={() => setFolderOpen(false)}
        title="Carpeta de destino" onAccept={p => setOutFolder(p)} />
    </>
  );
};
