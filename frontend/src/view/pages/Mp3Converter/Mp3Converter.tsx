import { Box, Button, Checkbox, LinearProgress, MenuItem, Select, SxProps, TextField, Theme, Typography } from "@mui/material";
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import React from "react";
import { Bitrate, BitrateWithK, ConverterDataModel, bitrateList, bitrateWithKList } from "../../../data-model/mp3Converter";
import { Mp3ConverterActions } from "../../../core/actions/mp3Converter";
import { ModalCloudBrowser } from "../../molecules/ModalCloudBrowser/ModalCloudBrowser";
import { useConfiguredDialogAlphas } from "../../../core/context/DialogAlphasContext";
import { useTranslation } from 'react-i18next';
import { WebSocketClientService } from "../../../service/webSocketService/webSocketClient.service";

const getFormStyle = (alpha: number): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  backgroundColor: `rgba(245, 245, 245, ${alpha})`,
  paddingBottom: '2rem',
  paddingTop: '1.5rem',
});

interface Mp3ProgressState {
  percent: number;     // 0-100 per-file, or -1 when indeterminate
  filename: string;
  timemark: string;
  filesLeft: number;
  totalFiles: number;
  isAudio: boolean;
  isFinished: boolean;
}

const padZ = (n: number) => n.toString().padStart(2, '0');
const formatElapsed = (secs: number) => `${padZ(Math.floor(secs / 60))}:${padZ(secs % 60)}`;

let resultInfo = '';

const stillConvertingProcess = (data: ConverterDataModel, addResultLine: (line: string) => void) => {
  addResultLine(data.message);
  if (!data.isFinished) {
    setTimeout(() => Mp3ConverterActions.stillConverting().then(newData => stillConvertingProcess(newData, addResultLine)));
  }
};

export const Mp3Converter = () => {
  const alphas = useConfiguredDialogAlphas();
  const { t } = useTranslation();
  const [lineToSendResult, setLineToSendResult] = React.useState<string>('');
  const [folderFrom, setFolderFrom] = React.useState<string>('');
  const [folderTo, setFolderTo]     = React.useState<string>('');
  const [isVideo, setIsVideo]       = React.useState<boolean>(true);
  const [bitrate, setBitrate]       = React.useState<Bitrate>(192);
  const [bitrateK, setBitrateK]     = React.useState<BitrateWithK>('192k');
  const [isBrowserFromOpen, setIsBrowserFromOpen] = React.useState(false);
  const [isBrowserToOpen,   setIsBrowserToOpen]   = React.useState(false);

  const [progress, setProgress] = React.useState<Mp3ProgressState | null>(null);
  const [elapsedSecs, setElapsedSecs] = React.useState(0);
  const startTimeRef = React.useRef<number | null>(null);
  const timerRef     = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Elapsed-time ticker ───────────────────────────────────────────────────
  React.useEffect(() => {
    const running = progress !== null && !progress.isFinished;
    if (running) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        setElapsedSecs(0);
      }
      if (!timerRef.current) {
        timerRef.current = setInterval(
          () => setElapsedSecs(Math.floor((Date.now() - startTimeRef.current!) / 1000)),
          1000,
        );
      }
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (progress === null) { startTimeRef.current = null; setElapsedSecs(0); }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [progress]);

  // ── WebSocket subscription ────────────────────────────────────────────────
  React.useEffect(() => {
    const ws = WebSocketClientService.Instance;
    if (!ws) return;
    const handler = (data: any) => {
      if (data?.type !== 'mp3_progress') return;
      setProgress(data as Mp3ProgressState);
      if ((data as Mp3ProgressState).isFinished) {
        setTimeout(() => { setProgress(null); startTimeRef.current = null; setElapsedSecs(0); }, 2000);
      }
    };
    ws.subscribeToUpdates(handler as any);
    return () => { ws.onUpdateData = ws.onUpdateData.filter(h => h !== handler); };
  }, []);

  const addResultLine = (line: string) => {
    resultInfo = `${resultInfo}${resultInfo ? '\n' : ''}${line}`;
    setLineToSendResult(resultInfo);
  };

  // ── Progress display logic ────────────────────────────────────────────────
  //
  // Two modes:
  //   PER-FILE  (percent >= 0): bar shows 0→100 % for the current file.
  //   OVERALL   (percent === -1): bar shows how many files have completed
  //             out of the total (0→100 % for the whole job).
  //
  const perFileMode = progress !== null && !progress.isFinished && progress.percent >= 0;

  const barValue = (() => {
    if (!progress)            return 0;
    if (progress.isFinished)  return 100;
    if (perFileMode)          return progress.percent;
    // Overall: filesLeft is "files still in queue after current"; completed = total - left - 1
    const done = Math.max(0, progress.totalFiles - progress.filesLeft - 1);
    return Math.round((done / progress.totalFiles) * 100);
  })();

  // Current file number (1-based)
  const currentFileNum = progress ? progress.totalFiles - progress.filesLeft : 0;

  // Time display: prefer ffmpeg timemark; fall back to local elapsed ticker
  const timeDisplay = (() => {
    if (!progress || progress.isFinished) return '';
    const tm = progress.timemark;
    if (tm && tm !== '' && tm !== '00:00:00' && tm !== '00:00:00.00') return `⏱ ${tm}`;
    return elapsedSecs > 0 ? `⏱ ${formatElapsed(elapsedSecs)}` : '';
  })();

  const filenameLabel = (() => {
    const f = progress?.filename ?? '';
    return f.length > 50 ? `…${f.slice(-48)}` : f;
  })();

  return <Box sx={getFormStyle(alphas.general)}>
    <Typography variant='h6' sx={{ textTransform: 'uppercase' }}>
      {t('mp3.title')}
    </Typography>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* From path */}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '0.5rem' }}>
        <TextField
          label={t('mp3.fromPath')} variant="standard" value={folderFrom}
          sx={{ minWidth: { xs: '15.5rem', sm: '5rem', md: '5rem' } }}
          onChange={evt => setFolderFrom(evt.target.value)}
        />
        <Button variant="outlined" size="small" startIcon={<FolderOpenIcon />}
          onClick={() => setIsBrowserFromOpen(true)}
          sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}>
          {t('mp3.browse')}
        </Button>
      </Box>

      {/* To path */}
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '0.5rem' }}>
        <TextField
          label={t('mp3.toPath')} variant="standard" value={folderTo}
          sx={{ minWidth: { xs: '15.5rem', sm: '5rem', md: '5rem' } }}
          onChange={evt => setFolderTo(evt.target.value)}
        />
        <Button variant="outlined" size="small" startIcon={<FolderOpenIcon />}
          onClick={() => setIsBrowserToOpen(true)}
          sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}>
          {t('mp3.browse')}
        </Button>
      </Box>

      <ModalCloudBrowser isOpen={isBrowserFromOpen} onClose={() => setIsBrowserFromOpen(false)}
        onAccept={path => setFolderFrom(path)} title={t('mp3.selectSource')} />
      <ModalCloudBrowser isOpen={isBrowserToOpen}   onClose={() => setIsBrowserToOpen(false)}
        onAccept={path => setFolderTo(path)}   title={t('mp3.selectDest')} />

      {/* Bitrate */}
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
        <Typography variant='h6' sx={{ textTransform: 'uppercase' }}>{t('mp3.bitrate')}</Typography>
        <Select value={bitrateK}
          onChange={evt => {
            const nb = evt.target.value as BitrateWithK;
            setBitrateK(nb);
            setBitrate(bitrateList[bitrateWithKList.indexOf(nb)]);
          }}
          sx={{ minWidth: '15.5rem' }}>
          {bitrateWithKList.map(br => <MenuItem value={br} key={br}>{br}</MenuItem>)}
        </Select>
      </Box>

      {/* Video checkbox */}
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
        <Checkbox checked={isVideo} onChange={evt => setIsVideo(evt.target.checked)} />
        <Typography variant='h6' sx={{ textTransform: 'uppercase' }}>{t('mp3.convertTitle')}</Typography>
      </Box>

      {/* Convert button */}
      <Button variant='outlined' sx={{ minWidth: '7rem' }}
        onClick={() => {
          if (!folderFrom || !folderTo) { console.log("Fill folder from and folder to!"); return; }
          resultInfo = '';
          setProgress(null);
          startTimeRef.current = null;
          setElapsedSecs(0);
          if (isVideo) {
            Mp3ConverterActions.sendVideoToMp3({ folderFrom, folderTo, bitrate: bitrateK })
              .then(data => stillConvertingProcess(data, addResultLine));
          } else {
            Mp3ConverterActions.sendAudioToMp3({ folderFrom, folderTo, bitrateToConvertAudio: bitrate })
              .then(data => stillConvertingProcess(data, addResultLine));
          }
        }}>
        {t('mp3.convert')}
      </Button>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      {progress && (
        <Box sx={{ width: '40rem', maxWidth: '100%' }}>

          {/* Header row */}
          {progress.isFinished ? (
            <Typography variant="body2" sx={{ mb: 0.5, color: 'success.main', fontWeight: 600 }}>
              {t('mp3.done')} ({progress.totalFiles} {progress.totalFiles !== 1 ? t('mp3.files') : t('mp3.file')})
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
              {/* Left: current filename */}
              <Typography variant="caption"
                sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={progress.filename}>
                🎵 {filenameLabel}
              </Typography>
              {/* Right: time + file counter */}
              <Typography variant="caption" sx={{ ml: 1, whiteSpace: 'nowrap', color: 'text.secondary' }}>
                {timeDisplay && `${timeDisplay}  `}
                {t('mp3.file')} {currentFileNum}/{progress.totalFiles}
              </Typography>
            </Box>
          )}

          {/* Bar */}
          <LinearProgress
            variant="determinate"
            value={barValue}
            sx={{ height: 8, borderRadius: 4 }}
            color={progress.isFinished ? 'success' : 'primary'}
          />

          {/* Footer row: mode label + percentage */}
          {!progress.isFinished && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {perFileMode ? t('mp3.fileProgress') : t('mp3.totalProgress')}
              </Typography>
              <Typography variant="caption">
                {barValue}%
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Log */}
      <TextField id="outlined-multiline-static" label={t('mp3.result')}
        multiline rows={6} sx={{ width: '40rem' }} value={lineToSendResult} />
    </Box>
  </Box>;
};
