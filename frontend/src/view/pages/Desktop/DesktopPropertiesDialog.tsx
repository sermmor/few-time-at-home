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
import { DesktopConfig, DesktopActions } from '../../../core/actions/desktop';
import { ModalCloudImagePicker } from '../../molecules/ModalCloudImagePicker/ModalCloudImagePicker';

// Default colour per workspace index (cycling if > 16 workspaces)
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

export const DesktopPropertiesDialog: React.FC<Props> = ({
  isOpen, onClose, config, onSave,
}) => {
  const [rows,       setRows      ] = React.useState(config.rows);
  const [cols,       setCols      ] = React.useState(config.cols);
  const [wallpapers, setWallpapers] = React.useState<string[]>(config.wallpapers);
  const [saving,     setSaving    ] = React.useState(false);
  const [pickerFor,  setPickerFor ] = React.useState<number | null>(null);

  // Re-sync local state when the dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setRows(config.rows);
      setCols(config.cols);
      setWallpapers(config.wallpapers);
    }
  }, [isOpen, config]);

  const total = rows * cols;

  // Wallpapers array sized to current total (grows with '' / shrinks by slicing)
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
    // Preservar todos los campos del config al guardar cambios de cuadrícula/fondos.
    const next: DesktopConfig = {
      ...config,
      rows,
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
        <DialogTitle>Propiedades del escritorio</DialogTitle>

        <DialogContent dividers>

          {/* ── Grid size ─────────────────────────────────────────────── */}
          <Typography variant="subtitle2" sx={{
            mb: 1.5, fontWeight: 600, textTransform: 'uppercase',
            fontSize: '0.72rem', color: 'text.secondary', letterSpacing: '0.05em',
          }}>
            Tamaño de la cuadrícula
          </Typography>

          <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
            <TextField
              label="Filas"
              type="number"
              size="small"
              value={rows}
              onChange={e => setRows(clamp(Number(e.target.value), 1, 8))}
              inputProps={{ min: 1, max: 8 }}
              sx={{ width: '8rem' }}
            />
            <TextField
              label="Columnas"
              type="number"
              size="small"
              value={cols}
              onChange={e => setCols(clamp(Number(e.target.value), 1, 8))}
              inputProps={{ min: 1, max: 8 }}
              sx={{ width: '8rem' }}
            />
          </Box>

          {/* ── Wallpapers ────────────────────────────────────────────── */}
          <Typography variant="subtitle2" sx={{
            mb: 1.5, fontWeight: 600, textTransform: 'uppercase',
            fontSize: '0.72rem', color: 'text.secondary', letterSpacing: '0.05em',
          }}>
            Fondos de pantalla — {total} escritorio{total !== 1 ? 's' : ''}
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

                {/* Editable path field */}
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

                {/* Browse button */}
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

      {/* Cloud image picker — shared single instance */}
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
