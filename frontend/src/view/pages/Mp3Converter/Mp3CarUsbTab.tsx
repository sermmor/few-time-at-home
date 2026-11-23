import { Box, Button, IconButton, List, ListItem, ListItemIcon, ListItemText, MenuItem, Select, Typography } from "@mui/material";
import FolderIcon from '@mui/icons-material/Folder';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import CloseIcon from '@mui/icons-material/Close';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import DownloadIcon from '@mui/icons-material/Download';
import StopIcon from '@mui/icons-material/Stop';
import React from "react";
import { useTranslation } from 'react-i18next';
import { CarUsbMp3Actions } from "../../../core/actions/carUsbMp3";
import { CAR_USB_OUTPUT_FOLDER, CarUsbProgress, CarUsbState, carUsbBitrateList } from "../../../data-model/mp3Converter";
import { WebSocketClientService } from "../../../service/webSocketService/webSocketClient.service";
import { CloudSelection, ModalCloudMultiSelect } from "../../molecules/ModalCloudMultiSelect/ModalCloudMultiSelect";
import { MP3_PANEL_WIDTH, Mp3LogArea, Mp3ProgressPanel, formatElapsed, useElapsedSeconds } from "./Mp3Shared";

// Pestaña "Pendrive del coche": selección de carpetas/ficheros de la Cloud -> MP3 de menor
// bitrate -> zip en cloud/01_CONVERTIDOS, con botón para descargarlo.

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.oga', '.opus', '.wma', '.aac', '.aiff', '.aif'];
const isAudioFile = (name: string) => AUDIO_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));

const SELECTION_STORAGE_KEY = 'ftah.carUsb.selection';
const BITRATE_STORAGE_KEY = 'ftah.carUsb.bitrate';
const DEFAULT_BITRATE = 128;
const POLL_MS = 1000;

const RUNNING_STATES: CarUsbState[] = ['scanning', 'converting', 'zipping'];

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
};
const writeStorage = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* almacenamiento no disponible */ }
};

const emptyProgress: CarUsbProgress = {
  type: 'car_usb_progress', state: 'idle', currentFile: '', currentPercent: 0,
  done: 0, total: 0, errors: 0, bitrate: 0, zipPath: '', message: '',
};

export const Mp3CarUsbTab = () => {
  const { t } = useTranslation();
  const [selection, setSelection] = React.useState<CloudSelection[]>(() => {
    const stored = readStorage<CloudSelection[]>(SELECTION_STORAGE_KEY, []);
    return Array.isArray(stored) ? stored.filter(s => typeof s?.path === 'string') : [];
  });
  const [bitrate, setBitrate] = React.useState<number>(() => {
    const stored = readStorage<number>(BITRATE_STORAGE_KEY, DEFAULT_BITRATE);
    return (carUsbBitrateList as readonly number[]).includes(stored) ? stored : DEFAULT_BITRATE;
  });
  const [isBrowserOpen, setIsBrowserOpen] = React.useState(false);
  const [progress, setProgress] = React.useState<CarUsbProgress>(emptyProgress);
  const [log, setLog] = React.useState<string>('');
  const [startError, setStartError] = React.useState<string>('');
  const logNextRef = React.useRef(0);
  const jobIdRef = React.useRef(0);

  const isRunning = RUNNING_STATES.includes(progress.state);
  const elapsedSecs = useElapsedSeconds(isRunning);

  React.useEffect(() => writeStorage(SELECTION_STORAGE_KEY, selection), [selection]);
  React.useEffect(() => writeStorage(BITRATE_STORAGE_KEY, bitrate), [bitrate]);

  // Consulta el estado y añade las líneas de log nuevas.
  const refreshStatus = React.useCallback(function load(fromScratch = false): Promise<void> {
    const logFrom = fromScratch ? 0 : logNextRef.current;
    return CarUsbMp3Actions.getStatus(logFrom).then(status => {
      const { log: newLines, logNext, ...rest } = status;
      const jobId = rest.jobId ?? 0;
      // Otro trabajo (p. ej. arrancado desde otro dispositivo): el índice del log ya no vale.
      if (!fromScratch && jobId !== jobIdRef.current) return load(true);
      jobIdRef.current = jobId;
      setProgress(rest);
      if (fromScratch || logNext < logNextRef.current) {
        setLog(newLines.join('\n'));
      } else if (newLines.length > 0) {
        setLog(prev => `${prev}${prev ? '\n' : ''}${newLines.join('\n')}`);
      }
      logNextRef.current = logNext;
    });
  }, []);

  // Al entrar se recupera el estado (por si hay una conversión en marcha o recién terminada).
  React.useEffect(() => { refreshStatus(true); }, [refreshStatus]);

  // Mientras hay un trabajo en marcha se consulta periódicamente (log + respaldo del websocket).
  React.useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => refreshStatus(), POLL_MS);
    return () => clearInterval(timer);
  }, [isRunning, refreshStatus]);

  // Progreso en tiempo real por websocket.
  React.useEffect(() => {
    const ws = WebSocketClientService.Instance;
    if (!ws) return;
    const handler = (data: any) => {
      if (data?.type !== 'car_usb_progress') return;
      setProgress(data as CarUsbProgress);
      // Al terminar, una última consulta trae las líneas finales del log.
      if (!RUNNING_STATES.includes((data as CarUsbProgress).state)) refreshStatus();
    };
    ws.subscribeToUpdates(handler as any);
    return () => { ws.onUpdateData = ws.onUpdateData.filter(h => h !== handler); };
  }, [refreshStatus]);

  const handleConvert = () => {
    if (selection.length === 0 || isRunning) return;
    setStartError('');
    CarUsbMp3Actions.start(selection.map(s => s.path), bitrate).then(res => {
      if (!res.ok) { setStartError(res.message); return; }
      refreshStatus(true);
    });
  };

  const removeItem = (path: string) => setSelection(prev => prev.filter(s => s.path !== path));

  // ── Barra de progreso global: ficheros hechos + fracción del actual ───────────
  const { state, done, total, currentPercent } = progress;
  const barValue = (() => {
    if (state === 'done') return 100;
    if (total === 0) return 0;
    const partial = state === 'converting' && currentPercent > 0 && done < total ? currentPercent / 100 : 0;
    return Math.min(100, Math.round(((done + partial) / total) * 100));
  })();
  const filesLeft = Math.max(0, total - done);
  const currentFileNum = Math.min(total, done + 1);

  const zipName = progress.zipPath.split('/').pop() ?? '';
  const showPanel = state !== 'idle';

  const panelRightText = (() => {
    const time = elapsedSecs > 0 ? `⏱ ${formatElapsed(elapsedSecs)}  ` : '';
    if (state === 'converting') return `${time}${t('mp3.file')} ${currentFileNum}/${total}`;
    return time;
  })();

  const panelFilename = state === 'scanning' ? t('mp3car.scanning')
    : state === 'zipping' ? `${t('mp3car.zipping')} ${progress.currentFile}`
    : progress.currentFile;

  const panelFooterLeft = state === 'converting'
    ? t('mp3car.filesLeft', { left: filesLeft, total })
    : state === 'zipping' ? t('mp3car.zippingHint') : '';

  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', width: '100%' }}>
    <Typography variant="body2" color="text.secondary" sx={{ width: MP3_PANEL_WIDTH, maxWidth: '100%', textAlign: 'center' }}>
      {t('mp3car.description', { folder: CAR_USB_OUTPUT_FOLDER })}
    </Typography>

    {/* ── Selección ─────────────────────────────────────────────────────── */}
    <Box sx={{ width: MP3_PANEL_WIDTH, maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5, gap: '0.5rem', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase' }}>
          {t('mp3car.selection')} ({selection.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: '0.5rem' }}>
          {selection.length > 0 && (
            <Button size="small" color="inherit" disabled={isRunning} onClick={() => setSelection([])} sx={{ textTransform: 'none' }}>
              {t('mp3car.clear')}
            </Button>
          )}
          <Button variant="outlined" size="small" startIcon={<LibraryAddIcon />} disabled={isRunning}
            onClick={() => setIsBrowserOpen(true)} sx={{ textTransform: 'none' }}>
            {t('mp3car.selectFromCloud')}
          </Button>
        </Box>
      </Box>
      <List dense disablePadding sx={{
        border: '1px solid rgba(0,0,0,0.15)', borderRadius: 1, maxHeight: '12rem', overflowY: 'auto',
        backgroundColor: 'rgba(255,255,255,0.5)', minHeight: '3rem',
      }}>
        {selection.length === 0 && (
          <ListItem><ListItemText secondary={t('mp3car.emptySelection')} /></ListItem>
        )}
        {selection.map(item => (
          <ListItem key={item.path} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
            secondaryAction={
              <IconButton edge="end" size="small" disabled={isRunning} onClick={() => removeItem(item.path)}
                aria-label={t('mp3car.remove')}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }>
            <ListItemIcon sx={{ minWidth: '2rem' }}>
              {item.isFolder ? <FolderIcon fontSize="small" sx={{ color: '#f0a500' }} /> : <AudioFileIcon fontSize="small" color="action" />}
            </ListItemIcon>
            <ListItemText primary={item.path} primaryTypographyProps={{ variant: 'body2', sx: { wordBreak: 'break-all' } }} />
          </ListItem>
        ))}
      </List>
    </Box>

    <ModalCloudMultiSelect isOpen={isBrowserOpen} onClose={() => setIsBrowserOpen(false)}
      initialSelection={selection} onAccept={setSelection} fileFilter={isAudioFile}
      title={t('mp3car.selectTitle')} />

    {/* ── Bitrate ───────────────────────────────────────────────────────── */}
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
      <Typography variant='h6' sx={{ textTransform: 'uppercase' }}>{t('mp3.bitrate')}</Typography>
      <Select value={bitrate} disabled={isRunning} onChange={evt => setBitrate(Number(evt.target.value))} sx={{ minWidth: '15.5rem' }}>
        {carUsbBitrateList.map(br => <MenuItem value={br} key={br}>{br}k</MenuItem>)}
      </Select>
    </Box>

    {/* ── Botones ───────────────────────────────────────────────────────── */}
    <Box sx={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Button variant='outlined' sx={{ minWidth: '7rem' }} disabled={isRunning || selection.length === 0} onClick={handleConvert}>
        {t('mp3.convert')}
      </Button>
      {isRunning && (
        <Button variant='outlined' color='error' startIcon={<StopIcon />} disabled={state === 'zipping'}
          onClick={() => CarUsbMp3Actions.cancel().then(() => refreshStatus())}>
          {t('mp3car.cancel')}
        </Button>
      )}
      <Button variant='contained' startIcon={<DownloadIcon />} disabled={state !== 'done' || !progress.zipPath}
        onClick={() => CarUsbMp3Actions.downloadZip(progress.zipPath)}>
        {t('mp3car.download')}
      </Button>
    </Box>

    {startError && <Typography variant="body2" color="error">{startError}</Typography>}

    {/* ── Progreso ──────────────────────────────────────────────────────── */}
    {showPanel && (
      <Mp3ProgressPanel
        finishedText={state === 'done'
          ? `${t('mp3.done')}: ${zipName} (${total - progress.errors}/${total} ${t('mp3.files')}${progress.errors > 0 ? `, ${progress.errors} ${t('mp3car.withError')}` : ''})`
          : undefined}
        errorText={state === 'error' ? `✗ ${progress.message}` : state === 'cancelled' ? t('mp3car.cancelled') : undefined}
        filename={panelFilename}
        rightText={panelRightText}
        value={barValue}
        indeterminate={state === 'scanning' || state === 'zipping'}
        footerLeft={panelFooterLeft}
        footerRight={state === 'converting' ? `${barValue}%` : ''}
      />
    )}

    <Mp3LogArea label={t('mp3.result')} value={log} />
  </Box>;
};
