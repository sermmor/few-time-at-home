import React, { useState, useEffect } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, List, ListItemButton, ListItemIcon, ListItemText, TextField, Typography,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { CloudActions } from '../../../../core/actions/cloud';
import { CloudItem, getPathFolderContainer } from '../../../../data-model/cloud';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the full filePath (e.g. "cloud/blog/mypost.html") */
  onSave: (filePath: string) => void;
  /** Pre-fill filename when re-saving with a new name */
  initialFilename?: string;
}

const ROOT_PATH = '';

export const ModalSaveToCloud: React.FC<Props> = ({ isOpen, onClose, onSave, initialFilename = '' }) => {
  const [drives, setDrives] = useState<string[]>([]);
  const [currentDrive, setCurrentDrive] = useState<string>(ROOT_PATH);
  const [currentPath, setCurrentPath] = useState<string>(ROOT_PATH);
  const [folders, setFolders] = useState<CloudItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filename, setFilename] = useState(initialFilename);

  const isAtRoot = currentPath === ROOT_PATH;
  const canSave = !isAtRoot && filename.trim().length > 0;

  useEffect(() => {
    if (isOpen) {
      setCurrentDrive(ROOT_PATH); setCurrentPath(ROOT_PATH); setFolders([]);
      setFilename(initialFilename);
      setIsLoading(true);
      CloudActions.getDrivesList().then(res => {
        setDrives(res.driveList); setIsLoading(false);
      });
    }
  }, [isOpen, initialFilename]);

  const loadFolder = (drive: string, folderPath: string) => {
    setIsLoading(true);
    CloudActions.getAllFolderItems({ drive, folderPath }).then(res => {
      setFolders(res.data.filter(item => item.isFolder));
      setCurrentDrive(drive); setCurrentPath(folderPath); setIsLoading(false);
    });
  };

  const handleGoToRoot = () => { setCurrentDrive(ROOT_PATH); setCurrentPath(ROOT_PATH); setFolders([]); };
  const handleSelectDrive = (drive: string) => loadFolder(drive, drive);
  const handleSelectFolder = (folderName: string) => loadFolder(currentDrive, `${currentPath}/${folderName}`);
  const handleGoBack = () => {
    const parentPath = getPathFolderContainer(currentPath);
    parentPath === ROOT_PATH ? handleGoToRoot() : loadFolder(currentDrive, parentPath);
  };
  const handleBreadcrumbClick = (path: string) => {
    if (path === ROOT_PATH) { handleGoToRoot(); return; }
    loadFolder(path.split('/')[0], path);
  };

  const handleAccept = () => {
    if (!canSave) return;
    const name = filename.trim();
    const filePath = `${currentPath}/${name}`;
    onSave(filePath);
    onClose();
  };

  const breadcrumbSegments = (() => {
    if (!currentPath) return [];
    const parts = currentPath.split('/');
    return parts.map((part, index) => ({
      label: part, path: parts.slice(0, index + 1).join('/'),
    }));
  })();

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ paddingBottom: '0.5rem' }}>Guardar en Cloud</DialogTitle>
      <DialogContent dividers sx={{ padding: 0 }}>

        {/* Breadcrumb */}
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
            gap: '0.1rem', padding: '0.4rem 0.75rem', backgroundColor: 'rgba(0,0,0,0.04)', minHeight: '2.75rem' }}>
          <Button size="small" startIcon={<HomeIcon fontSize="small" />} onClick={handleGoToRoot}
            sx={{ textTransform: 'none', padding: '0.15rem 0.5rem', minWidth: 'auto' }}>
            Inicio
          </Button>
          {breadcrumbSegments.map(({ label, path }, index) => (
            <React.Fragment key={path}>
              <NavigateNextIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
              <Button size="small" onClick={() => handleBreadcrumbClick(path)}
                disabled={index === breadcrumbSegments.length - 1}
                sx={{ textTransform: 'none', padding: '0.15rem 0.5rem', minWidth: 'auto',
                  fontWeight: index === breadcrumbSegments.length - 1 ? 700 : 400,
                  color: index === breadcrumbSegments.length - 1 ? 'text.primary' : undefined }}>
                {label}
              </Button>
            </React.Fragment>
          ))}
        </Box>
        <Divider />

        {/* Folder list */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '10rem' }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <List disablePadding sx={{ minHeight: '10rem', maxHeight: '18rem', overflowY: 'auto' }}>
            {!isAtRoot && (
              <ListItemButton onClick={handleGoBack} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary=".." secondary="Subir al nivel anterior"
                  primaryTypographyProps={{ variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption' }} />
              </ListItemButton>
            )}
            {isAtRoot && drives.map(drive => (
              <ListItemButton key={drive} onClick={() => handleSelectDrive(drive)}
                sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}><StorageIcon fontSize="small" color="primary" /></ListItemIcon>
                <ListItemText primary={drive} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
            ))}
            {!isAtRoot && folders.map(item => (
              <ListItemButton key={item.path} onClick={() => handleSelectFolder(item.name)}
                sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}><FolderIcon fontSize="small" sx={{ color: '#f0a500' }} /></ListItemIcon>
                <ListItemText primary={item.name} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
            ))}
            {!isAtRoot && !isLoading && folders.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '6rem' }}>
                <Typography variant="body2" color="text.secondary">Carpeta vacía</Typography>
              </Box>
            )}
          </List>
        )}
        <Divider />

        {/* Filename input */}
        <Box sx={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <TextField
            label="Nombre del fichero"
            placeholder="p. ej.: mi-artículo.html"
            size="small"
            fullWidth
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSave) handleAccept(); }}
            helperText="Extensiones admitidas: .txt  .html  .md"
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {canSave ? `→ ${currentPath}/${filename.trim()}` : ''}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: '0.75rem 1rem' }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" disabled={!canSave} onClick={handleAccept}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};
