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
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import DnsIcon from '@mui/icons-material/Dns';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { CloudItem } from '../../../data-model/cloud';
import { NetworkActions, UPnPBrowseResult, UPnPServer } from '../../../core/actions/network';
import { networkUpnpStreamProxyBase } from '../../../core/urls-and-end-points';

// Items with driveName === NETWORK_DRIVE have their stream URL pre-built in `path`.
export const NETWORK_DRIVE = '__network__';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv', '.avi'];
const isVideoByMime = (mime: string) => mime.startsWith('video/');
const isVideoByName = (name: string) => {
  const lower = name.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddVideos: (items: CloudItem[]) => void;
}

type Phase = 'serverList' | 'browsing';

interface BreadcrumbEntry { id: string; title: string; }

export const ModalNetworkBrowser = ({ isOpen, onClose, onAddVideos }: Props): JSX.Element => {
  const [phase, setPhase] = React.useState<Phase>('serverList');
  const [isLoading, setIsLoading] = React.useState(false);
  const [servers, setServers] = React.useState<UPnPServer[]>([]);
  const [selectedServer, setSelectedServer] = React.useState<UPnPServer | null>(null);
  const [browseResult, setBrowseResult] = React.useState<UPnPBrowseResult>({ containers: [], items: [] });
  const [breadcrumb, setBreadcrumb] = React.useState<BreadcrumbEntry[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Reset and discover servers every time the dialog opens
  React.useEffect(() => {
    if (!isOpen) return;
    setPhase('serverList');
    setServers([]);
    setSelectedServer(null);
    setBrowseResult({ containers: [], items: [] });
    setBreadcrumb([]);
    setSelectedIds(new Set());
    doDiscover();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const doDiscover = () => {
    setIsLoading(true);
    NetworkActions.discoverServers().then(({ servers: found }) => {
      setServers(found);
      setIsLoading(false);
    });
  };

  const browseContainer = (server: UPnPServer, objectId: string) => {
    setIsLoading(true);
    setSelectedIds(new Set());
    NetworkActions.browseServer(server.controlUrl, objectId).then(result => {
      setBrowseResult(result);
      setIsLoading(false);
    });
  };

  const handleSelectServer = (server: UPnPServer) => {
    setSelectedServer(server);
    setBreadcrumb([{ id: '0', title: server.name }]);
    setPhase('browsing');
    browseContainer(server, '0');
  };

  const handleEnterFolder = (containerId: string, containerTitle: string) => {
    setBreadcrumb(prev => [...prev, { id: containerId, title: containerTitle }]);
    browseContainer(selectedServer!, containerId);
  };

  const handleBreadcrumbClick = (index: number) => {
    const entry = breadcrumb[index];
    setBreadcrumb(prev => prev.slice(0, index + 1));
    browseContainer(selectedServer!, entry.id);
  };

  const handleGoBack = () => {
    if (breadcrumb.length <= 1) {
      setPhase('serverList');
      setSelectedServer(null);
      return;
    }
    const newBreadcrumb = breadcrumb.slice(0, -1);
    setBreadcrumb(newBreadcrumb);
    browseContainer(selectedServer!, newBreadcrumb[newBreadcrumb.length - 1].id);
  };

  const videoItems = browseResult.items.filter(
    i => isVideoByMime(i.mimeType) || isVideoByName(i.title)
  );

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = videoItems.length > 0 && videoItems.every(i => selectedIds.has(i.id));
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        videoItems.forEach(i => next.delete(i.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        videoItems.forEach(i => next.add(i.id));
        return next;
      });
    }
  };

  const handleAccept = () => {
    const base = networkUpnpStreamProxyBase();
    const cloudItems: CloudItem[] = videoItems
      .filter(i => selectedIds.has(i.id))
      .map(i => ({
        name: i.title,
        path: `${base}?url=${encodeURIComponent(i.resourceUrl)}`,
        driveName: NETWORK_DRIVE,
        isFolder: false,
      }));
    if (cloudItems.length > 0) onAddVideos(cloudItems);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>Añadir vídeos desde red local</Box>
        {phase === 'serverList' && (
          <Tooltip title="Buscar de nuevo">
            <IconButton size="small" onClick={doDiscover} disabled={isLoading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ padding: 0 }}>

        {/* ── Breadcrumb (browsing phase only) ── */}
        {phase === 'browsing' && (
          <>
            <Box sx={{
              display: 'flex', flexDirection: 'row', alignItems: 'center',
              flexWrap: 'wrap', gap: '0.1rem',
              padding: '0.4rem 0.75rem', backgroundColor: 'rgba(0,0,0,0.04)', minHeight: '2.75rem',
            }}>
              <Button size="small" startIcon={<HomeIcon fontSize="small" />}
                onClick={() => { setPhase('serverList'); setSelectedServer(null); }}
                sx={{ textTransform: 'none', padding: '0.15rem 0.5rem', minWidth: 'auto' }}>
                Servidores
              </Button>
              {breadcrumb.map((entry, index) => (
                <React.Fragment key={`${entry.id}-${index}`}>
                  <NavigateNextIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                  <Button size="small"
                    onClick={() => handleBreadcrumbClick(index)}
                    disabled={index === breadcrumb.length - 1}
                    sx={{
                      textTransform: 'none', padding: '0.15rem 0.5rem', minWidth: 'auto',
                      fontWeight: index === breadcrumb.length - 1 ? 700 : 400,
                      color: index === breadcrumb.length - 1 ? 'text.primary' : undefined,
                    }}>
                    {entry.title}
                  </Button>
                </React.Fragment>
              ))}
            </Box>
            <Divider />
          </>
        )}

        {/* ── "Select all" toolbar ── */}
        {phase === 'browsing' && !isLoading && videoItems.length > 0 && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem', backgroundColor: 'rgba(29,185,84,0.06)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}>
            <PlaylistAddIcon sx={{ color: '#1db954', fontSize: '1.1rem' }} />
            <Typography variant="caption" sx={{ flexGrow: 1, color: 'text.secondary' }}>
              {videoItems.length} vídeo{videoItems.length !== 1 ? 's' : ''} en esta carpeta
            </Typography>
            <Button size="small" variant={allSelected ? 'outlined' : 'contained'} color="success"
              sx={{ textTransform: 'none', fontSize: '0.75rem' }} onClick={handleSelectAll}>
              {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </Button>
          </Box>
        )}

        {/* ── List ── */}
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '14rem', gap: '1rem' }}>
            <CircularProgress size={32} />
            <Typography variant="caption" color="text.secondary">
              {phase === 'serverList' ? 'Buscando servidores en la red…' : 'Cargando contenido…'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ minHeight: '12rem', maxHeight: '22rem', overflowY: 'auto' }}>

            {/* Server list phase */}
            {phase === 'serverList' && servers.length === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '10rem', gap: '0.75rem' }}>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: '22rem' }}>
                  No se encontraron servidores multimedia UPnP/DLNA en la red local.
                </Typography>
                <Button size="small" startIcon={<RefreshIcon />} onClick={doDiscover}>
                  Buscar de nuevo
                </Button>
              </Box>
            )}

            {phase === 'serverList' && servers.map(server => (
              <ListItemButton key={server.location} onClick={() => handleSelectServer(server)}
                sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                  <DnsIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText primary={server.name}
                  secondary={new URL(server.location).host}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }} />
              </ListItemButton>
            ))}

            {/* Browsing phase */}
            {phase === 'browsing' && (
              <ListItemButton onClick={handleGoBack} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                  <ArrowUpwardIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary=".." secondary="Subir al nivel anterior"
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }} />
              </ListItemButton>
            )}

            {phase === 'browsing' && browseResult.containers.map(c => (
              <ListItemButton key={c.id} onClick={() => handleEnterFolder(c.id, c.title)}
                sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <ListItemIcon sx={{ minWidth: '2.25rem' }}>
                  <FolderIcon fontSize="small" sx={{ color: '#f0a500' }} />
                </ListItemIcon>
                <ListItemText primary={c.title}
                  secondary={c.childCount > 0 ? `${c.childCount} elementos` : undefined}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }} />
              </ListItemButton>
            ))}

            {phase === 'browsing' && videoItems.map(item => (
              <ListItemButton key={item.id} onClick={() => toggleItem(item.id)}
                sx={{
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  backgroundColor: selectedIds.has(item.id) ? 'rgba(29,185,84,0.08)' : 'transparent',
                }}>
                <Checkbox size="small" checked={selectedIds.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  onClick={e => e.stopPropagation()}
                  sx={{ padding: '0 0.5rem 0 0', color: '#1db954', '&.Mui-checked': { color: '#1db954' } }} />
                <ListItemIcon sx={{ minWidth: '2rem' }}>
                  <VideoFileIcon fontSize="small" sx={{ color: '#6060c0' }} />
                </ListItemIcon>
                <ListItemText primary={item.title}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: selectedIds.has(item.id) ? 600 : 400 }} />
              </ListItemButton>
            ))}

            {phase === 'browsing' && !isLoading && browseResult.containers.length === 0 && videoItems.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '8rem' }}>
                <Typography variant="body2" color="text.secondary">
                  Esta carpeta no contiene carpetas ni vídeos
                </Typography>
              </Box>
            )}
          </List>
        )}

        <Divider />

        {/* Selection summary */}
        <Box sx={{ padding: '0.4rem 1rem', backgroundColor: 'rgba(0,0,0,0.02)', minHeight: '2rem', display: 'flex', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {selectedIds.size === 0
              ? 'Ningún vídeo seleccionado'
              : `${selectedIds.size} vídeo${selectedIds.size !== 1 ? 's' : ''} seleccionado${selectedIds.size !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: '0.75rem 1rem' }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" disabled={selectedIds.size === 0} onClick={handleAccept}>
          Añadir a la cola
        </Button>
      </DialogActions>
    </Dialog>
  );
};
