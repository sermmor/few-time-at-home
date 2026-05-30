// Mobile-mode variant of DesktopPropertiesDialog.
// Differences vs the standard dialog:
//   • No "Rows" field — rows is always 1 in mobile mode.
//   • Cols max = 64, default = 16.

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
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ClearIcon      from '@mui/icons-material/Clear';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import { DesktopConfig, DesktopActions } from '../../../core/actions/desktop';
import { ModalCloudImagePicker } from '../../molecules/ModalCloudImagePicker/ModalCloudImagePicker';

const BASE_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#2d6a4f', '#1b4332', '#40916c', '#52b788',
  '#7b2d8b', '#6a0572', '#9b5de5', '#c77dff',
  '#e63946', '#c1121f', '#fb8500', '#ffb703',
];
const wsColor = (i: number) => BASE_COLORS[i % BASE_COLORS.length];

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

interface Props {
  isOpen:  boolean;
  onClose: () => void;
  config:  DesktopConfig;
  onSave:  (updated: DesktopConfig) => void;
}

export const DesktopMobilePropertiesDialog: React.FC<Props> = ({
  isOpen, onClose, config, onSave,
}) => {
  // rows is always 1 in mobile mode — never exposed to the user.
  const [cols,       setCols      ] = React.useState(config.cols);
  const [wallpapers, setWallpapers] = React.useState<string[]>(config.wallpapers);
  const [saving,     setSaving    ] = React.useState(false);
  const [pickerFor,  setPickerFor ] = React.useState<number | null>(null);

  // Re-sync when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setCols(config.cols);
      setWallpapers(config.wallpapers);
    }
  }, [isOpen, config]);

  // In mobile mode total = cols (1 implicit row)
  const total = cols;

  const adjustedWallpapers = React.useMemo(
    () => Array.from({ length: total }, (_, i) => wallpapers[i] ?? ''),
    [total, wallpapers],
  );

  const setWallpaper = (index: number, path: string) =>
    setWallpapers(prev =>
      Array.from({ length: total }, (_, i) =>
        i === index ? path : (prev[i] ?? ''),
      ),
    );

  const handleSave = () => {
    setSaving(true);
    const next: DesktopConfig = {
      ...config,
      rows: 1,           // always 1 in mobile mode
      cols,
      wallpapers: adjustedWallpapers,
    };
    DesktopActions.saveDesktopConfig(next)
      .then(() => { onSave(next); onClose(); })
      .finally(() => setSaving(false));
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartphoneIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
          Propiedades del escritorio — Modo Móvil
        </DialogTitle>

        <DialogContent dividers>

          {/* ── Columns only (no rows in mobile mode) ──────────────── */}
          <Typography variant="subtitle2" sx={{
            mb: 1.5, fontWeight: 600, textTransform: 'uppercase',
            fontSize: '0.72rem', color: 'text.secondary', letterSpacing: '0.05em',
          }}>
            Número de escritorios (columnas)
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
            <TextField
              label="Columnas"
              type="number"
              size="small"
              value={cols}
              onChange={e => setCols(clamp(Number(e.target.value), 1, 64))}
              inputProps={{ min: 1, max: 64 }}
              sx={{ width: '9rem' }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              máx. 64 · siempre 1 fila (modo retrato)
            </Typography>
          </Box>

          <Typography variant="caption" sx={{
            color: 'text.secondary', display: 'block', mb: 3,
          }}>
            Cada columna es un escritorio independiente. Navega entre ellos con las flechas
            izquierda / derecha o con Shift + ←→.
          </Typography>

          {/* ── Wallpapers ─────────────────────────────────────────── */}
          <Typography variant="subtitle2" sx={{
            mb: 1.5, fontWeight: 600, textTransform: 'uppercase',
            fontSize: '0.72rem', color: 'text.secondary', letterSpacing: '0.05em',
          }}>
            Fondos de pantalla — {total} escritorio{total !== 1 ? 's' : ''}
            {' '}
            <Typography component="span" variant="caption"
              sx={{ textTransform: 'none', fontWeight: 400 }}>
              (recomendado: imágenes verticales 9:16 o 9:19.5)
            </Typography>
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {Array.from({ length: total }, (_, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>

                {/* Colour swatch + workspace number */}
                <Box sx={{
                  width: '2.5rem', height: '2.5rem', borderRadius: '6px',
                  flexShrink: 0, backgroundColor: wsColor(i),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography variant="caption" sx={{
                    color: 'rgba(255,255,255,0.75)', fontWeight: 700, fontSize: '0.7rem',
                  }}>
                    {i + 1}
                  </Typography>
                </Box>

                {/* Editable path */}
                <TextField
                  size="small"
                  label={`Escritorio ${i + 1}`}
                  value={adjustedWallpapers[i]}
                  placeholder="Sin fondo (usa color)"
                  fullWidth
                  onChange={e => setWallpaper(i, e.target.value)}
                  InputProps={{
                    sx: { fontFamily: 'monospace', fontSize: '0.78rem' },
                    endAdornment: adjustedWallpapers[i] ? (
                      <InputAdornment position="end">
                        <IconButton size="small" edge="end"
                          onClick={() => setWallpaper(i, '')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  }}
                />

                {/* Browse */}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FolderOpenIcon fontSize="small" />}
                  onClick={() => setPickerFor(i)}
                  sx={{ whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'none' }}
                >
                  Examinar
                </Button>
              </Box>
            ))}
          </Box>

        </DialogContent>

        <DialogActions sx={{ padding: '0.75rem 1rem' }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving
              ? <CircularProgress size={16} color="inherit" />
              : undefined}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ModalCloudImagePicker
        isOpen={pickerFor !== null}
        title={pickerFor !== null ? `Fondo — Escritorio ${pickerFor + 1}` : ''}
        onClose={() => setPickerFor(null)}
        onAccept={path => {
          if (pickerFor !== null) setWallpaper(pickerFor, path);
        }}
      />
    </>
  );
};
