import React from 'react';
import './ImageEditor.css';
import { ImageTool } from './types';
import { ResizeTool    } from './tools/ResizeTool';
import { CanvasTool    } from './tools/CanvasTool';
import { MosaicTool    } from './tools/MosaicTool';
import { GrayscaleTool } from './tools/GrayscaleTool';
import { A4CanvasTool  } from './tools/A4CanvasTool';
import { FilterTool    } from './tools/FilterTool';

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS: { id: ImageTool; label: string; icon: string; title: string }[] = [
  { id: 'resize',    label: 'Redimensionar', icon: '⤢',  title: 'Cambiar el tamaño de la imagen con interpolación Lanczos3' },
  { id: 'canvas',    label: 'Lienzo',        icon: '▭',  title: 'Ampliar o reducir el lienzo de la imagen' },
  { id: 'mosaic',    label: 'Mosaico',       icon: '⊞',  title: 'Combinar varias imágenes en una cuadrícula de mosaico' },
  { id: 'grayscale', label: 'Grises',        icon: '◑',  title: 'Convertir la imagen a escala de grises' },
  { id: 'filter',    label: 'Filtros',       icon: '🎨', title: 'Aplicar filtros de estilo Instagram a la imagen' },
  { id: 'a4',        label: 'A4',            icon: '📄', title: 'Lienzo A4 con imágenes arrastrables y exportación a alta resolución' },
];

// ── Snackbar ───────────────────────────────────────────────────────────────────
interface SnackState { msg: string; kind: 'ok' | 'error' }

export const ImageEditor: React.FC = () => {
  const [tool,       setTool      ] = React.useState<ImageTool>('resize');
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [snack,      setSnack     ] = React.useState<SnackState | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear preview when switching tabs.
  const handleSetTool = (t: ImageTool) => { setTool(t); setPreviewUrl(''); };

  const showSnack = (msg: string, kind: 'ok' | 'error' = 'ok') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSnack({ msg, kind });
    timerRef.current = setTimeout(() => setSnack(null), 4000);
  };

  // Tools that manage their own full layout (options + central area).
  const isFullLayout = tool === 'a4' || tool === 'mosaic' || tool === 'filter';

  const snackCallbacks = {
    onDone:  (msg: string) => showSnack(msg, 'ok'),
    onError: (msg: string) => showSnack(msg, 'error'),
  };

  const commonProps = {
    ...snackCallbacks,
    onPreviewChange: setPreviewUrl,
  };

  return (
    <div className="ie-root">

      {/* ── Tab toolbar ── */}
      <div className="ie-toolbar">
        <span className="ie-title">IMAGE EDITOR</span>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`ie-tab${tool === t.id ? ' active' : ''}`}
            title={t.title}
            onClick={() => handleSetTool(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      {isFullLayout ? (
        <>
          {tool === 'a4'     && <A4CanvasTool  {...snackCallbacks} />}
          {tool === 'mosaic' && <MosaicTool    {...snackCallbacks} />}
          {tool === 'filter' && <FilterTool    {...snackCallbacks} />}
        </>
      ) : (
        <div className="ie-body">
          {/* Left options panel */}
          <div className="ie-options">
            {tool === 'resize'    && <ResizeTool    {...commonProps} />}
            {tool === 'canvas'    && <CanvasTool    {...commonProps} />}
            {tool === 'grayscale' && <GrayscaleTool {...commonProps} />}
          </div>

          {/* Right preview panel */}
          <div className="ie-preview">
            {previewUrl ? (
              <img
                key={previewUrl}
                src={previewUrl}
                alt="preview"
                className="ie-preview-img"
                style={tool === 'grayscale' ? { filter: 'grayscale(1)' } : undefined}
              />
            ) : (
              <div className="ie-preview-empty">
                <div style={{ fontSize: 64, opacity: 0.15 }}>🖼</div>
                <span>Selecciona una imagen fuente</span>
                <span style={{ fontSize: 11 }}>La vista previa aparecerá aquí</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Snackbar ── */}
      {snack && (
        <div className={`ie-snack${snack.kind === 'error' ? ' error' : ''}`}>
          {snack.kind === 'ok' ? '✓ ' : '✗ '}{snack.msg}
        </div>
      )}
    </div>
  );
};
