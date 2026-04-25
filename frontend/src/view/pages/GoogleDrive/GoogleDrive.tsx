import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Alert,
  TextField,
  Tooltip,
  Typography,
  SxProps,
  Theme,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import HomeIcon from '@mui/icons-material/Home';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { useNavigate } from 'react-router-dom';
import { DriveItem, GoogleDriveActions } from '../../../core/actions/googleDrive';

// ── Cyberpunk palette ────────────────────────────────────────────────────────
const C = {
  bg:        '#050508',
  panel:     '#0d0d1a',
  panelAlt:  '#0a0a14',
  border:    '#1a1a3a',
  cyan:      '#00ffee',
  magenta:   '#ff00cc',
  purple:    '#9b00ff',
  amber:     '#ffbb00',
  textPri:   '#c8d8f0',
  textSec:   '#4a6a8a',
  textMuted: '#2a3a5a',
  scanline:  'rgba(0,255,238,0.018)',
};

const MONO = '"Courier New", "Lucida Console", monospace';

// ── Shared sx helpers ────────────────────────────────────────────────────────
const neonText = (color = C.cyan): SxProps<Theme> => ({
  color,
  textShadow: `0 0 8px ${color}88`,
  fontFamily: MONO,
});

const neonBorder = (color = C.cyan, glow = true): React.CSSProperties => ({
  border: `1px solid ${color}`,
  ...(glow ? { boxShadow: `0 0 10px ${color}33, inset 0 0 6px ${color}11` } : {}),
});

const scanlines: SxProps<Theme> = {
  backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 2px,${C.scanline} 2px,${C.scanline} 4px)`,
  backgroundSize: '100% 4px',
};

// ── Utility ──────────────────────────────────────────────────────────────────
const formatSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return '—';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const getMimeLabel = (item: DriveItem): string => {
  if (item.isFolder) return 'carpeta';
  const mt = item.mimeType;
  if (mt === 'application/zip' || mt === 'application/x-zip-compressed') return 'zip';
  if (mt.startsWith('image/')) return mt.split('/')[1];
  if (mt.startsWith('video/')) return mt.split('/')[1];
  if (mt.startsWith('audio/')) return mt.split('/')[1];
  if (mt === 'application/pdf') return 'pdf';
  if (mt === 'text/plain') return 'txt';
  if (mt.includes('spreadsheet') || mt.includes('excel')) return 'xlsx';
  if (mt.includes('document') || mt.includes('word')) return 'docx';
  const ext = item.name.split('.').pop()?.toLowerCase();
  return ext ?? 'file';
};

// ── Recursive drag & drop helpers ────────────────────────────────────────────
const getFileFromEntry = (entry: FileSystemFileEntry): Promise<File> =>
  new Promise((resolve, reject) => entry.file(resolve, reject));

const readEntriesBatch = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => reader.readEntries(resolve, reject));

const uploadEntryRecursive = async (
  entry:           FileSystemEntry,
  parentFolderId:  string | undefined,
  onProgress:      (msg: string) => void,
): Promise<void> => {
  if (entry.isFile) {
    const file = await getFileFromEntry(entry as FileSystemFileEntry);
    onProgress(`Subiendo ${file.name}…`);
    await GoogleDriveActions.uploadFile(file, parentFolderId);
  } else if (entry.isDirectory) {
    onProgress(`Creando carpeta ${entry.name}…`);
    const result = await GoogleDriveActions.createFolder(entry.name, parentFolderId);
    const newId = result.item?.id;
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    while (true) {
      const batch = await readEntriesBatch(reader);
      if (batch.length === 0) break;
      for (const child of batch) {
        await uploadEntryRecursive(child, newId, onProgress);
      }
    }
  }
};

// ── Component ────────────────────────────────────────────────────────────────
interface FolderCrumb { id: string; name: string; }

export const GoogleDrive: React.FC = () => {
  const navigate = useNavigate();

  const [items,          setItems]          = React.useState<DriveItem[]>([]);
  const [folderStack,    setFolderStack]    = React.useState<FolderCrumb[]>([]);
  const [loading,        setLoading]        = React.useState(true);
  const [notConfigured,  setNotConfigured]  = React.useState(false);
  const [showNoCfgDlg,   setShowNoCfgDlg]  = React.useState(false);
  const [dragOver,       setDragOver]       = React.useState(false);
  const [uploading,      setUploading]      = React.useState(false);
  const [uploadMsg,      setUploadMsg]      = React.useState('');

  // New-folder dialog
  const [showFolderDlg,  setShowFolderDlg]  = React.useState(false);
  const [folderName,     setFolderName]     = React.useState('');
  const [creatingFolder, setCreatingFolder] = React.useState(false);

  // Confirm-delete dialog
  const [deleteTarget,   setDeleteTarget]   = React.useState<DriveItem | null>(null);
  const [deleting,       setDeleting]       = React.useState(false);

  // Snackbar
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string; error: boolean }>({
    open: false, msg: '', error: false,
  });

  const currentFolderId = folderStack.length > 0
    ? folderStack[folderStack.length - 1].id
    : undefined;

  const showSnack = (msg: string, error = false) =>
    setSnack({ open: true, msg, error });

  // ── Load folder ─────────────────────────────────────────────────────────
  const loadFolder = React.useCallback(async (folderId?: string) => {
    setLoading(true);
    try {
      const { items: data } = await GoogleDriveActions.listFolder(folderId);
      setItems(data);
      setNotConfigured(false);
    } catch {
      setNotConfigured(true);
      setShowNoCfgDlg(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadFolder(undefined); }, [loadFolder]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const openFolder = (item: DriveItem) => {
    setFolderStack(s => [...s, { id: item.id, name: item.name }]);
    loadFolder(item.id);
  };

  const goBack = () => {
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    const parentId = newStack.length > 0 ? newStack[newStack.length - 1].id : undefined;
    loadFolder(parentId);
  };

  const jumpToCrumb = (index: number) => {
    if (index === -1) {
      setFolderStack([]);
      loadFolder(undefined);
    } else {
      const newStack = folderStack.slice(0, index + 1);
      setFolderStack(newStack);
      loadFolder(newStack[newStack.length - 1].id);
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const uploadFiles = async (entries: FileSystemEntry[]) => {
    setUploading(true);
    try {
      for (const entry of entries) {
        await uploadEntryRecursive(entry, currentFolderId, setUploadMsg);
      }
      showSnack('Subida completada.');
      loadFolder(currentFolderId);
    } catch (err: any) {
      showSnack(`Error al subir: ${err?.message ?? ''}`, true);
    } finally {
      setUploading(false);
      setUploadMsg('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const entries = Array.from(e.dataTransfer.items)
      .map(i => i.webkitGetAsEntry())
      .filter((en): en is FileSystemEntry => en !== null);
    if (entries.length > 0) uploadFiles(entries);
  };

  const handleUploadButton = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadMsg(`Subiendo ${file.name}…`);
    GoogleDriveActions.uploadFile(file, currentFolderId)
      .then(() => { showSnack(`"${file.name}" subido.`); loadFolder(currentFolderId); })
      .catch(err => showSnack(`Error: ${err?.message ?? ''}`, true))
      .finally(() => { setUploading(false); setUploadMsg(''); });
  };

  // ── Create folder ─────────────────────────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    setCreatingFolder(true);
    try {
      await GoogleDriveActions.createFolder(folderName.trim(), currentFolderId);
      showSnack(`Carpeta "${folderName.trim()}" creada.`);
      setShowFolderDlg(false);
      setFolderName('');
      loadFolder(currentFolderId);
    } catch (err: any) {
      showSnack(`Error al crear carpeta: ${err?.message ?? ''}`, true);
    } finally {
      setCreatingFolder(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await GoogleDriveActions.deleteItem(deleteTarget.id);
      showSnack(`"${deleteTarget.name}" eliminado.`);
      setDeleteTarget(null);
      setItems(prev => prev.filter(it => it.id !== deleteTarget.id));
    } catch (err: any) {
      showSnack(`Error al eliminar: ${err?.message ?? ''}`, true);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: C.bg,
        ...scanlines,
        display: 'flex',
        flexDirection: 'column',
        padding: { xs: '1rem', sm: '1.5rem 2rem' },
        fontFamily: MONO,
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Box sx={{ mb: '1.5rem' }}>
        <Typography
          variant="h5"
          sx={{
            ...neonText(C.cyan),
            fontWeight: 700,
            letterSpacing: '0.15em',
            fontSize: { xs: '1.1rem', sm: '1.35rem' },
          }}
        >
          // GOOGLE DRIVE //
        </Typography>
        <Box sx={{ height: '1px', background: `linear-gradient(90deg, ${C.cyan}, transparent)`, mt: '0.5rem' }} />
      </Box>

      {/* ── Not configured dialog ─────────────────────────────────────────── */}
      <Dialog
        open={showNoCfgDlg}
        onClose={() => setShowNoCfgDlg(false)}
        PaperProps={{
          sx: {
            background: C.panel,
            ...neonBorder(C.magenta),
            borderRadius: '6px',
            minWidth: { xs: '18rem', sm: '26rem' },
          },
        }}
      >
        <DialogTitle sx={{ ...neonText(C.magenta), fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.95rem', pb: 1 }}>
          // GOOGLE DRIVE SIN CONFIGURAR //
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: C.textPri, fontFamily: MONO, fontSize: '0.85rem', lineHeight: 1.7 }}>
            Las credenciales OAuth de Google Drive no están completas o son inválidas.
          </Typography>
          <Box sx={{ mt: '1rem', padding: '0.65rem 0.9rem', borderRadius: '4px', background: 'rgba(255,0,204,0.07)', border: `1px solid ${C.magenta}55` }}>
            <Typography sx={{ color: C.magenta, fontFamily: MONO, fontSize: '0.78rem', lineHeight: 1.7 }}>
              Ve a <strong>Configuración → APIs → Google Drive — Backups</strong>{' '}
              y rellena los campos <strong>Client ID</strong>,{' '}
              <strong>Client secret</strong> y <strong>Refresh token</strong>.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '0.75rem 1.5rem 1rem', gap: '0.5rem' }}>
          <Button
            size="small"
            onClick={() => setShowNoCfgDlg(false)}
            sx={{ color: C.textSec, fontFamily: MONO, fontSize: '0.78rem', letterSpacing: '0.08em' }}
          >
            CERRAR
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => { setShowNoCfgDlg(false); navigate('/configuration'); }}
            sx={{
              borderColor: C.magenta,
              color: C.magenta,
              fontFamily: MONO,
              fontSize: '0.78rem',
              letterSpacing: '0.08em',
              '&:hover': { borderColor: C.magenta, background: `${C.magenta}18` },
            }}
          >
            IR A CONFIGURACIÓN
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Breadcrumb + Back ─────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        mb: '1rem',
        flexWrap: 'wrap',
        padding: '0.5rem 0.75rem',
        borderRadius: '4px',
        background: C.panelAlt,
        ...neonBorder(C.border, false),
      }}>
        {folderStack.length > 0 && (
          <Tooltip title="Atrás">
            <IconButton
              size="small"
              onClick={goBack}
              sx={{ color: C.cyan, '&:hover': { color: C.cyan, background: `${C.cyan}18` } }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Root crumb */}
        <Box
          onClick={() => jumpToCrumb(-1)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            cursor: folderStack.length > 0 ? 'pointer' : 'default',
            color: folderStack.length > 0 ? C.textSec : C.cyan,
            '&:hover': folderStack.length > 0 ? { color: C.cyan } : {},
            fontFamily: MONO,
            fontSize: '0.82rem',
            letterSpacing: '0.05em',
          }}
        >
          <HomeIcon sx={{ fontSize: '0.95rem' }} />
          <span>root</span>
        </Box>

        {folderStack.map((crumb, i) => (
          <React.Fragment key={crumb.id}>
            <ChevronRightIcon sx={{ fontSize: '0.9rem', color: C.textMuted }} />
            <Box
              onClick={() => jumpToCrumb(i)}
              sx={{
                cursor: i < folderStack.length - 1 ? 'pointer' : 'default',
                color: i < folderStack.length - 1 ? C.textSec : C.cyan,
                '&:hover': i < folderStack.length - 1 ? { color: C.cyan } : {},
                fontFamily: MONO,
                fontSize: '0.82rem',
                letterSpacing: '0.04em',
                maxWidth: { xs: '8rem', sm: '16rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {crumb.name}
            </Box>
          </React.Fragment>
        ))}
      </Box>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: '0.75rem', mb: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<CreateNewFolderIcon />}
          onClick={() => { setFolderName(''); setShowFolderDlg(true); }}
          sx={toolbarBtnSx(C.cyan)}
        >
          Nueva carpeta
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<CloudUploadIcon />}
          onClick={() => inputRef.current?.click()}
          sx={toolbarBtnSx(C.cyan)}
        >
          Subir archivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={handleUploadButton}
        />

        <IconButton
          size="small"
          onClick={() => loadFolder(currentFolderId)}
          sx={{ color: C.textSec, '&:hover': { color: C.cyan, background: `${C.cyan}18` } }}
        >
          <Tooltip title="Actualizar">
            <RefreshIcon fontSize="small" />
          </Tooltip>
        </IconButton>
      </Box>

      {/* ── Drop zone + file list ─────────────────────────────────────────── */}
      <Box
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        sx={{
          flex: 1,
          borderRadius: '6px',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          ...(dragOver
            ? { border: `2px dashed ${C.cyan}`, boxShadow: `0 0 24px ${C.cyan}55`, background: `${C.cyan}08` }
            : { border: `1px solid ${C.border}`, background: C.panel }
          ),
        }}
      >
        {/* Drop hint */}
        {dragOver && (
          <Box sx={{
            textAlign: 'center',
            padding: '1.5rem',
            ...neonText(C.cyan),
            fontSize: '0.85rem',
            letterSpacing: '0.12em',
            pointerEvents: 'none',
          }}>
            ↓ SOLTAR AQUÍ ↓
          </Box>
        )}

        {/* Upload progress */}
        {uploading && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <CircularProgress size={16} sx={{ color: C.cyan }} />
            <Typography sx={{ ...neonText(C.cyan), fontSize: '0.8rem' }}>
              {uploadMsg || 'Subiendo…'}
            </Typography>
          </Box>
        )}

        {/* Loading */}
        {loading && !uploading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <CircularProgress size={28} sx={{ color: C.cyan }} />
          </Box>
        )}

        {/* Empty folder */}
        {!loading && !uploading && items.length === 0 && !notConfigured && (
          <Box sx={{ textAlign: 'center', padding: '3rem' }}>
            <Typography sx={{ color: C.textMuted, fontFamily: MONO, fontSize: '0.82rem', letterSpacing: '0.08em' }}>
              — CARPETA VACÍA —
            </Typography>
            <Typography sx={{ color: C.textMuted, fontFamily: MONO, fontSize: '0.75rem', mt: '0.5rem' }}>
              arrastra ficheros o carpetas aquí para subirlos
            </Typography>
          </Box>
        )}

        {/* Item list */}
        {!loading && items.length > 0 && (
          <>
            {/* Table header */}
            <Box sx={tableHeaderSx}>
              <Box sx={{ flex: '0 0 2rem' }} />
              <Typography sx={{ ...colHeaderSx, flex: 4 }}>nombre</Typography>
              <Typography sx={{ ...colHeaderSx, flex: 1.5, display: { xs: 'none', sm: 'block' } }}>tipo</Typography>
              <Typography sx={{ ...colHeaderSx, flex: 1.2, display: { xs: 'none', md: 'block' } }}>tamaño</Typography>
              <Typography sx={{ ...colHeaderSx, flex: 1.5, display: { xs: 'none', md: 'block' } }}>modificado</Typography>
              <Box sx={{ flex: '0 0 5rem' }} />
            </Box>

            {/* Rows */}
            {items.map((item, i) => (
              <DriveRow
                key={item.id}
                item={item}
                odd={i % 2 === 1}
                onOpen={() => item.isFolder && openFolder(item)}
                onDownload={() => GoogleDriveActions.downloadFile(item.id)}
                onDelete={() => setDeleteTarget(item)}
              />
            ))}
          </>
        )}
      </Box>

      {/* ── New folder dialog ─────────────────────────────────────────────── */}
      <CyberpunkDialog
        open={showFolderDlg}
        title="// NUEVA CARPETA //"
        onClose={() => setShowFolderDlg(false)}
        onConfirm={handleCreateFolder}
        confirmLabel="CREAR"
        confirming={creatingFolder}
      >
        <TextField
          autoFocus
          variant="standard"
          label="Nombre"
          value={folderName}
          onChange={e => setFolderName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
          fullWidth
          InputLabelProps={{ sx: { color: C.textSec, fontFamily: MONO, fontSize: '0.82rem' } }}
          InputProps={{ sx: { color: C.textPri, fontFamily: MONO, fontSize: '0.85rem', '&:before': { borderBottomColor: C.border }, '&:after': { borderBottomColor: C.cyan } } }}
        />
      </CyberpunkDialog>

      {/* ── Delete confirm dialog ─────────────────────────────────────────── */}
      <CyberpunkDialog
        open={!!deleteTarget}
        title="// CONFIRMAR BORRADO //"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="ELIMINAR"
        confirmColor={C.magenta}
        confirming={deleting}
      >
        <Typography sx={{ color: C.textPri, fontFamily: MONO, fontSize: '0.85rem' }}>
          ¿Eliminar permanentemente{' '}
          <strong style={{ color: C.cyan }}>{deleteTarget?.name}</strong>?
          {deleteTarget?.isFolder && (
            <span style={{ color: C.magenta }}> Esta acción borra la carpeta y todo su contenido.</span>
          )}
        </Typography>
      </CyberpunkDialog>

      {/* ── Snackbar ──────────────────────────────────────────────────────── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.error ? 'error' : 'success'}
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          sx={{
            background: snack.error ? `rgba(255,0,204,0.12)` : `rgba(0,255,238,0.10)`,
            color: snack.error ? C.magenta : C.cyan,
            border: `1px solid ${snack.error ? C.magenta : C.cyan}`,
            fontFamily: MONO,
            fontSize: '0.82rem',
            '& .MuiAlert-icon': { color: snack.error ? C.magenta : C.cyan },
          }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface DriveRowProps {
  item:       DriveItem;
  odd:        boolean;
  onOpen:     () => void;
  onDownload: () => void;
  onDelete:   () => void;
}

const DriveRow: React.FC<DriveRowProps> = ({ item, odd, onOpen, onDownload, onDelete }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.45rem 0.75rem',
        background: hovered
          ? `rgba(0,255,238,0.06)`
          : odd ? `rgba(255,255,255,0.015)` : 'transparent',
        borderBottom: `1px solid ${C.border}`,
        transition: 'background 0.12s',
        cursor: item.isFolder ? 'pointer' : 'default',
      }}
      onClick={item.isFolder ? onOpen : undefined}
    >
      {/* Icon */}
      <Box sx={{ flex: '0 0 2rem', display: 'flex', alignItems: 'center' }}>
        {item.isFolder
          ? <FolderIcon sx={{ color: C.cyan, fontSize: '1.2rem', filter: `drop-shadow(0 0 4px ${C.cyan}88)` }} />
          : <InsertDriveFileIcon sx={{ color: C.textSec, fontSize: '1.1rem' }} />
        }
      </Box>

      {/* Name */}
      <Box sx={{ flex: 4, overflow: 'hidden' }}>
        <Typography
          title={item.name}
          sx={{
            fontFamily: MONO,
            fontSize: '0.83rem',
            color: item.isFolder ? C.cyan : C.textPri,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '0.03em',
            '&:hover': item.isFolder ? { textShadow: `0 0 8px ${C.cyan}` } : {},
          }}
        >
          {item.name}
        </Typography>
      </Box>

      {/* Type */}
      <Box sx={{ flex: 1.5, display: { xs: 'none', sm: 'block' } }}>
        <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', color: C.textSec, letterSpacing: '0.04em' }}>
          {getMimeLabel(item)}
        </Typography>
      </Box>

      {/* Size */}
      <Box sx={{ flex: 1.2, display: { xs: 'none', md: 'block' } }}>
        <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', color: C.textSec }}>
          {item.isFolder ? '—' : formatSize(item.size)}
        </Typography>
      </Box>

      {/* Date */}
      <Box sx={{ flex: 1.5, display: { xs: 'none', md: 'block' } }}>
        <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', color: C.textSec }}>
          {formatDate(item.modifiedTime)}
        </Typography>
      </Box>

      {/* Actions */}
      <Box
        sx={{ flex: '0 0 5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.15rem' }}
        onClick={e => e.stopPropagation()}
      >
        {!item.isFolder && (
          <Tooltip title="Descargar">
            <IconButton
              size="small"
              onClick={onDownload}
              sx={{ color: C.textSec, '&:hover': { color: C.cyan, background: `${C.cyan}18` } }}
            >
              <DownloadIcon sx={{ fontSize: '0.95rem' }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Eliminar">
          <IconButton
            size="small"
            onClick={onDelete}
            sx={{ color: C.textSec, '&:hover': { color: C.magenta, background: `${C.magenta}18` } }}
          >
            <DeleteIcon sx={{ fontSize: '0.95rem' }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

// ── CyberpunkDialog ───────────────────────────────────────────────────────────
interface CyberpunkDialogProps {
  open:          boolean;
  title:         string;
  onClose:       () => void;
  onConfirm:     () => void;
  confirmLabel:  string;
  confirmColor?: string;
  confirming?:   boolean;
  children:      React.ReactNode;
}

const CyberpunkDialog: React.FC<CyberpunkDialogProps> = ({
  open, title, onClose, onConfirm, confirmLabel, confirmColor = C.cyan, confirming, children,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        background: C.panel,
        ...neonBorder(confirmColor),
        borderRadius: '6px',
        minWidth: { xs: '18rem', sm: '22rem' },
      },
    }}
  >
    <DialogTitle sx={{ ...neonText(confirmColor), fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.95rem', pb: 1 }}>
      {title}
    </DialogTitle>
    <DialogContent>{children}</DialogContent>
    <DialogActions sx={{ padding: '0.75rem 1.5rem 1rem' }}>
      <Button
        size="small"
        onClick={onClose}
        sx={{ color: C.textSec, fontFamily: MONO, fontSize: '0.78rem', letterSpacing: '0.08em' }}
      >
        CANCELAR
      </Button>
      <Button
        size="small"
        variant="outlined"
        disabled={confirming}
        onClick={onConfirm}
        startIcon={confirming ? <CircularProgress size={12} sx={{ color: confirmColor }} /> : null}
        sx={{
          borderColor: confirmColor,
          color: confirmColor,
          fontFamily: MONO,
          fontSize: '0.78rem',
          letterSpacing: '0.08em',
          '&:hover': { borderColor: confirmColor, background: `${confirmColor}18` },
          '&.Mui-disabled': { borderColor: `${confirmColor}44`, color: `${confirmColor}44` },
        }}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

// ── Style helpers ─────────────────────────────────────────────────────────────
const toolbarBtnSx = (color: string): SxProps<Theme> => ({
  borderColor: color,
  color,
  fontFamily: MONO,
  fontSize: '0.75rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  '&:hover': { borderColor: color, background: `${color}18` },
});

const tableHeaderSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.35rem 0.75rem',
  background: 'rgba(0,255,238,0.05)',
  borderBottom: `1px solid ${C.border}`,
};

const colHeaderSx: SxProps<Theme> = {
  fontFamily: MONO,
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: C.textMuted,
};
