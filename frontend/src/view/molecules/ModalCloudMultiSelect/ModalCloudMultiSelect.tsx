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
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import StorageIcon from '@mui/icons-material/Storage';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { CloudActions } from '../../../core/actions/cloud';
import { CloudItem, getPathFolderContainer } from '../../../data-model/cloud';

/**
 * Explorador de la Cloud con selección múltiple de carpetas y ficheros.
 * La selección se mantiene al navegar entre carpetas y solo se devuelve al pulsar "Aceptar".
 */

export interface CloudSelection {
  path: string;
  isFolder: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (selection: CloudSelection[]) => void;
  /** Selección con la que se abre el diálogo. */
  initialSelection?: CloudSelection[];
  title?: string;
  /** Si se indica, solo se muestran los ficheros que lo cumplan (las carpetas siempre se muestran). */
  fileFilter?: (fileName: string) => boolean;
}

const ROOT_PATH = '';

const sortItems = (items: CloudItem[]) => [...items].sort((a, b) =>
  a.isFolder === b.isFolder ? a.name.localeCompare(b.name) : (a.isFolder ? -1 : 1));

export const ModalCloudMultiSelect = ({
  isOpen,
  onClose,
  onAccept,
  initialSelection = [],
  title = 'Seleccionar carpetas y ficheros',
  fileFilter,
}: Props): JSX.Element => {
  const [drives, setDrives] = React.useState<string[]>([]);
  const [currentDrive, setCurrentDrive] = React.useState<string>(ROOT_PATH);
  const [currentPath, setCurrentPath] = React.useState<string>(ROOT_PATH);
  const [items, setItems] = React.useState<CloudItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [selection, setSelection] = React.useState<CloudSelection[]>([]);

  const isAtRoot = currentPath === ROOT_PATH;

  React.useEffect(() => {
    if (isOpen) {
      setCurrentDrive(ROOT_PATH);
      setCurrentPath(ROOT_PATH);
      setItems([]);
      setSelection(initialSelection);
      setIsLoading(true);
      CloudActions.getDrivesList().then(res => {
        setDrives(res.driveList);
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadFolder = (drive: string, folderPath: string) => {
    setIsLoading(true);
    CloudActions.getAllFolderItems({ drive, folderPath }).then(res => {
      const visible = res.data.filter(item => !item.name.startsWith('.') && (item.isFolder || !fileFilter || fileFilter(item.name)));
      setItems(sortItems(visible));
      setCurrentDrive(drive);
      setCurrentPath(folderPath);
      setIsLoading(false);
    });
  };

  const handleGoToRoot = () => {
    setCurrentDrive(ROOT_PATH);
    setCurrentPath(ROOT_PATH);
    setItems([]);
  };

  const handleGoBack = () => {
    const parentPath = getPathFolderContainer(currentPath);
    if (parentPath === ROOT_PATH) handleGoToRoot();
    else loadFolder(currentDrive, parentPath);
  };

  const isSelected = (path: string) => selection.some(s => s.path === path);
  /** Un elemento cuya carpeta padre ya está seleccionada se incluye igualmente. */
  const isCoveredByParent = (path: string) => selection.some(s => s.isFolder && path.startsWith(`${s.path}/`));

  const toggle = (item: CloudItem) => {
    if (isSelected(item.path)) {
      setSelection(prev => prev.filter(s => s.path !== item.path));
    } else {
      // Al seleccionar una carpeta se quitan sus descendientes ya seleccionados (quedan incluidos).
      setSelection(prev => [
        ...prev.filter(s => !s.path.startsWith(`${item.path}/`)),
        { path: item.path, isFolder: item.isFolder },
      ]);
    }
  };

  const selectableHere = items.filter(item => !isCoveredByParent(item.path));
  const allHereSelected = selectableHere.length > 0 && selectableHere.every(item => isSelected(item.path));
  const toggleAllHere = () => {
    if (allHereSelected) {
      const here = new Set(selectableHere.map(i => i.path));
      setSelection(prev => prev.filter(s => !here.has(s.path)));
    } else {
      selectableHere.filter(item => !isSelected(item.path)).forEach(toggle);
    }
  };

  const breadcrumbSegments = currentPath
    ? currentPath.split('/').map((part, index, parts) => ({ label: part, path: parts.slice(0, index + 1).join('/') }))
    : [];

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ paddingBottom: '0.5rem' }}>{title}</DialogTitle>

      <DialogContent dividers sx={{ padding: 0 }}>
        {/* ── Migas de pan ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.1rem', padding: '0.4rem 0.75rem', backgroundColor: 'rgba(0,0,0,0.04)', minHeight: '2.75rem' }}>
          <Button size="small" startIcon={<HomeIcon fontSize="small" />} onClick={handleGoToRoot}
            sx={{ textTransform: 'none', padding: '0.15rem 0.5rem', minWidth: 'auto' }}>
            Inicio
          </Button>
          {breadcrumbSegments.map(({ label, path }, index) => (
            <React.Fragment key={path}>
              <NavigateNextIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
              <Button size="small" onClick={() => loadFolder(path.split('/')[0], path)}
                disabled={index === breadcrumbSegments.length - 1}
                sx={{
                  textTransform: 'none', padding: '0.15rem 0.5rem', minWidth: 'auto',
                  fontWeight: index === breadcrumbSegments.length - 1 ? 700 : 400,
                  color: index === breadcrumbSegments.length - 1 ? 'text.primary' : undefined,
                }}>
                {label}
              </Button>
            </React.Fragment>
          ))}
        </Box>

        <Divider />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '14rem' }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <List disablePadding dense sx={{ minHeight: '14rem', maxHeight: '22rem', overflowY: 'auto' }}>
            {!isAtRoot && (
              <ListItemButton onClick={handleGoBack} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary=".." secondary="Subir al nivel anterior"
                  primaryTypographyProps={{ variant: 'body2' }} secondaryTypographyProps={{ variant: 'caption' }} />
              </ListItemButton>
            )}

            {!isAtRoot && selectableHere.length > 0 && (
              <ListItemButton onClick={toggleAllHere} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                  <Checkbox edge="start" size="small" checked={allHereSelected} tabIndex={-1} disableRipple sx={{ p: 0 }} />
                </ListItemIcon>
                <ListItemText primary="Seleccionar todo lo de esta carpeta" primaryTypographyProps={{ variant: 'body2', fontStyle: 'italic' }} />
              </ListItemButton>
            )}

            {isAtRoot && drives.map(drive => (
              <ListItemButton key={drive} onClick={() => loadFolder(drive, drive)} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}><StorageIcon fontSize="small" color="primary" /></ListItemIcon>
                <ListItemText primary={drive} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
            ))}

            {!isAtRoot && items.map(item => {
              const covered = isCoveredByParent(item.path);
              return (
                <ListItem key={item.path} disablePadding sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                  secondaryAction={item.isFolder ? (
                    <Button size="small" onClick={() => loadFolder(currentDrive, item.path)}
                      sx={{ textTransform: 'none', minWidth: 'auto' }} endIcon={<NavigateNextIcon />}>
                      Abrir
                    </Button>
                  ) : undefined}>
                  <ListItemButton onClick={() => !covered && toggle(item)} disabled={covered} sx={{ pr: item.isFolder ? '5.5rem' : undefined }}>
                    <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                      <Checkbox edge="start" size="small" checked={covered || isSelected(item.path)} tabIndex={-1} disableRipple sx={{ p: 0 }} />
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: '1.9rem' }}>
                      {item.isFolder
                        ? <FolderIcon fontSize="small" sx={{ color: '#f0a500' }} />
                        : <AudioFileIcon fontSize="small" color="action" />}
                    </ListItemIcon>
                    <ListItemText primary={item.name} primaryTypographyProps={{ variant: 'body2', sx: { wordBreak: 'break-word' } }} />
                  </ListItemButton>
                </ListItem>
              );
            })}

            {!isAtRoot && items.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '8rem' }}>
                <Typography variant="body2" color="text.secondary">Esta carpeta está vacía</Typography>
              </Box>
            )}
          </List>
        )}

        <Divider />

        <Box sx={{ padding: '0.4rem 1rem', backgroundColor: 'rgba(0,0,0,0.02)', minHeight: '2rem', display: 'flex', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {selection.length === 0
              ? 'Nada seleccionado'
              : `${selection.length} elemento${selection.length !== 1 ? 's' : ''} seleccionado${selection.length !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: '0.75rem 1rem' }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={() => { onAccept(selection); onClose(); }}>Aceptar</Button>
      </DialogActions>
    </Dialog>
  );
};
