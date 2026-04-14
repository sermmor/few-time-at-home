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
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { CloudActions } from '../../../core/actions/cloud';
import { CloudItem, getPathFolderContainer } from '../../../data-model/cloud';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (path: string) => void;
  title?: string;
}

const ROOT_PATH = '';

export const ModalCloudBrowser = ({
  isOpen,
  onClose,
  onAccept,
  title = 'Seleccionar carpeta',
}: Props): JSX.Element => {
  const [drives, setDrives] = React.useState<string[]>([]);
  const [currentDrive, setCurrentDrive] = React.useState<string>(ROOT_PATH);
  const [currentPath, setCurrentPath] = React.useState<string>(ROOT_PATH);
  const [folders, setFolders] = React.useState<CloudItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const isAtRoot = currentPath === ROOT_PATH;

  // Reset and load drives every time the dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentDrive(ROOT_PATH);
      setCurrentPath(ROOT_PATH);
      setFolders([]);
      setIsLoading(true);
      CloudActions.getDrivesList().then(res => {
        setDrives(res.driveList);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  const loadFolder = (drive: string, folderPath: string) => {
    setIsLoading(true);
    CloudActions.getAllFolderItems({ drive, folderPath }).then(res => {
      setFolders(res.data.filter(item => item.isFolder));
      setCurrentDrive(drive);
      setCurrentPath(folderPath);
      setIsLoading(false);
    });
  };

  const handleGoToRoot = () => {
    setCurrentDrive(ROOT_PATH);
    setCurrentPath(ROOT_PATH);
    setFolders([]);
  };

  const handleSelectDrive = (drive: string) => {
    loadFolder(drive, drive);
  };

  const handleSelectFolder = (folderName: string) => {
    loadFolder(currentDrive, `${currentPath}/${folderName}`);
  };

  const handleGoBack = () => {
    const parentPath = getPathFolderContainer(currentPath);
    if (parentPath === ROOT_PATH) {
      handleGoToRoot();
    } else {
      loadFolder(currentDrive, parentPath);
    }
  };

  const handleBreadcrumbClick = (path: string) => {
    if (path === ROOT_PATH) {
      handleGoToRoot();
    } else {
      const drive = path.split('/')[0];
      loadFolder(drive, path);
    }
  };

  const getBreadcrumbSegments = (): { label: string; path: string }[] => {
    if (!currentPath) return [];
    const parts = currentPath.split('/');
    return parts.map((part, index) => ({
      label: part,
      path: parts.slice(0, index + 1).join('/'),
    }));
  };

  const breadcrumbSegments = getBreadcrumbSegments();

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ paddingBottom: '0.5rem' }}>{title}</DialogTitle>

      <DialogContent dividers sx={{ padding: 0 }}>
        {/* ── Breadcrumb bar ── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.1rem',
            padding: '0.4rem 0.75rem',
            backgroundColor: 'rgba(0,0,0,0.04)',
            minHeight: '2.75rem',
          }}
        >
          <Button
            size="small"
            startIcon={<HomeIcon fontSize="small" />}
            onClick={handleGoToRoot}
            sx={{ textTransform: 'none', padding: '0.15rem 0.5rem', minWidth: 'auto' }}
          >
            Inicio
          </Button>
          {breadcrumbSegments.map(({ label, path }, index) => (
            <React.Fragment key={path}>
              <NavigateNextIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
              <Button
                size="small"
                onClick={() => handleBreadcrumbClick(path)}
                disabled={index === breadcrumbSegments.length - 1}
                sx={{
                  textTransform: 'none',
                  padding: '0.15rem 0.5rem',
                  minWidth: 'auto',
                  fontWeight: index === breadcrumbSegments.length - 1 ? 700 : 400,
                  color: index === breadcrumbSegments.length - 1 ? 'text.primary' : undefined,
                }}
              >
                {label}
              </Button>
            </React.Fragment>
          ))}
        </Box>

        <Divider />

        {/* ── Folder list ── */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '12rem' }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <List disablePadding sx={{ minHeight: '12rem', maxHeight: '18rem', overflowY: 'auto' }}>
            {/* Back button (when inside a drive) */}
            {!isAtRoot && (
              <ListItemButton
                onClick={handleGoBack}
                sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
              >
                <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                  <ArrowUpwardIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary=".."
                  secondary="Subir al nivel anterior"
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            )}

            {/* Drive entries (only at root) */}
            {isAtRoot &&
              drives.map(drive => (
                <ListItemButton
                  key={drive}
                  onClick={() => handleSelectDrive(drive)}
                  sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                    <StorageIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={drive} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              ))}

            {/* Folder entries (when inside a drive) */}
            {!isAtRoot &&
              folders.map(item => (
                <ListItemButton
                  key={item.path}
                  onClick={() => handleSelectFolder(item.name)}
                  sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                    <FolderIcon fontSize="small" sx={{ color: '#f0a500' }} />
                  </ListItemIcon>
                  <ListItemText primary={item.name} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              ))}

            {/* Empty folder notice */}
            {!isAtRoot && !isLoading && folders.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '8rem' }}>
                <Typography variant="body2" color="text.secondary">
                  Esta carpeta no contiene subcarpetas
                </Typography>
              </Box>
            )}
          </List>
        )}

        <Divider />

        {/* ── Selected path display ── */}
        <Box sx={{ padding: '0.4rem 1rem', backgroundColor: 'rgba(0,0,0,0.02)', minHeight: '2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            Ruta seleccionada:
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all' }}>
            {currentPath || '—'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: '0.75rem 1rem' }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={isAtRoot}
          onClick={() => {
            onAccept(currentPath);
            onClose();
          }}
        >
          Aceptar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
