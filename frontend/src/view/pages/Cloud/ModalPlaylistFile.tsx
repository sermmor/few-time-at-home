// Listas de reproducción guardadas en la Cloud como ficheros .m3u8 (compatibles con VLC).
// - ModalOpenPlaylist: cargar una lista en la cola del reproductor y ver su enlace para VLC.
// - ModalSavePlaylist: guardar la cola como lista (nueva o sobrescribiendo la cargada).
// Las canciones se guardan con rutas relativas a la carpeta de la lista, sin IP, así que
// la lista sigue funcionando aunque cambie la IP de la Raspberry.
import React from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Tooltip, Typography,
} from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useTranslation } from 'react-i18next';
import { CloudActions } from "../../../core/actions/cloud";
import { isPlaylistFileName } from "../../../data-model/cloud";
import { ModalCloudBrowser } from "../../molecules/ModalCloudBrowser/ModalCloudBrowser";

export type OpenPlaylistMode = 'replace' | 'add';

const PLAYLIST_DRIVE = 'cloud';
export const DEFAULT_PLAYLIST_EXTENSION = '.m3u8';

const baseName = (path: string) => path.split('/').filter(Boolean).pop() ?? path;
export const playlistDisplayName = (path: string) => baseName(path).replace(/\.m3u8?$/i, '');
export const parentFolder = (path: string) => path.split('/').slice(0, -1).join('/') || PLAYLIST_DRIVE;
const withExtension = (path: string) => isPlaylistFileName(path) ? path : `${path}${DEFAULT_PLAYLIST_EXTENSION}`;

/** Copia al portapapeles; en http por la LAN no hay `navigator.clipboard`, se usa execCommand. */
const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* se intenta el método antiguo */ }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
};

const VlcLinkField = ({ path }: { path: string }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);
  const url = CloudActions.getRawUrl(path);
  React.useEffect(() => setCopied(false), [path]);
  return <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <TextField
        label={t('cloud.playlistFile.vlcLink')}
        value={url}
        size="small"
        fullWidth
        InputProps={{ readOnly: true }}
        onFocus={evt => evt.target.select()}
      />
      <Tooltip title={copied ? t('cloud.playlistFile.copied') : t('cloud.playlistFile.copy')}>
        <IconButton aria-label={t('cloud.playlistFile.copy')} onClick={() => copyText(url).then(setCopied)}>
          <ContentCopyIcon />
        </IconButton>
      </Tooltip>
    </Box>
    <Typography variant="caption" color="text.secondary">{t('cloud.playlistFile.vlcHelp')}</Typography>
  </Box>;
};

// ── Abrir ─────────────────────────────────────────────────────────────────────
interface OpenProps {
  isOpen: boolean;
  /** Ruta de la lista: "cloud/Listas/Mi lista.m3u8". */
  path: string;
  /** Si la cola tiene canciones, se ofrece sustituirla o añadir al final. */
  hasQueue: boolean;
  onClose: () => void;
  onLoad: (mode: OpenPlaylistMode) => void;
}

export const ModalOpenPlaylist = ({ isOpen, path, hasQueue, onClose, onLoad }: OpenProps): JSX.Element => {
  const { t } = useTranslation();
  return <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>{t('cloud.playlistFile.openTitle', { name: playlistDisplayName(path) })}</DialogTitle>
    <DialogContent>
      <Typography variant="body2" sx={{ marginBottom: '1rem' }}>
        {hasQueue ? t('cloud.playlistFile.openQueueHelp') : t('cloud.playlistFile.openHelp')}
      </Typography>
      <VlcLinkField path={path} />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>{t('cloud.playlistFile.cancel')}</Button>
      {hasQueue && <Button onClick={() => onLoad('add')}>{t('cloud.playlistFile.add')}</Button>}
      <Button variant="contained" onClick={() => onLoad('replace')}>
        {hasQueue ? t('cloud.playlistFile.replace') : t('cloud.playlistFile.play')}
      </Button>
    </DialogActions>
  </Dialog>;
};

// ── Guardar ───────────────────────────────────────────────────────────────────
interface SaveProps {
  isOpen: boolean;
  onClose: () => void;
  /** Carpeta propuesta ("cloud/Listas"). */
  initialFolder: string;
  /** Nombre propuesto, sin extensión. */
  initialName: string;
  /** Lista cargada: guardar encima de ella no pide confirmación. */
  loadedPath?: string;
  songPaths: string[];
  onSaved: (path: string) => void;
}

export const ModalSavePlaylist = ({ isOpen, onClose, initialFolder, initialName, loadedPath, songPaths, onSaved }: SaveProps): JSX.Element => {
  const { t } = useTranslation();
  const [folder, setFolder] = React.useState(initialFolder);
  const [name, setName] = React.useState(initialName);
  const [isBrowsing, setBrowsing] = React.useState(false);
  const [askOverwrite, setAskOverwrite] = React.useState(false);
  const [isSaving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [savedPath, setSavedPath] = React.useState<string | undefined>();
  const [savedCount, setSavedCount] = React.useState(0);

  React.useEffect(() => {
    if (!isOpen) return;
    setFolder(initialFolder);
    setName(initialName);
    setAskOverwrite(false);
    setSaving(false);
    setError('');
    setSavedPath(undefined);
  // Solo al abrir: al guardar cambian las propuestas y no hay que borrar el resultado
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const trimmedName = name.trim();
  const isValidName = trimmedName !== '' && !/[\\/]/.test(trimmedName) && !trimmedName.startsWith('.');
  const targetPath = withExtension(`${folder}/${trimmedName}`);

  const save = () => {
    if (!isValidName) { setError(t('cloud.playlistFile.invalidName')); return; }
    setSaving(true);
    setError('');
    const overwrite = askOverwrite || (loadedPath !== undefined && withExtension(loadedPath) === targetPath);
    CloudActions.savePlaylist({ path: targetPath, songs: songPaths, overwrite }).then(res => {
      setSaving(false);
      if (res.exists) { setAskOverwrite(true); return; }
      if (res.isError || !res.path) { setError(t('cloud.playlistFile.saveError', { message: res.message })); return; }
      setSavedPath(res.path);
      setSavedCount(res.saved ?? songPaths.length);
      onSaved(res.path);
    });
  };

  return <>
    <Dialog open={isOpen && !isBrowsing} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{savedPath ? t('cloud.playlistFile.savedTitle') : t('cloud.playlistFile.saveTitle')}</DialogTitle>
      <DialogContent>
        {savedPath ? <>
          <Typography variant="body2" sx={{ marginBottom: '1rem' }}>
            {t('cloud.playlistFile.saved', { path: savedPath, count: savedCount })}
          </Typography>
          <VlcLinkField path={savedPath} />
        </> : <>
          <Typography variant="body2" sx={{ marginBottom: '1rem' }}>
            {t('cloud.playlistFile.saveHelp', { count: songPaths.length })}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TextField label={t('cloud.playlistFile.folder')} value={folder} size="small" fullWidth InputProps={{ readOnly: true }} />
            <Button startIcon={<FolderOpenIcon />} onClick={() => setBrowsing(true)} disabled={isSaving}>
              {t('cloud.playlistFile.changeFolder')}
            </Button>
          </Box>
          <TextField
            label={t('cloud.playlistFile.name')}
            value={name}
            size="small"
            fullWidth
            autoFocus
            error={trimmedName !== '' && !isValidName}
            helperText={`${t('cloud.playlistFile.fileName')}: ${baseName(targetPath)}`}
            onChange={evt => { setName(evt.target.value); setAskOverwrite(false); setError(''); }}
            onKeyDown={evt => { if (evt.key === 'Enter' && !isSaving) save(); }}
          />
          {askOverwrite && <Alert severity="warning" sx={{ marginTop: '1rem' }}>{t('cloud.playlistFile.exists', { name: baseName(targetPath) })}</Alert>}
          {error && <Alert severity="error" sx={{ marginTop: '1rem' }}>{error}</Alert>}
        </>}
      </DialogContent>
      <DialogActions>
        {savedPath
          ? <Button variant="contained" onClick={onClose}>{t('cloud.playlistFile.close')}</Button>
          : <>
            <Button onClick={onClose}>{t('cloud.playlistFile.cancel')}</Button>
            <Button variant="contained" color={askOverwrite ? 'warning' : 'primary'} disabled={isSaving || !isValidName} onClick={save}
              startIcon={isSaving ? <CircularProgress size="1rem" /> : undefined}>
              {askOverwrite ? t('cloud.playlistFile.overwrite') : t('cloud.playlistFile.save')}
            </Button>
          </>}
      </DialogActions>
    </Dialog>
    <ModalCloudBrowser
      isOpen={isOpen && isBrowsing}
      title={t('cloud.playlistFile.chooseFolder')}
      onClose={() => setBrowsing(false)}
      onAccept={selected => {
        setBrowsing(false);
        // Las listas (y sus canciones) viven en la unidad "cloud"
        if (selected === PLAYLIST_DRIVE || selected.startsWith(`${PLAYLIST_DRIVE}/`)) {
          setFolder(selected);
          setAskOverwrite(false);
          setError('');
        } else {
          setError(t('cloud.playlistFile.wrongDrive'));
        }
      }}
    />
  </>;
};
