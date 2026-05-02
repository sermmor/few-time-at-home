import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  SxProps,
  Theme,
} from '@mui/material';
import CastIcon          from '@mui/icons-material/Cast';
import CastConnectedIcon from '@mui/icons-material/CastConnected';
import StopIcon          from '@mui/icons-material/Stop';
import ClearIcon         from '@mui/icons-material/Clear';
import OpenInNewIcon     from '@mui/icons-material/OpenInNew';
import UpdateIcon        from '@mui/icons-material/Update';
import LiveTvIcon        from '@mui/icons-material/LiveTv';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { YoutubePageActions, YoutubeVersionInfo } from '../../../core/actions/youtube';
import {
  castDevicesEndpoint,
  castStartEndpoint,
  castStopEndpoint,
} from '../../../core/urls-and-end-points';
import { WebSocketClientService } from '../../../service/webSocketService/webSocketClient.service';
import { useConfiguredDialogAlphas } from '../../../core/context/DialogAlphasContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CastDevice {
  name: string;
  ip:   string;
  port: number;
}

interface CastState {
  playerState: string;
  castingTo:   string | null;
  idleReason?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const isValidYoutubeUrl = (url: string): boolean =>
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/.test(url);

const extractVideoId = (url: string): string | null => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
};

// ── Styles ────────────────────────────────────────────────────────────────────

const getPageStyle = (alpha: number): SxProps<Theme> => ({
  display:        'flex',
  flexDirection:  'column',
  gap:            '1.5rem',
  alignItems:     'center',
  justifyContent: 'flex-start',
  fontFamily:     'Roboto, Helvetica, Arial, sans-serif',
  backgroundColor: `rgba(245, 245, 245, ${alpha})`,
  paddingBottom:  '2rem',
  paddingTop:     '1.5rem',
  minHeight:      '80vh',
});

// ── Component ─────────────────────────────────────────────────────────────────

export const YouTubePage = (): JSX.Element => {
  const { t }      = useTranslation();
  const alphas     = useConfiguredDialogAlphas();
  const navigate   = useNavigate();

  // ── URL field ───────────────────────────────────────────────────────────────
  const [url,        setUrl       ] = React.useState('');
  const urlValid = isValidYoutubeUrl(url);

  // ── Cast devices ────────────────────────────────────────────────────────────
  const [devices,      setDevices     ] = React.useState<CastDevice[]>([]);
  const [discovering,  setDiscovering ] = React.useState(false);
  const [devicesShown, setDevicesShown] = React.useState(false);

  // ── Cast / resolve state ────────────────────────────────────────────────────
  const [resolving,  setResolving ] = React.useState(false);
  const [castState,  setCastState ] = React.useState<CastState | null>(null);
  const isCasting = castState !== null && castState.playerState !== 'IDLE';

  // ── Version info ────────────────────────────────────────────────────────────
  const [versionInfo,    setVersionInfo  ] = React.useState<YoutubeVersionInfo | null>(null);
  const [versionLoading, setVersionLoading] = React.useState(true);

  // ── Snackbar ────────────────────────────────────────────────────────────────
  const [snackOpen,    setSnackOpen   ] = React.useState(false);
  const [snackMsg,     setSnackMsg    ] = React.useState('');
  const [snackSeverity,setSnackSeverity] = React.useState<'success' | 'error' | 'info'>('info');

  const showSnack = (msg: string, sev: typeof snackSeverity = 'info') => {
    setSnackMsg(msg);
    setSnackSeverity(sev);
    setSnackOpen(true);
  };

  // ── Load version on mount ───────────────────────────────────────────────────
  React.useEffect(() => {
    YoutubePageActions.getVersionInfo()
      .then(info => setVersionInfo(info))
      .catch(() => {/* version fetch is optional */})
      .finally(() => setVersionLoading(false));
  }, []);

  // ── WebSocket — listen for cast status updates ──────────────────────────────
  React.useEffect(() => {
    const ws = WebSocketClientService.Instance;
    if (!ws) return;
    const handler = (data: any) => {
      if (!data?.cast) return;
      setCastState(data.cast as CastState);
      if ((data.cast as CastState).playerState === 'IDLE') {
        // Media finished or was stopped
        setCastState(null);
      }
    };
    ws.subscribeToUpdates(handler as any);
    return () => {
      ws.onUpdateData = ws.onUpdateData.filter((h: any) => h !== handler);
    };
  }, []);

  // ── Discover cast devices ───────────────────────────────────────────────────
  const discoverDevices = async () => {
    setDiscovering(true);
    setDevicesShown(true);
    try {
      const res     = await fetch(castDevicesEndpoint());
      const devices = await res.json() as CastDevice[];
      setDevices(Array.isArray(devices) ? devices : []);
    } catch {
      showSnack(t('youtube.errorDiscovery'), 'error');
    } finally {
      setDiscovering(false);
    }
  };

  // ── Cast to device ──────────────────────────────────────────────────────────
  const castToDevice = async (device: CastDevice) => {
    if (!urlValid) return;
    setResolving(true);
    showSnack(t('youtube.resolving'), 'info');
    try {
      const result = await YoutubePageActions.resolveUrl(url);
      if (!result.streamUrl) throw new Error(result.error ?? 'Empty stream URL');

      await fetch(castStartEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceIp:    device.ip,
          devicePort:  device.port,
          deviceName:  device.name,
          videoUrl:    result.streamUrl,
          contentType: result.contentType,
        }),
      });

      setCastState({ playerState: 'PLAYING', castingTo: device.name });
      showSnack(`${t('youtube.castingTo')} ${device.name}`, 'success');
    } catch (err: any) {
      showSnack(`${t('youtube.errorCast')}: ${err?.message ?? err}`, 'error');
    } finally {
      setResolving(false);
    }
  };

  // ── Stop cast ───────────────────────────────────────────────────────────────
  const stopCast = async () => {
    try {
      await fetch(castStopEndpoint(), { method: 'POST' });
    } catch {/* ignore */}
    setCastState(null);
    showSnack(t('youtube.castStopped'), 'info');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={getPageStyle(alphas.general)}>

      {/* ── Title ─────────────────────────────────────────────────────────── */}
      <Typography variant="h5" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
        YouTube
      </Typography>

      {/* ── youtubei.js version badge + update alert ───────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        {versionLoading ? (
          <CircularProgress size={16} />
        ) : versionInfo ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('youtube.libVersion')}
              </Typography>
              <Chip
                label={`youtubei.js v${versionInfo.installed}`}
                size="small"
                variant="outlined"
                color={versionInfo.hasUpdate ? 'warning' : 'default'}
              />
              <Tooltip title={t('youtube.githubReleasesTitle')}>
                <IconButton
                  size="small"
                  component="a"
                  href="https://github.com/LuanRT/YouTube.js/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
                </IconButton>
              </Tooltip>
            </Box>
            {versionInfo.hasUpdate && (
              <Alert
                icon={<UpdateIcon fontSize="small" />}
                severity="warning"
                sx={{ py: 0, px: 1.5, fontSize: '0.8rem' }}
              >
                {t('youtube.updateAvailable', { latest: versionInfo.latest })}
              </Alert>
            )}
          </>
        ) : null}
      </Box>

      {/* ── URL input ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: '0.75rem', alignItems: 'center', width: '100%', maxWidth: '38rem' }}>
        <TextField
          label={t('youtube.urlLabel')}
          placeholder="https://www.youtube.com/watch?v=..."
          variant="outlined"
          fullWidth
          value={url}
          onChange={e => setUrl(e.target.value)}
          error={url.length > 0 && !urlValid}
          helperText={url.length > 0 && !urlValid ? t('youtube.urlInvalid') : ''}
          InputProps={{
            endAdornment: url ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setUrl('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Cast button */}
        <Button
          variant="contained"
          startIcon={resolving ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : (isCasting ? <CastConnectedIcon /> : <CastIcon />)}
          disabled={!urlValid || resolving}
          onClick={devicesShown ? undefined : discoverDevices}
          sx={{ whiteSpace: 'nowrap', minWidth: '9rem' }}
        >
          {resolving ? t('youtube.resolving') : isCasting ? t('youtube.recasting') : t('youtube.cast')}
        </Button>

        {/* Emitir en vivo button */}
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<LiveTvIcon />}
          disabled={!urlValid}
          onClick={() => {
            const id = extractVideoId(url);
            if (!id) return;
            YoutubePageActions.setLiveVideo(id);
          }}
          sx={{ whiteSpace: 'nowrap', minWidth: '10rem' }}
        >
          {t('youtube.liveEmbed')}
        </Button>

        {/* Stop cast button */}
        {isCasting && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<StopIcon />}
            onClick={stopCast}
            sx={{ whiteSpace: 'nowrap', minWidth: '7rem' }}
          >
            {t('youtube.stop')}
          </Button>
        )}
      </Box>

      {/* Casting status */}
      {isCasting && castState?.castingTo && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CastConnectedIcon sx={{ color: 'success.main', fontSize: '1rem' }} />
          <Typography variant="body2" sx={{ color: 'success.main' }}>
            {t('youtube.nowCasting', { device: castState.castingTo })}
          </Typography>
        </Box>
      )}

      {/* ── Device list ───────────────────────────────────────────────────── */}
      {devicesShown && (
        <Box sx={{ width: '100%', maxWidth: '28rem' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '0.25rem' }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
              {t('youtube.devices')}
            </Typography>
            <Button size="small" variant="text" onClick={discoverDevices} disabled={discovering}>
              {t('youtube.refresh')}
            </Button>
          </Box>

          {discovering ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.75rem', py: '0.75rem', justifyContent: 'center' }}>
              <CircularProgress size={18} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('youtube.discovering')}
              </Typography>
            </Box>
          ) : devices.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: '0.75rem' }}>
              {t('youtube.noDevices')}
            </Typography>
          ) : (
            <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden' }}>
              {devices.map(device => (
                <ListItem key={device.ip} disablePadding>
                  <ListItemButton
                    disabled={!urlValid || resolving}
                    onClick={() => castToDevice(device)}
                    sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                  >
                    <ListItemIcon sx={{ minWidth: '36px' }}>
                      <CastIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={device.name}
                      secondary={`${device.ip}:${device.port}`}
                      primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}
                      secondaryTypographyProps={{ fontSize: '0.7rem' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* ── Snackbar ──────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={(_e, reason) => reason !== 'clickaway' && setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 9999 }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="filled"
          sx={{ width: '100%' }}
          elevation={6}
        >
          {snackMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};
