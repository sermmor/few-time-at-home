import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  SxProps,
  Switch,
  TextField,
  Theme,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { KeysActions, KeysData } from '../../../../core/actions/keys';
import { useConfiguredDialogAlphas } from '../../../../core/context/DialogAlphasContext';
import { useConfigurationSnackbar } from './ConfigurationSnackbarContext';
import { supabaseClearAlertsEndpoint } from '../../../../core/urls-and-end-points';

const sectionBoxStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  padding: '1.5rem',
};

const rowStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  gap: '2rem',
  alignItems: 'center',
  justifyContent: 'left',
  minWidth: { xs: '15.5rem', sm: '27rem', md: '50rem' },
};

const groupTitleStyle: SxProps<Theme> = {
  textTransform: 'uppercase',
  marginTop: '0.5rem',
  borderBottom: '1px solid rgba(0,0,0,0.15)',
  paddingBottom: '0.25rem',
  width: '100%',
};

const labelStyle: SxProps<Theme> = {
  minWidth: { xs: 'auto', sm: '16rem' },
};

const fieldStyle: SxProps<Theme> = {
  minWidth: { xs: '15.5rem', sm: '5rem', md: '5rem' },
  flexGrow: 1,
};

// ── Password field with show/hide toggle ────────────────────────────────────
const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  const [show, setShow] = React.useState(false);
  return (
    <TextField
      label={label}
      variant="standard"
      type={show ? 'text' : 'password'}
      value={value}
      sx={fieldStyle}
      onChange={e => onChange(e.target.value)}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShow(s => !s)} edge="end">
              {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

// ── Main component ───────────────────────────────────────────────────────────
export const APIsSection: React.FC = () => {
  const alphas = useConfiguredDialogAlphas();
  const showSaveNotification = useConfigurationSnackbar();

  const [keys, setKeys] = React.useState<KeysData | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [clearingAlerts, setClearingAlerts] = React.useState(false);
  const [clearAlertsResult, setClearAlertsResult] = React.useState<'ok' | 'error' | null>(null);

  const handleClearAlerts = () => {
    setClearingAlerts(true);
    setClearAlertsResult(null);
    fetch(supabaseClearAlertsEndpoint(), { method: 'DELETE' })
      .then(res => setClearAlertsResult(res.ok ? 'ok' : 'error'))
      .catch(() => setClearAlertsResult('error'))
      .finally(() => setClearingAlerts(false));
  };

  React.useEffect(() => {
    KeysActions.getKeys().then(setKeys);
  }, []);

  const set = (field: keyof KeysData) => (value: string | boolean) =>
    setKeys(prev => prev ? { ...prev, [field]: value } : prev);

  const handleSave = () => {
    if (!keys) return;
    setSaving(true);
    KeysActions.saveKeys(keys)
      .then(() => showSaveNotification())
      .finally(() => setSaving(false));
  };

  if (!keys) return null;

  return (
    <Accordion sx={{ opacity: alphas.configurationCards, width: '100%' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>APIs</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ ...sectionBoxStyle, background: `rgba(255,255,255,${alphas.general})` }}>

          {/* ── Telegram ─────────────────────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>Telegram</Typography>

          <Box sx={rowStyle}>
            <FormControlLabel
              label="Conectar con Telegram"
              control={
                <Switch
                  checked={keys.connect_to_telegram}
                  onChange={e => set('connect_to_telegram')(e.target.checked)}
                />
              }
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Bot token</Typography>
            <PasswordField
              label="Telegram bot token"
              value={keys.telegram_bot_token}
              onChange={set('telegram_bot_token') as (v: string) => void}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Usuario (username_client)</Typography>
            <TextField
              label="Username"
              variant="standard"
              value={keys.username_client}
              sx={fieldStyle}
              onChange={e => set('username_client')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Contraseña de sesión (token_pass)</Typography>
            <PasswordField
              label="Token pass"
              value={keys.token_pass}
              onChange={set('token_pass') as (v: string) => void}
            />
          </Box>

          {/* ── Email ────────────────────────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>Email</Typography>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Servicio</Typography>
            <TextField
              label="Email service (e.g. Gmail)"
              variant="standard"
              value={keys.email_service}
              sx={fieldStyle}
              onChange={e => set('email_service')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Usuario</Typography>
            <TextField
              label="Email user"
              variant="standard"
              value={keys.email_user}
              sx={fieldStyle}
              onChange={e => set('email_user')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Contraseña</Typography>
            <PasswordField
              label="Email password"
              value={keys.email_pass}
              onChange={set('email_pass') as (v: string) => void}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Preámbulo (email_prelude)</Typography>
            <TextField
              label="Email prelude"
              variant="standard"
              value={keys.email_prelude}
              sx={fieldStyle}
              onChange={e => set('email_prelude')(e.target.value)}
            />
          </Box>

          {/* ── YouTube playlist ─────────────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>YouTube Playlist</Typography>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Client ID</Typography>
            <TextField
              label="YouTube client ID"
              variant="standard"
              value={keys.youtube_playlist_client_id}
              sx={fieldStyle}
              onChange={e => set('youtube_playlist_client_id')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Client secret</Typography>
            <PasswordField
              label="YouTube client secret"
              value={keys.youtube_playlist_client_secret}
              onChange={set('youtube_playlist_client_secret') as (v: string) => void}
            />
          </Box>

          {/* ── Spotify playlist ─────────────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>Spotify Playlist</Typography>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Client ID</Typography>
            <TextField
              label="Spotify client ID"
              variant="standard"
              value={keys.spotify_playlist_client_id}
              sx={fieldStyle}
              onChange={e => set('spotify_playlist_client_id')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Client secret</Typography>
            <PasswordField
              label="Spotify client secret"
              value={keys.spotify_playlist_client_secret}
              onChange={set('spotify_playlist_client_secret') as (v: string) => void}
            />
          </Box>

          {/* ── Supabase (notificationsApp) ──────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>Supabase — Notifications App</Typography>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Project URL</Typography>
            <TextField
              label="https://xxxx.supabase.co"
              variant="standard"
              value={keys.supabase_url}
              sx={fieldStyle}
              onChange={e => set('supabase_url')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>Service role key</Typography>
            <PasswordField
              label="service_role key (backend only)"
              value={keys.supabase_service_key}
              onChange={set('supabase_service_key') as (v: string) => void}
            />
          </Box>

          <Box sx={{ ...rowStyle, alignItems: 'center', gap: '1rem' }}>
            <Typography variant="body1" sx={labelStyle}>Alerts table</Typography>
            <Button
              variant="outlined"
              disabled={clearingAlerts}
              onClick={handleClearAlerts}
              sx={{
                borderColor: '#ff00cc',
                color:       '#ff00cc',
                fontFamily:  '"Courier New", monospace',
                fontSize:    '0.75rem',
                letterSpacing: '0.05em',
                '&:hover': { borderColor: '#ff00cc', backgroundColor: 'rgba(255,0,204,0.08)' },
                '&.Mui-disabled': { borderColor: 'rgba(255,0,204,0.3)', color: 'rgba(255,0,204,0.3)' },
              }}
            >
              {clearingAlerts
                ? <CircularProgress size={16} sx={{ color: '#ff00cc' }} />
                : 'Clean All Alerts'}
            </Button>
            {clearAlertsResult === 'ok'    && <Typography sx={{ color: '#00ffe7', fontFamily: 'monospace', fontSize: '0.8rem' }}>✓ tabla limpia</Typography>}
            {clearAlertsResult === 'error' && <Typography sx={{ color: '#ff00cc', fontFamily: 'monospace', fontSize: '0.8rem' }}>✗ error al limpiar</Typography>}
          </Box>

          {/* ── App ──────────────────────────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>App</Typography>

          <Box sx={rowStyle}>
            <FormControlLabel
              label="Deshabilitar backup automático"
              control={
                <Switch
                  checked={keys.is_backup_disabled}
                  onChange={e => set('is_backup_disabled')(e.target.checked)}
                />
              }
            />
          </Box>

          <Box sx={rowStyle}>
            <FormControlLabel
              label="Modo desarrollo (logs extra)"
              control={
                <Switch
                  checked={keys.is_dev_mode_enabled}
                  onChange={e => set('is_dev_mode_enabled')(e.target.checked)}
                />
              }
            />
          </Box>

          {/* ── Save button ──────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', justifyContent: 'center', paddingTop: '1rem', paddingBottom: '1rem' }}>
            <Button
              variant="contained"
              sx={{ minWidth: '15.5rem' }}
              disabled={saving}
              onClick={handleSave}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {saving ? 'Guardando…' : 'Save'}
            </Button>
          </Box>

        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
