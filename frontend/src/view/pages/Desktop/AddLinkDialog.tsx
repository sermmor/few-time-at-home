import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { DesktopLink } from '../../../core/actions/desktop';
import { UnfurlActions } from '../../../core/actions/unfurl';

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  onAccept:  (url: string, name: string) => void;
  /**
   * Si se proporciona, el diálogo está en modo "editar nombre":
   * la URL es de solo lectura y no se llama a unfurl.
   */
  editLink?: DesktopLink;
}

// ── Constantes ─────────────────────────────────────────────────────────────────
const UNFURL_DEBOUNCE_MS = 800;
const UNFURL_LOAD_TIME   = 2000;

// ── Componente ─────────────────────────────────────────────────────────────────
export const AddLinkDialog: React.FC<Props> = ({
  isOpen, onClose, onAccept, editLink,
}) => {
  const isEditMode = !!editLink;

  const [url,       setUrl      ] = React.useState('');
  const [name,      setName     ] = React.useState('');
  const [loading,   setLoading  ] = React.useState(false);
  const [urlError,  setUrlError ] = React.useState('');

  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Sincronizar cuando el diálogo se abre
  React.useEffect(() => {
    if (!isOpen) return;
    if (isEditMode && editLink) {
      setUrl(editLink.url);
      setName(editLink.name);
    } else {
      setUrl('');
      setName('');
    }
    setLoading(false);
    setUrlError('');
    clearTimeout(timerRef.current);
  }, [isOpen]); // Solo al abrir/cerrar

  // ── Unfurl al cambiar la URL (solo en modo "añadir") ─────────────────────────
  const handleUrlChange = (value: string) => {
    setUrl(value);
    setName('');
    setUrlError('');
    clearTimeout(timerRef.current);

    if (!value.trim()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => {
      UnfurlActions.getUnfurl({ urlList: [value.trim()], loadTime: UNFURL_LOAD_TIME })
        .then(allData => {
          const title = allData?.[0]?.title ?? '';
          setName(title);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
          setUrlError('No se pudo obtener el título. Escribe el nombre manualmente.');
        });
    }, UNFURL_DEBOUNCE_MS);
  };

  // ── Aceptar ──────────────────────────────────────────────────────────────────
  const handleAccept = () => {
    const finalUrl  = isEditMode ? editLink!.url : url.trim();
    const finalName = name.trim() || finalUrl;
    onAccept(finalUrl, finalName);
    onClose();
  };

  const canAccept = !loading && (isEditMode ? name.trim().length > 0 : url.trim().length > 0);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinkIcon sx={{ color: '#3b82f6' }} />
        {isEditMode ? 'Editar nombre del enlace' : 'Añadir enlace'}
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>

        {/* ── URL ─────────────────────────────────────────────────────────── */}
        {isEditMode ? (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600,
              textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>
              URL
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 0.5, p: '8px 12px', borderRadius: 1, backgroundColor: 'action.hover',
                    fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}
            >
              {editLink?.url}
            </Typography>
          </Box>
        ) : (
          <TextField
            label="URL"
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="https://ejemplo.com"
            fullWidth
            autoFocus
            size="small"
            inputProps={{ spellCheck: false }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* ── Nombre ──────────────────────────────────────────────────────── */}
        <TextField
          label="Nombre"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={loading ? 'Obteniendo título…' : 'Nombre del enlace'}
          fullWidth
          size="small"
          disabled={loading && !isEditMode}
          autoFocus={isEditMode}
          helperText={urlError || (loading && !isEditMode ? 'Consultando el título del enlace…' : '')}
          FormHelperTextProps={{ sx: { color: urlError ? 'error.main' : 'text.secondary' } }}
          InputProps={{
            endAdornment: loading && !isEditMode ? (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : undefined,
          }}
        />

      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleAccept}
          disabled={!canAccept}
        >
          {isEditMode ? 'Guardar' : 'Añadir'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
