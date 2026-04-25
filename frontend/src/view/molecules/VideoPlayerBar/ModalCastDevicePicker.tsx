import React from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import CastIcon from '@mui/icons-material/Cast';
import CloseIcon from '@mui/icons-material/Close';

export interface CastDevice {
  name: string;
  ip:   string;
  port: number;
}

interface Props {
  open:        boolean;
  discovering: boolean;
  devices:     CastDevice[];
  onSelect:    (device: CastDevice) => void;
  onClose:     () => void;
}

export const ModalCastDevicePicker = ({
  open,
  discovering,
  devices,
  onSelect,
  onClose,
}: Props): JSX.Element => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="xs"
    fullWidth
    PaperProps={{
      sx: {
        backgroundColor: '#12122a',
        border:          '1px solid #3a3a5c',
        borderRadius:    '10px',
        color:           '#e0e0f0',
      },
    }}
  >
    <DialogTitle sx={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      paddingBottom:  0,
      fontSize:       '0.95rem',
      fontWeight:     600,
      color:          '#e0e0f0',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CastIcon sx={{ fontSize: '1.1rem', color: '#1db954' }} />
        Seleccionar dispositivo
      </Box>
      <IconButton
        onClick={onClose}
        size="small"
        sx={{ color: '#7070a0', '&:hover': { color: '#eee' } }}
      >
        <CloseIcon sx={{ fontSize: '1rem' }} />
      </IconButton>
    </DialogTitle>

    <DialogContent sx={{ paddingTop: '0.75rem !important' }}>
      {discovering ? (
        <Box sx={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            '1rem',
          padding:        '1.5rem 0',
          color:          '#7070a0',
        }}>
          <CircularProgress size={28} sx={{ color: '#1db954' }} />
          <Typography variant="body2" sx={{ color: 'inherit', fontSize: '0.8rem' }}>
            Buscando dispositivos en la red…
          </Typography>
        </Box>
      ) : devices.length === 0 ? (
        <Box sx={{
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '0.5rem',
          padding:       '1.5rem 0',
          color:         '#5a5a7a',
        }}>
          <CastIcon sx={{ fontSize: '2.5rem', opacity: 0.4 }} />
          <Typography variant="body2" sx={{ color: 'inherit', fontSize: '0.8rem', textAlign: 'center' }}>
            No se encontraron dispositivos Chromecast.
            <br />
            Asegúrate de estar en la misma red.
          </Typography>
        </Box>
      ) : (
        <List dense disablePadding>
          {devices.map((device) => (
            <ListItem key={device.ip} disablePadding>
              <ListItemButton
                onClick={() => onSelect(device)}
                sx={{
                  borderRadius: '6px',
                  marginBottom: '2px',
                  '&:hover': { backgroundColor: 'rgba(29,185,84,0.1)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: '36px' }}>
                  <CastIcon sx={{ fontSize: '1.1rem', color: '#1db954' }} />
                </ListItemIcon>
                <ListItemText
                  primary={device.name}
                  secondary={`${device.ip}:${device.port}`}
                  primaryTypographyProps={{
                    fontSize:   '0.85rem',
                    color:      '#e0e0f0',
                    fontWeight: 500,
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.7rem',
                    color:    '#5a5a7a',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </DialogContent>
  </Dialog>
);
