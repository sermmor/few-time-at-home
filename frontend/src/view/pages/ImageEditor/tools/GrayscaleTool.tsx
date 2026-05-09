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

export const GrayscaleTool: React.FC<Props> = ({ onDone, onError, onPreviewChange }) => {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [folderOpen, setFolderOpen] = React.useState(false);
  const [sourcePath, setSourcePath] = React.useState('');
  const [meta,       setMeta      ] = React.useState({ width: 0, height: 0, format: '' });
  const [outFolder,  setOutFolder ] = React.useState('');
  const [outName,    setOutName   ] = React.useState('');
  const [busy,       setBusy      ] = React.useState(false);

  const handleSourcePicked = async (path: string) => {
    setSourcePath(path);
    onPreviewChange(cloudImageStreamUrl(path));
    const m = await ImageEditorActions.getMetadata(path);
    setMeta(m);
    setOutName(suggestOutputName(path, 'gray'));
  };

  const outputPath = outFolder && outName ? `${outFolder}/${outName}` : '';

  const handleRun = async () => {
    if (!sourcePath || !outputPath) return;
    setBusy(true);
    try {
      const res = await ImageEditorActions.grayscale({ inputPath: sourcePath, outputPath });
      if (res.ok) onDone(`Guardado en ${res.outputPath}`);
      else        onError('El servidor devolvió un error.');
    } catch (e: any) {
      onError(e?.message ?? 'Error al convertir a escala de grises.');
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
            {meta.width} × {meta.height} px · {meta.format.toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: '#4a7a9b', lineHeight: 1.5 }}>
        Convierte la imagen a escala de grises conservando el formato original.
        El resultado nunca sobreescribe el archivo fuente.
      </div>

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
            placeholder="photo_gray.jpg"
            onChange={e => setOutName(e.target.value)} />
        </div>
        <button className="ie-btn" disabled={!sourcePath || !outputPath || busy} onClick={handleRun}>
          {busy ? 'Procesando…' : 'Convertir a grises'}
        </button>
      </div>

      <ModalCloudImagePicker isOpen={pickerOpen} onClose={() => setPickerOpen(false)}
        title="Seleccionar imagen fuente" onAccept={handleSourcePicked} />
      <ModalCloudBrowser isOpen={folderOpen} onClose={() => setFolderOpen(false)}
        title="Carpeta de destino" onAccept={p => setOutFolder(p)} />

    </>
  );
};
