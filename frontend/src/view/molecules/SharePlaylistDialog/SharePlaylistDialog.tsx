import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, RadioGroup,
  FormControlLabel, Radio, CircularProgress, Divider,
  IconButton, Link,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CloudItem } from '../../../data-model/cloud';
import {
  sharePlaylistActions,
  CreatePlaylistResponse,
  PlaylistPlatform,
} from '../../../core/actions/sharePlaylist';
import { playlistOAuthStartEndpoint } from '../../../core/urls-and-end-points';

// ─── Styles ───────────────────────────────────────────────────────────────────

const DARK_BG  = '#12121e';
const PANEL_BG = '#1a1a2e';
const BORDER   = '#2e2e4a';
const GREEN    = '#1db954';
const MUTED    = '#7a7a9a';
const TEXT     = '#d0d0e8';

const inputSx = {
  '& .MuiInputBase-root': { color: TEXT },
  '& .MuiInputLabel-root': { color: MUTED },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4a4a6a' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: GREEN },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthStatus = 'idle' | 'pending' | 'ok' | 'error';
type CreateStatus = 'idle' | 'creating' | 'done' | 'error';

interface TokenMap {
  youtube: string;
  spotify: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open:     boolean;
  onClose:  () => void;
  playlist: CloudItem[];
}

export const SharePlaylistDialog: React.FC<Props> = ({ open, onClose, playlist }) => {
  const [platform,     setPlatform]     = useState<PlaylistPlatform>('spotify');
  const [name,         setName]         = useState('');
  const [description,  setDescription]  = useState('');
  const [tokens,       setTokens]       = useState<TokenMap>({ youtube: '', spotify: '' });
  const [authStatus,   setAuthStatus]   = useState<Record<PlaylistPlatform, AuthStatus>>({
    youtube: 'idle', spotify: 'idle',
  });
  const [createStatus, setCreateStatus] = useState<CreateStatus>('idle');
  const [result,       setResult]       = useState<CreatePlaylistResponse | null>(null);
  const [createError,  setCreateError]  = useState('');

  // Reset state when dialog reopens
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setCreateStatus('idle');
      setResult(null);
      setCreateError('');
    }
  }, [open]);

  // ── OAuth popup ─────────────────────────────────────────────────────────────

  const handleOAuth = useCallback(() => {
    setAuthStatus(prev => ({ ...prev, [platform]: 'pending' }));

    const popup = window.open(
      playlistOAuthStartEndpoint(platform),
      `oauth_${platform}`,
      'width=520,height=680,scrollbars=yes,resizable=yes',
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'playlist_oauth' || event.data?.platform !== platform) return;
      window.removeEventListener('message', handleMessage);
      clearInterval(closedCheck);

      if (event.data.token) {
        setTokens(prev => ({ ...prev, [platform]: event.data.token }));
        setAuthStatus(prev => ({ ...prev, [platform]: 'ok' }));
      } else {
        setAuthStatus(prev => ({ ...prev, [platform]: 'error' }));
      }
    };

    window.addEventListener('message', handleMessage);

    // Detect if the user closed the popup without completing auth
    const closedCheck = setInterval(() => {
      if (popup?.closed) {
        clearInterval(closedCheck);
        window.removeEventListener('message', handleMessage);
        setAuthStatus(prev =>
          prev[platform] === 'pending' ? { ...prev, [platform]: 'idle' } : prev
        );
      }
    }, 800);
  }, [platform]);

  // ── Playlist creation ───────────────────────────────────────────────────────

  const handleCreate = async () => {
    setCreateStatus('creating');
    setResult(null);
    setCreateError('');
    try {
      const res = await sharePlaylistActions.createPlaylist({
        platform,
        name,
        description,
        songs: playlist.map(item => item.name),
        token: tokens[platform],
      });
      setResult(res);
      setCreateStatus('done');
    } catch {
      setCreateError('Error al conectar con el servidor. Comprueba la consola.');
      setCreateStatus('error');
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const currentAuthStatus = authStatus[platform];
  const isAuthenticated   = currentAuthStatus === 'ok';
  const canCreate         = isAuthenticated && !!name.trim() && createStatus !== 'creating';
  const isCreating        = createStatus === 'creating';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={createStatus === 'creating' ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { backgroundColor: DARK_BG, color: TEXT, border: `1px solid ${BORDER}` } }}
    >
      <DialogTitle sx={{ borderBottom: `1px solid ${BORDER}`, pb: 1.5 }}>
        <Typography variant="h6" sx={{ color: TEXT, fontWeight: 700, fontSize: '1rem' }}>
          Compartir lista de reproducción
        </Typography>
        <Typography variant="caption" sx={{ color: MUTED }}>
          {playlist.length} {playlist.length === 1 ? 'canción' : 'canciones'} · se buscarán por nombre de fichero
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* ── Platform selection ── */}
        <Box>
          <Typography variant="caption" sx={{ color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Plataforma
          </Typography>
          <RadioGroup
            row
            value={platform}
            onChange={e => {
              setPlatform(e.target.value as PlaylistPlatform);
              setCreateStatus('idle');
              setResult(null);
            }}
            sx={{ mt: 0.5, gap: 1 }}
          >
            {(['spotify', 'youtube'] as PlaylistPlatform[]).map(p => (
              <FormControlLabel
                key={p}
                value={p}
                control={<Radio size="small" sx={{ color: MUTED, '&.Mui-checked': { color: GREEN } }} />}
                label={
                  <Typography sx={{ color: p === platform ? GREEN : TEXT, fontSize: '0.9rem', fontWeight: p === platform ? 600 : 400 }}>
                    {p === 'spotify' ? '🎵 Spotify' : '▶️ YouTube'}
                  </Typography>
                }
              />
            ))}
          </RadioGroup>
        </Box>

        {/* ── Name & description ── */}
        <TextField
          label="Nombre de la lista"
          value={name}
          onChange={e => setName(e.target.value)}
          size="small"
          fullWidth
          disabled={isCreating}
          sx={inputSx}
        />
        <TextField
          label="Descripción (opcional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          size="small"
          fullWidth
          multiline
          minRows={2}
          disabled={isCreating}
          sx={inputSx}
        />

        <Divider sx={{ borderColor: BORDER }} />

        {/* ── OAuth section ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {isAuthenticated ? (
            <>
              <CheckCircleOutlineIcon sx={{ color: GREEN, fontSize: '1.1rem' }} />
              <Typography variant="body2" sx={{ color: GREEN, fontWeight: 600 }}>
                Autenticado con {platform === 'spotify' ? 'Spotify' : 'Google'}
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={handleOAuth}
                sx={{ color: MUTED, fontSize: '0.72rem', textTransform: 'none', ml: 'auto' }}
              >
                Cambiar cuenta
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                size="small"
                onClick={handleOAuth}
                disabled={currentAuthStatus === 'pending'}
                startIcon={currentAuthStatus === 'pending' ? <CircularProgress size={14} color="inherit" /> : undefined}
                sx={{
                  backgroundColor: platform === 'spotify' ? '#1db954' : '#c4302b',
                  '&:hover': { backgroundColor: platform === 'spotify' ? '#1ed760' : '#a82420' },
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {currentAuthStatus === 'pending'
                  ? 'Esperando autorización…'
                  : `Autorizar con ${platform === 'spotify' ? 'Spotify' : 'Google'}`}
              </Button>
              {currentAuthStatus === 'error' && (
                <Typography variant="caption" sx={{ color: '#e05050' }}>
                  Error de autenticación. Inténtalo de nuevo.
                </Typography>
              )}
            </>
          )}
        </Box>

        {/* ── Result panel ── */}
        {createStatus === 'done' && result && (
          <Box sx={{ backgroundColor: PANEL_BG, borderRadius: 1, p: 1.5, border: `1px solid ${BORDER}` }}>
            <Typography variant="body2" sx={{ color: GREEN, fontWeight: 700, mb: 0.5 }}>
              ✅ Lista creada — {result.totalAdded} canciones añadidas
            </Typography>
            <Link href={result.url} target="_blank" rel="noopener noreferrer"
              sx={{ color: '#88aaff', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 0.4 }}>
              Abrir en {platform === 'spotify' ? 'Spotify' : 'YouTube'}
              <OpenInNewIcon sx={{ fontSize: '0.8rem' }} />
            </Link>
            {(result.notFound?.length ?? 0) > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ color: MUTED }}>
                  No encontradas ({result.notFound.length}):
                </Typography>
                <Box sx={{ maxHeight: '6rem', overflowY: 'auto', mt: 0.5 }}>
                  {result.notFound.map(s => (
                    <Typography key={s} variant="caption" sx={{ display: 'block', color: '#c87050', fontSize: '0.72rem' }}>
                      • {s}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {createStatus === 'error' && (
          <Typography variant="body2" sx={{ color: '#e05050' }}>❌ {createError}</Typography>
        )}

      </DialogContent>

      <DialogActions sx={{ borderTop: `1px solid ${BORDER}`, px: 2, py: 1.5, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={isCreating}
          sx={{ color: MUTED, textTransform: 'none' }}
        >
          {createStatus === 'done' ? 'Cerrar' : 'Cancelar'}
        </Button>
        {createStatus !== 'done' && (
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!canCreate}
            startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              backgroundColor: GREEN,
              '&:hover': { backgroundColor: '#1ed760' },
              '&:disabled': { backgroundColor: '#1a3a28', color: '#3a6a48' },
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {isCreating ? 'Creando…' : 'Crear lista'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
