import React, { useState, useEffect } from 'react';
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, List, ListItemButton, ListItemIcon, ListItemText, Typography,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { CloudActions } from '../../../../core/actions/cloud';
import { CloudItem, getPathFolderContainer } from '../../../../data-model/cloud';

const ALLOWED_EXTENSIONS = ['.txt', '.html', '.md'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpen: (drive: string, path: string, content: string, filename: string) => void;
}

const ROOT_PATH = '';

export const ModalOpenFromCloud: React.FC<Props> = ({ isOpen, onClose, onOpen }) => {
  const [drives, setDrives] = useState<string[]>([]);
  const [currentDrive, setCurrentDrive] = useState<string>(ROOT_PATH);
  const [currentPath, setCurrentPath] = useState<string>(ROOT_PATH);
  const [items, setItems] = useState<CloudItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CloudItem | null>(null);

  const isAtRoot = currentPath === ROOT_PATH;

  useEffect(() => {
    if (isOpen) {
      setCurrentDrive(ROOT_PATH);
      setCurrentPath(ROOT_PATH);
      setItems([]);
      setSelectedFile(null);
      setIsLoading(true);
      CloudActions.getDrivesList().then(res => {
        setDrives(res.driveList);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  const loadFolder = (drive: string, folderPath: string) => {
    setIsLoading(true);
    setSelectedFile(null);
    CloudActions.getAllFolderItems({ drive, folderPath }).then(res => {
      const filtered = res.data.filter(
        item => item.isFolder || ALLOWED_EXTENSIONS.some(ext => item.name.toLowerCase().endsWith(ext))
      );
      setItems(filtered);
      setCurrentDrive(drive);
      setCurrentPath(folderPath);
      setIsLoading(false);
    });
  };

  const handleGoToRoot = () => {
    setCurrentDrive(ROOT_PATH); setCurrentPath(ROOT_PATH); setItems([]); setSelectedFile(null);
  };

  const handleSelectDrive = (drive: string) => loadFolder(drive, drive);

  const handleSelectFolder = (folderName: string) =>
    loadFolder(currentDrive, `${currentPath}/${folderName}`);

  const handleGoBack = () => {
    const parentPath = getPathFolderContainer(currentPath);
    parentPath === ROOT_PATH ? handleGoToRoot() : loadFolder(currentDrive, parentPath);
  };

  const handleBreadcrumbClick = (path: string) => {
    if (path === ROOT_PATH) { handleGoToRoot(); return; }
    loadFolder(path.split('/')[0], path);
  };

  const handleAccept = async () => {
    if (!selectedFile) return;
    setIsLoadingFile(true);
    try {
      const content = await CloudActions.openFileContentInEditor({ drive: selectedFile.driveName, path: selectedFile.path });
      onOpen(selectedFile.driveName, selectedFile.path, content, selectedFile.name);
      onClose();
    } finally {
      setIsLoadingFile(false);
    }
  };

  const breadcrumbSegments = (() => {
    if (!currentPath) return [];
    const parts = currentPath.split('/');
    return parts.map((part, index) => ({
      label: part,
      path: parts.slice(0, index + 1).join('/'),
    }));
  })();

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ paddingBottom: '0.5rem' }}>Open from Cloud</DialogTitle>
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

        {/* File list */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '12rem' }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <List disablePadding sx={{ minHeight: '12rem', maxHeight: '22rem', overflowY: 'auto' }}>
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
            {!isAtRoot && items.map(item => (
              <ListItemButton key={item.path}
                selected={selectedFile?.path === item.path}
                onClick={() => item.isFolder ? handleSelectFolder(item.name) : setSelectedFile(item)}
                sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)',
                  backgroundColor: selectedFile?.path === item.path ? 'rgba(124,58,237,0.08)' : undefined }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                  {item.isFolder
                    ? <FolderIcon fontSize="small" sx={{ color: '#f0a500' }} />
                    : <InsertDriveFileIcon fontSize="small" color="action" />}
                </ListItemIcon>
                <ListItemText primary={item.name} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
            ))}
            {!isAtRoot && !isLoading && items.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '8rem' }}>
                <Typography variant="body2" color="text.secondary">No hay ficheros compatibles</Typography>
              </Box>
            )}
          </List>
        )}
        <Divider />

        {/* Selected file display */}
        <Box sx={{ padding: '0.4rem 1rem', backgroundColor: 'rgba(0,0,0,0.02)', minHeight: '2rem',
            display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Fichero seleccionado:
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}>
            {selectedFile ? selectedFile.path : '—'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: '0.75rem 1rem' }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" disabled={!selectedFile || isLoadingFile}
          onClick={handleAccept}
          startIcon={isLoadingFile ? <CircularProgress size={16} color="inherit" /> : undefined}>
          Abrir
        </Button>
      </DialogActions>
    </Dialog>
  );
};
