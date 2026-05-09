import React from 'react';
import { ModalCloudImagePicker } from '../../../molecules/ModalCloudImagePicker/ModalCloudImagePicker';
import { ModalCloudBrowser }     from '../../../molecules/ModalCloudBrowser/ModalCloudBrowser';
import { ImageEditorActions }    from '../../../../core/actions/imageEditor';
import { cloudImageStreamUrl } from '../../../../core/urls-and-end-points';
import { suggestOutputName }   from '../types';

interface Props {
  onDone:            (msg: string) => void;
  onError:           (msg: string) => void;
  onPreviewChange:   (url: string) => void;
}

export const ResizeTool: React.FC<Props> = ({ onDone, onError, onPreviewChange }) => {
  const [pickerOpen,  setPickerOpen ] = React.useState(false);
  const [folderOpen,  setFolderOpen ] = React.useState(false);
  const [sourcePath,  setSourcePath ] = React.useState('');
  const [meta,        setMeta       ] = React.useState({ width: 0, height: 0, format: '' });
  const [outFolder,   setOutFolder  ] = React.useState('');
  const [outName,     setOutName    ] = React.useState('');
  const [width,       setWidth      ] = React.useState(0);
  const [height,      setHeight     ] = React.useState(0);
  const [proportional, setPropor    ] = React.useState(true);
  const [busy,        setBusy       ] = React.useState(false);

  const aspectRef = React.useRef(1);

  const handleSourcePicked = async (path: string) => {
    setSourcePath(path);
    onPreviewChange(cloudImageStreamUrl(path));
    const m = await ImageEditorActions.getMetadata(path);
    setMeta(m);
    setWidth(m.width);
    setHeight(m.height);
    aspectRef.current = m.height > 0 ? m.width / m.height : 1;
    setOutName(suggestOutputName(path, 'resized'));
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (proportional && val > 0) setHeight(Math.round(val / aspectRef.current));
  };
  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (proportional && val > 0) setWidth(Math.round(val * aspectRef.current));
  };

  const outputPath = outFolder && outName ? `${outFolder}/${outName}` : '';

  const handleRun = async () => {
    if (!sourcePath || !outputPath || width <= 0 || height <= 0) return;
    setBusy(true);
    try {
      const res = await ImageEditorActions.resize({
        inputPath: sourcePath, width, height, proportional, outputPath,
      });
      if (res.ok) onDone(`Guardado en ${res.outputPath}`);
      else        onError('El servidor devolvió un error.');
    } catch (e: any) {
      onError(e?.message ?? 'Error al redimensionar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Source image */}
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

      {/* Dimensions */}
      <div>
        <div className="ie-section-label">Nuevo tamaño</div>
        <div className="ie-input-row">
          <div className="ie-field" style={{ flex: 1 }}>
            <label>Ancho (px)</label>
            <input className="ie-input" type="number" min={1} value={width || ''}
              onChange={e => handleWidthChange(+e.target.value)} />
          </div>
          <div className="ie-field" style={{ flex: 1 }}>
            <label>Alto (px)</label>
            <input className="ie-input" type="number" min={1} value={height || ''}
              onChange={e => handleHeightChange(+e.target.value)} />
          </div>
        </div>
        <label className="ie-checkbox-row" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={proportional}
            onChange={e => setPropor(e.target.checked)} />
          Proporcional (Lanczos3)
        </label>
      </div>

      {/* Output */}
      <div className="ie-output-section">
        <div className="ie-section-label">Guardar como</div>
        <div className="ie-folder-strip" onClick={() => setFolderOpen(true)}>
          <span className={outFolder ? 'set' : ''}>
            {outFolder || 'Seleccionar carpeta…'}
          </span>
          <span style={{ fontSize: 10, color: '#4a7a9b', flexShrink: 0 }}>📁</span>
        </div>
        <div className="ie-field">
          <label>Nombre del archivo</label>
          <input className="ie-input" type="text" value={outName}
            placeholder="photo_resized.jpg"
            onChange={e => setOutName(e.target.value)} />
        </div>
        <button className="ie-btn" disabled={!sourcePath || !outputPath || busy} onClick={handleRun}>
          {busy ? 'Procesando…' : 'Redimensionar'}
        </button>
      </div>

      <ModalCloudImagePicker isOpen={pickerOpen} onClose={() => setPickerOpen(false)}
        title="Seleccionar imagen fuente" onAccept={handleSourcePicked} />
      <ModalCloudBrowser isOpen={folderOpen} onClose={() => setFolderOpen(false)}
        title="Carpeta de destino" onAccept={p => setOutFolder(p)} />

      {/* Preview */}
    </>
  );
};
