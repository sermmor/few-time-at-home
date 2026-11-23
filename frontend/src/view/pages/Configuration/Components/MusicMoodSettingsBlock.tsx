// Ajustes de "Música por ánimos" (sección Otros de /configuration): horario del
// análisis nocturno y rutas de la Cloud que no se analizan. Tiene su propio botón
// de guardar porque va a data/config/musicMood.json, no a configuration.json.
import React from "react";
import {
  Alert, Box, Button, Chip, IconButton, LinearProgress, MenuItem, TextField, Tooltip, Typography,
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { MusicMoodActions } from "../../../../core/actions/musicMood";
import { MusicMoodSettings, MusicMoodStatus } from "../../../../data-model/musicMood";
import { ModalCloudBrowser } from "../../../molecules/ModalCloudBrowser/ModalCloudBrowser";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const STATUS_POLL_MS = 5000;

const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** Igual que en el backend: "/cloud/x/" o "cloud\x" -> "cloud/x". */
const normalizeCloudPath = (p: string) =>
  p.replace(/\\/g, '/').split('/').filter(part => part !== '' && part !== '.').join('/');

interface Props {
  rowSx: object;
  fieldSx: object;
}

export const MusicMoodSettingsBlock: React.FC<Props> = ({ rowSx, fieldSx }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<MusicMoodSettings | null>(null);
  const [newPath, setNewPath] = React.useState('');
  const [isBrowserOpen, setIsBrowserOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; isError: boolean } | null>(null);
  const [status, setStatus] = React.useState<MusicMoodStatus | null>(null);

  const refreshStatus = React.useCallback(() => {
    MusicMoodActions.getStatus().then(s => { if (s && typeof s.state === 'string') setStatus(s); });
  }, []);

  React.useEffect(() => {
    MusicMoodActions.getSettings().then(s => {
      if (s && Array.isArray(s.ignoredPaths)) setSettings(s);
    });
    refreshStatus();
  }, [refreshStatus]);

  // Mientras analiza, refresca el progreso
  React.useEffect(() => {
    if (!status || status.state === 'idle') return;
    const timer = setTimeout(refreshStatus, STATUS_POLL_MS);
    return () => clearTimeout(timer);
  }, [status, refreshStatus]);

  if (!settings) return null;

  const addPath = (raw: string) => {
    const path = normalizeCloudPath(raw);
    if (path === '' || settings.ignoredPaths.includes(path)) return;
    setSettings({ ...settings, ignoredPaths: [...settings.ignoredPaths, path] });
    setNewPath('');
  };

  const removePath = (path: string) =>
    setSettings({ ...settings, ignoredPaths: settings.ignoredPaths.filter(p => p !== path) });

  const save = () => {
    setIsSaving(true);
    setMessage(null);
    MusicMoodActions.saveSettings(settings).then(res => {
      setIsSaving(false);
      if (res?.ok && res.settings) {
        setSettings(res.settings);
        setMessage({ text: t('others.musicMood.saved'), isError: false });
      } else {
        setMessage({ text: t('others.musicMood.saveError'), isError: true });
      }
    });
  };

  const analyzeNow = () => MusicMoodActions.analyzeNow().then(() => setTimeout(refreshStatus, 500));
  const stop = () => MusicMoodActions.stop().then(() => setTimeout(refreshStatus, 500));

  const isRunning = !!status && status.state !== 'idle';
  const progress = status && status.pending + status.done > 0 && status.state === 'analyzing'
    ? (100 * status.done) / (status.pending + status.done)
    : undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: { xs: '15.5rem', sm: '27rem', md: '50rem' } }}>
      <Typography variant="h6" sx={{ textTransform: 'uppercase', marginTop: '1rem' }}>
        {t('others.musicMood.title')}
      </Typography>
      <Typography variant="body2">{t('others.musicMood.description')}</Typography>

      {/* Horario */}
      <Box sx={rowSx}>
        <Typography variant="body1">{t('others.musicMood.schedule')}</Typography>
        <TextField
          select variant="standard" sx={fieldSx}
          label={t('others.musicMood.startHour')}
          value={settings.startHour}
          onChange={evt => setSettings({ ...settings, startHour: +evt.target.value })}
        >
          {HOURS.map(h => <MenuItem key={h} value={h}>{formatHour(h)}</MenuItem>)}
        </TextField>
        <TextField
          select variant="standard" sx={fieldSx}
          label={t('others.musicMood.endHour')}
          value={settings.endHour}
          onChange={evt => setSettings({ ...settings, endHour: +evt.target.value })}
        >
          {HOURS.map(h => <MenuItem key={h} value={h}>{formatHour(h)}</MenuItem>)}
        </TextField>
      </Box>
      {settings.startHour === settings.endHour && (
        <Alert severity="info">{t('others.musicMood.noNightlyRun')}</Alert>
      )}

      {/* Rutas ignoradas */}
      <Typography variant="body1">{t('others.musicMood.ignoredPaths')}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {settings.ignoredPaths.length === 0 && (
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{t('others.musicMood.noIgnoredPaths')}</Typography>
        )}
        {settings.ignoredPaths.map(path => (
          <Chip
            key={path}
            label={path}
            onDelete={() => removePath(path)}
            deleteIcon={<DeleteIcon titleAccess={t('others.musicMood.removePath')} />}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <TextField
          variant="standard"
          label={t('others.musicMood.newPath')}
          placeholder="cloud/01_CONVERTIDOS"
          value={newPath}
          sx={{ flex: '1 1 14rem', minWidth: 0 }}
          onChange={evt => setNewPath(evt.target.value)}
          onKeyDown={evt => { if (evt.key === 'Enter') addPath(newPath); }}
        />
        <Tooltip title={t('others.musicMood.addPath')}>
          <span>
            <IconButton onClick={() => addPath(newPath)} disabled={normalizeCloudPath(newPath) === ''}>
              <AddIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('others.musicMood.pickFolder')}>
          <IconButton onClick={() => setIsBrowserOpen(true)}>
            <FolderOpenIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={save} disabled={isSaving}>
          {t('others.musicMood.save')}
        </Button>
        {message && <Alert severity={message.isError ? 'error' : 'success'}>{message.text}</Alert>}
      </Box>

      {/* Estado del análisis */}
      {status && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Typography variant="body2">
            {t('others.musicMood.statusSummary', {
              analyzed: status.analyzed, total: status.totalFiles, pending: status.pending, failed: status.failed,
            })}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t(`others.musicMood.state.${status.state}`)}
            {status.state === 'paused' && status.pausedBy ? ` (${status.pausedBy})` : ''}
            {status.state === 'analyzing' ? ` ${status.done}/${status.pending + status.done}` : ''}
          </Typography>
          {progress !== undefined && <LinearProgress variant="determinate" value={progress} />}
          {status.current && isRunning && (
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{status.current}</Typography>
          )}
          <Box sx={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={analyzeNow} disabled={isRunning}>
              {t('others.musicMood.analyzeNow')}
            </Button>
            <Button variant="outlined" color="warning" onClick={stop} disabled={!isRunning}>
              {t('others.musicMood.stop')}
            </Button>
          </Box>
        </Box>
      )}

      <ModalCloudBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onAccept={path => { addPath(path); setIsBrowserOpen(false); }}
        title={t('others.musicMood.pickFolder')}
      />
    </Box>
  );
};
