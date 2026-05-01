import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import FolderIcon        from '@mui/icons-material/Folder';
import ImageIcon         from '@mui/icons-material/Image';
import StorageIcon       from '@mui/icons-material/Storage';
import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward';
import HomeIcon          from '@mui/icons-material/Home';
import NavigateNextIcon  from '@mui/icons-material/NavigateNext';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import { CloudActions }  from '../../../core/actions/cloud';
import { CloudItem, getPathFolderContainer } from '../../../data-model/cloud';

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.avif'];
const isImage = (name: string) =>
  IMAGE_EXTS.some(ext => name.toLowerCase().endsWith(ext));

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  onAccept:  (path: string) => void;
  title?:    string;
}

const ROOT_PATH = '';

export const ModalCloudImagePicker = ({
  isOpen,
  onClose,
  onAccept,
  title = 'Seleccionar imagen',
}: Props): JSX.Element => {
  const [drives,       setDrives      ] = React.useState<string[]>([]);
  const [currentDrive, setCurrentDrive] = React.useState(ROOT_PATH);
  const [currentPath,  setCurrentPath ] = React.useState(ROOT_PATH);
  const [items,        setItems       ] = React.useState<CloudItem[]>([]);
  const [selectedFile, setSelectedFile] = React.useState('');
  const [isLoading,    setIsLoading   ] = React.useState(false);

  const isAtRoot = currentPath === ROOT_PATH;

  React.useEffect(() => {
    if (!isOpen) return;
    setCurrentDrive(ROOT_PATH);
    setCurrentPath(ROOT_PATH);
    setItems([]);
    setSelectedFile('');
    setIsLoading(true);
    CloudActions.getDrivesList().then(res => {
      setDrives(res.driveList);
      setIsLoading(false);
    });
  }, [isOpen]);

  const loadFolder = (drive: string, folderPath: string) => {
    setIsLoading(true);
    setSelectedFile('');
    CloudActions.getAllFolderItems({ drive, folderPath }).then(res => {
      // Show subfolders and image files
      setItems(res.data.filter(item => item.isFolder || isImage(item.name)));
      setCurrentDrive(drive);
      setCurrentPath(folderPath);
      setIsLoading(false);
    });
  };

  const handleGoToRoot = () => {
    setCurrentDrive(ROOT_PATH);
    setCurrentPath(ROOT_PATH);
    setItems([]);
    setSelectedFile('');
  };

  const handleGoBack = () => {
    const parent = getPathFolderContainer(currentPath);
    parent === ROOT_PATH ? handleGoToRoot() : loadFolder(currentDrive, parent);
  };

  const handleBreadcrumbClick = (path: string) => {
    if (path === ROOT_PATH) return handleGoToRoot();
    loadFolder(path.split('/')[0], path);
  };

  const getBreadcrumbSegments = () => {
    if (!currentPath) return [];
    const parts = currentPath.split('/');
    return parts.map((part, i) => ({
      label: part,
      path:  parts.slice(0, i + 1).join('/'),
    }));
  };

  const breadcrumbs = getBreadcrumbSegments();

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ paddingBottom: '0.5rem' }}>{title}</DialogTitle>

      <DialogContent dividers sx={{ padding: 0 }}>
        {/* ── Breadcrumb bar ── */}
        <Box sx={{
          display: 'flex', flexDirection: 'row', alignItems: 'center',
          flexWrap: 'wrap', gap: '0.1rem',
          padding: '0.4rem 0.75rem',
          backgroundColor: 'rgba(0,0,0,0.04)', minHeight: '2.75rem',
        }}>
          <Button size="small" startIcon={<HomeIcon fontSize="small" />}
            onClick={handleGoToRoot}
            sx={{ textTransform: 'none', padding: '0.15rem 0.5rem', minWidth: 'auto' }}>
            Inicio
          </Button>
          {breadcrumbs.map(({ label, path }, index) => (
            <React.Fragment key={path}>
              <NavigateNextIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
              <Button size="small"
                onClick={() => handleBreadcrumbClick(path)}
                disabled={index === breadcrumbs.length - 1}
                sx={{
                  textTransform: 'none', padding: '0.15rem 0.5rem', minWidth: 'auto',
                  fontWeight: index === breadcrumbs.length - 1 ? 700 : 400,
                }}>
                {label}
              </Button>
            </React.Fragment>
          ))}
        </Box>

        <Divider />

        {/* ── Item list ── */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '12rem' }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <List disablePadding sx={{ minHeight: '12rem', maxHeight: '18rem', overflowY: 'auto' }}>
            {/* Back (..) */}
            {!isAtRoot && (
              <ListItemButton onClick={handleGoBack}
                sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                  <ArrowUpwardIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary=".."
                  secondary="Subir al nivel anterior"
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }} />
              </ListItemButton>
            )}

            {/* Drives (root) */}
            {isAtRoot && drives.map(drive => (
              <ListItemButton key={drive} onClick={() => loadFolder(drive, drive)}
                sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                  <StorageIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText primary={drive} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
            ))}

            {/* Folders and image files */}
            {!isAtRoot && items.map(item => (
              <ListItemButton key={item.path}
                selected={!item.isFolder && selectedFile === item.path}
                onClick={() => {
                  if (item.isFolder) {
                    loadFolder(currentDrive, `${currentPath}/${item.name}`);
                  } else {
                    setSelectedFile(prev => prev === item.path ? '' : item.path);
                  }
                }}
                sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                  {item.isFolder ? (
                    <FolderIcon fontSize="small" sx={{ color: '#f0a500' }} />
                  ) : selectedFile === item.path ? (
                    <CheckCircleIcon fontSize="small" color="primary" />
                  ) : (
                    <ImageIcon fontSize="small" color="action" />
                  )}
                </ListItemIcon>
                <ListItemText primary={item.name}
                  primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
            ))}

            {!isAtRoot && !isLoading && items.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '8rem' }}>
                <Typography variant="body2" color="text.secondary">
                  No hay imágenes ni subcarpetas
                </Typography>
              </Box>
            )}
          </List>
        )}

        <Divider />

        {/* ── Selected file display ── */}
        <Box sx={{
          padding: '0.4rem 1rem', backgroundColor: 'rgba(0,0,0,0.02)',
          minHeight: '2rem', display: 'flex', alignItems: 'center', gap: '0.25rem',
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Imagen:
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}>
            {selectedFile || '—'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: '0.75rem 1rem' }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" disabled={!selectedFile}
          onClick={() => { onAccept(selectedFile); onClose(); }}>
          Aceptar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
