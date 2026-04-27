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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const [keys, setKeys] = React.useState<KeysData | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [clearingAlerts, setClearingAlerts] = React.useState(false);
  const [clearAlertsResult, setClearAlertsResult] = React.useState<'ok' | 'error' | null>(null);
  const [backupWarning, setBackupWarning] = React.useState(false);

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

  // Clears the Drive warning as soon as the user fills any credential field.
  const setDriveField = (field: keyof KeysData) => (value: string) => {
    setBackupWarning(false);
    set(field)(value);
  };

  /**
   * Handles the "Deshabilitar backup automático" toggle.
   * Enabling backup (is_backup_disabled → false) requires the three Google
   * Drive credential fields to be filled; if any is missing the toggle is
   * blocked and a warning is shown instead.
   */
  const handleBackupToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isDisabling = e.target.checked; // checked = disabled
    if (!isDisabling && keys) {
      // User is trying to ENABLE backup — validate Drive credentials first.
      const { google_drive_client_id, google_drive_client_secret, google_drive_refresh_token } = keys;
      if (!google_drive_client_id || !google_drive_client_secret || !google_drive_refresh_token) {
        setBackupWarning(true);
        return; // block the change
      }
    }
    setBackupWarning(false);
    set('is_backup_disabled')(e.target.checked);
  };

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
        <Typography>{t('apis.sectionTitle')}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ ...sectionBoxStyle, background: `rgba(255,255,255,${alphas.general})` }}>

          {/* ── Telegram ─────────────────────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>{t('apis.telegram')}</Typography>

          <Box sx={rowStyle}>
            <FormControlLabel
              label={t('apis.connectTelegram')}
              control={
                <Switch
                  checked={keys.connect_to_telegram}
                  onChange={e => set('connect_to_telegram')(e.target.checked)}
                />
              }
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.botToken')}</Typography>
            <PasswordField
              label={t('apis.botTokenLabel')}
              value={keys.telegram_bot_token}
              onChange={set('telegram_bot_token') as (v: string) => void}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.telegramUser')}</Typography>
            <TextField
              label={t('apis.usernameLabel')}
              variant="standard"
              value={keys.username_client}
              sx={fieldStyle}
              onChange={e => set('username_client')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.sessionPassword')}</Typography>
            <PasswordField
              label={t('apis.tokenPassLabel')}
              value={keys.token_pass}
              onChange={set('token_pass') as (v: string) => void}
            />
          </Box>

          {/* ── Email ────────────────────────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>{t('apis.email')}</Typography>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.emailService')}</Typography>
            <TextField
              label={t('apis.emailServiceLabel')}
              variant="standard"
              value={keys.email_service}
              sx={fieldStyle}
              onChange={e => set('email_service')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.emailUser')}</Typography>
            <TextField
              label={t('apis.emailUserLabel')}
              variant="standard"
              value={keys.email_user}
              sx={fieldStyle}
              onChange={e => set('email_user')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.emailPassword')}</Typography>
            <PasswordField
              label={t('apis.emailPasswordLabel')}
              value={keys.email_pass}
              onChange={set('email_pass') as (v: string) => void}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.emailPrelude')}</Typography>
            <TextField
              label={t('apis.emailPreludeLabel')}
              variant="standard"
              value={keys.email_prelude}
              sx={fieldStyle}
              onChange={e => set('email_prelude')(e.target.value)}
            />
          </Box>

          {/* ── YouTube playlist ─────────────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>{t('apis.youtubePlaylist')}</Typography>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.clientId')}</Typography>
            <TextField
              label={t('apis.youtubeClientIdLabel')}
              variant="standard"
              value={keys.youtube_playlist_client_id}
              sx={fieldStyle}
              onChange={e => set('youtube_playlist_client_id')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.clientSecret')}</Typography>
            <PasswordField
              label={t('apis.youtubeClientSecretLabel')}
              value={keys.youtube_playlist_client_secret}
              onChange={set('youtube_playlist_client_secret') as (v: string) => void}
            />
          </Box>

          {/* ── Spotify playlist ─────────────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>{t('apis.spotifyPlaylist')}</Typography>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.clientId')}</Typography>
            <TextField
              label={t('apis.spotifyClientIdLabel')}
              variant="standard"
              value={keys.spotify_playlist_client_id}
              sx={fieldStyle}
              onChange={e => set('spotify_playlist_client_id')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.clientSecret')}</Typography>
            <PasswordField
              label={t('apis.spotifyClientSecretLabel')}
              value={keys.spotify_playlist_client_secret}
              onChange={set('spotify_playlist_client_secret') as (v: string) => void}
            />
          </Box>

          {/* ── Supabase (notificationsApp) ──────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>{t('apis.supabase')}</Typography>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.projectUrl')}</Typography>
            <TextField
              label="https://xxxx.supabase.co"
              variant="standard"
              value={keys.supabase_url}
              sx={fieldStyle}
              onChange={e => set('supabase_url')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.serviceRoleKey')}</Typography>
            <PasswordField
              label={t('apis.serviceRoleKeyLabel')}
              value={keys.supabase_service_key}
              onChange={set('supabase_service_key') as (v: string) => void}
            />
          </Box>

          <Box sx={{ ...rowStyle, alignItems: 'center', gap: '1rem' }}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.alertsTable')}</Typography>
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
                : t('apis.cleanAlerts')}
            </Button>
            {clearAlertsResult === 'ok'    && <Typography sx={{ color: '#00ffe7', fontFamily: 'monospace', fontSize: '0.8rem' }}>{t('apis.cleanOk')}</Typography>}
            {clearAlertsResult === 'error' && <Typography sx={{ color: '#ff00cc', fontFamily: 'monospace', fontSize: '0.8rem' }}>{t('apis.cleanError')}</Typography>}
          </Box>

          {/* ── Google Drive (backups) ───────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>{t('apis.googleDrive')}</Typography>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.clientId')}</Typography>
            <TextField
              label={t('apis.oauthClientId')}
              variant="standard"
              value={keys.google_drive_client_id}
              sx={fieldStyle}
              onChange={e => setDriveField('google_drive_client_id')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.clientSecret')}</Typography>
            <PasswordField
              label={t('apis.oauthClientSecret')}
              value={keys.google_drive_client_secret}
              onChange={setDriveField('google_drive_client_secret')}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.refreshToken')}</Typography>
            <PasswordField
              label={t('apis.refreshTokenLabel')}
              value={keys.google_drive_refresh_token}
              onChange={setDriveField('google_drive_refresh_token')}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>
              {t('apis.folderId')}
              <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                {t('apis.folderIdHelper')}
              </Typography>
            </Typography>
            <TextField
              label={t('apis.folderIdLabel')}
              variant="standard"
              value={keys.google_drive_folder_id}
              sx={fieldStyle}
              onChange={e => set('google_drive_folder_id')(e.target.value)}
            />
          </Box>

          <Box sx={rowStyle}>
            <Typography variant="body1" sx={labelStyle}>{t('apis.backupPassword')}</Typography>
            <PasswordField
              label={t('apis.backupPasswordLabel')}
              value={keys.backup_password}
              onChange={set('backup_password') as (v: string) => void}
            />
          </Box>

          {/* ── App ──────────────────────────────────────────────────── */}
          <Typography variant="h6" sx={groupTitleStyle}>{t('apis.app')}</Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <FormControlLabel
              label={t('apis.disableAutoBackup')}
              control={
                <Switch
                  checked={keys.is_backup_disabled}
                  onChange={handleBackupToggle}
                />
              }
            />
            {backupWarning && (
              <Box sx={{
                padding:      '0.6rem 0.9rem',
                border:       '1px solid #ff00cc',
                borderRadius: '4px',
                background:   'rgba(255,0,204,0.06)',
                maxWidth:     '36rem',
              }}>
                <Typography variant="body2" sx={{ color: '#ff00cc', fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.6 }}>
                  {t('apis.autoBackupWarning')}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={rowStyle}>
            <FormControlLabel
              label={t('apis.devMode')}
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
              {saving ? t('apis.saving') : t('apis.save')}
            </Button>
          </Box>

        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
