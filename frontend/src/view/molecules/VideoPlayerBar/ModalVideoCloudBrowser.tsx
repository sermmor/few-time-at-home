import React from 'react';
import {
  Box,
  Button,
  Checkbox,
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
import VideoFileIcon from '@mui/icons-material/VideoFile';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { CloudActions } from '../../../core/actions/cloud';
import { CloudItem, getPathFolderContainer } from '../../../data-model/cloud';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv', '.avi'];

const isVideoFile = (name: string): boolean => {
  const lower = name.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddVideos: (items: CloudItem[]) => void;
}

const ROOT_PATH = '';

export const ModalVideoCloudBrowser = ({ isOpen, onClose, onAddVideos }: Props): JSX.Element => {
  const [drives, setDrives] = React.useState<string[]>([]);
  const [currentDrive, setCurrentDrive] = React.useState<string>(ROOT_PATH);
  const [currentPath, setCurrentPath] = React.useState<string>(ROOT_PATH);
  const [items, setItems] = React.useState<CloudItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [selectedPaths, setSelectedPaths] = React.useState<Set<string>>(new Set());

  const isAtRoot = currentPath === ROOT_PATH;
  const folders = items.filter(i => i.isFolder);
  const videoFiles = items.filter(i => !i.isFolder && isVideoFile(i.name));

  // Reset and load drives every time the dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentDrive(ROOT_PATH);
      setCurrentPath(ROOT_PATH);
      setItems([]);
      setSelectedPaths(new Set());
      setIsLoading(true);
      CloudActions.getDrivesList().then(res => {
        setDrives(res.driveList);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  const loadFolder = (drive: string, folderPath: string) => {
    setIsLoading(true);
    setSelectedPaths(new Set());
    CloudActions.getAllFolderItems({ drive, folderPath }).then(res => {
      setItems(res.data);
      setCurrentDrive(drive);
      setCurrentPath(folderPath);
      setIsLoading(false);
    });
  };

  const handleGoToRoot = () => {
    setCurrentDrive(ROOT_PATH);
    setCurrentPath(ROOT_PATH);
    setItems([]);
    setSelectedPaths(new Set());
  };

  const handleSelectDrive = (drive: string) => loadFolder(drive, drive);

  const handleSelectFolder = (item: CloudItem) =>
    loadFolder(currentDrive, item.path);

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

  const toggleFileSelection = (item: CloudItem) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(item.path)) {
        next.delete(item.path);
      } else {
        next.add(item.path);
      }
      return next;
    });
  };

  const handleSelectAllVideos = () => {
    if (videoFiles.every(f => selectedPaths.has(f.path))) {
      // All already selected → deselect all
      setSelectedPaths(prev => {
        const next = new Set(prev);
        videoFiles.forEach(f => next.delete(f.path));
        return next;
      });
    } else {
      // Select all
      setSelectedPaths(prev => {
        const next = new Set(prev);
        videoFiles.forEach(f => next.add(f.path));
        return next;
      });
    }
  };

  const handleAccept = () => {
    const selected = items.filter(i => selectedPaths.has(i.path));
    if (selected.length > 0) {
      onAddVideos(selected);
    }
    onClose();
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
  const allVideosSelected = videoFiles.length > 0 && videoFiles.every(f => selectedPaths.has(f.path));

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ paddingBottom: '0.5rem' }}>Añadir vídeos a la cola</DialogTitle>

      <DialogContent dividers sx={{ padding: 0 }}>
        {/* ── Breadcrumb bar ── */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.1rem',
          padding: '0.4rem 0.75rem',
          backgroundColor: 'rgba(0,0,0,0.04)',
          minHeight: '2.75rem',
        }}>
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

        {/* ── List ── */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '14rem' }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            {/* "Add all videos" toolbar — only when there are video files */}
            {!isAtRoot && videoFiles.length > 0 && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 1rem',
                backgroundColor: 'rgba(29,185,84,0.06)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
              }}>
                <PlaylistAddIcon sx={{ color: '#1db954', fontSize: '1.1rem' }} />
                <Typography variant="caption" sx={{ flexGrow: 1, color: 'text.secondary' }}>
                  {videoFiles.length} vídeo{videoFiles.length !== 1 ? 's' : ''} en esta carpeta
                </Typography>
                <Button
                  size="small"
                  variant={allVideosSelected ? 'outlined' : 'contained'}
                  color="success"
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  onClick={handleSelectAllVideos}
                >
                  {allVideosSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              </Box>
            )}

            <List disablePadding sx={{ minHeight: '12rem', maxHeight: '22rem', overflowY: 'auto' }}>
              {/* Back button */}
              {!isAtRoot && (
                <ListItemButton onClick={handleGoBack} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
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

              {/* Drive entries (root level) */}
              {isAtRoot && drives.map(drive => (
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

              {/* Folder entries */}
              {!isAtRoot && folders.map(item => (
                <ListItemButton
                  key={item.path}
                  onClick={() => handleSelectFolder(item)}
                  sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                    <FolderIcon fontSize="small" sx={{ color: '#f0a500' }} />
                  </ListItemIcon>
                  <ListItemText primary={item.name} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              ))}

              {/* Video file entries */}
              {!isAtRoot && videoFiles.map(item => (
                <ListItemButton
                  key={item.path}
                  onClick={() => toggleFileSelection(item)}
                  sx={{
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    backgroundColor: selectedPaths.has(item.path)
                      ? 'rgba(29,185,84,0.08)'
                      : 'transparent',
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={selectedPaths.has(item.path)}
                    onChange={() => toggleFileSelection(item)}
                    onClick={e => e.stopPropagation()}
                    sx={{ padding: '0 0.5rem 0 0', color: '#1db954', '&.Mui-checked': { color: '#1db954' } }}
                  />
                  <ListItemIcon sx={{ minWidth: '2rem' }}>
                    <VideoFileIcon fontSize="small" sx={{ color: '#6060c0' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: selectedPaths.has(item.path) ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              ))}

              {/* Empty notice */}
              {!isAtRoot && !isLoading && folders.length === 0 && videoFiles.length === 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '8rem' }}>
                  <Typography variant="body2" color="text.secondary">
                    Esta carpeta no contiene carpetas ni vídeos
                  </Typography>
                </Box>
              )}
            </List>
          </>
        )}

        <Divider />

        {/* ── Selection summary ── */}
        <Box sx={{ padding: '0.4rem 1rem', backgroundColor: 'rgba(0,0,0,0.02)', minHeight: '2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Typography variant="caption" color="text.secondary">
            {selectedPaths.size === 0
              ? 'Ningún vídeo seleccionado'
              : `${selectedPaths.size} vídeo${selectedPaths.size !== 1 ? 's' : ''} seleccionado${selectedPaths.size !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: '0.75rem 1rem' }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={selectedPaths.size === 0}
          onClick={handleAccept}
        >
          Añadir a la cola
        </Button>
      </DialogActions>
    </Dialog>
  );
};
