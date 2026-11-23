import { Box, Button, Checkbox, MenuItem, Select, TextField, Typography } from "@mui/material";
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import React from "react";
import { Bitrate, BitrateWithK, ConverterDataModel, bitrateList, bitrateWithKList } from "../../../data-model/mp3Converter";
import { Mp3ConverterActions } from "../../../core/actions/mp3Converter";
import { ModalCloudBrowser } from "../../molecules/ModalCloudBrowser/ModalCloudBrowser";
import { useTranslation } from 'react-i18next';
import { WebSocketClientService } from "../../../service/webSocketService/webSocketClient.service";
import { MP3_PANEL_WIDTH, Mp3LogArea, Mp3ProgressPanel, formatElapsed, useElapsedSeconds } from "./Mp3Shared";

// Pestaña "Vídeo/Audio a MP3": convierte una carpeta completa de la Cloud en otra carpeta.

interface Mp3ProgressState {
  percent: number;     // 0-100 por fichero, o -1 si es indeterminado
  filename: string;
  timemark: string;
  filesLeft: number;
  totalFiles: number;
  isAudio: boolean;
  isFinished: boolean;
}

let resultInfo = '';

const stillConvertingProcess = (data: ConverterDataModel, addResultLine: (line: string) => void) => {
  addResultLine(data.message);
  if (!data.isFinished) {
    setTimeout(() => Mp3ConverterActions.stillConverting().then(newData => stillConvertingProcess(newData, addResultLine)));
  }
};

export const Mp3FolderConverterTab = () => {
  const { t } = useTranslation();
  const [lineToSendResult, setLineToSendResult] = React.useState<string>(resultInfo);
  const [folderFrom, setFolderFrom] = React.useState<string>('');
  const [folderTo, setFolderTo]     = React.useState<string>('');
  const [isVideo, setIsVideo]       = React.useState<boolean>(true);
  const [bitrate, setBitrate]       = React.useState<Bitrate>(192);
  const [bitrateK, setBitrateK]     = React.useState<BitrateWithK>('192k');
  const [isBrowserFromOpen, setIsBrowserFromOpen] = React.useState(false);
  const [isBrowserToOpen,   setIsBrowserToOpen]   = React.useState(false);

  const [progress, setProgress] = React.useState<Mp3ProgressState | null>(null);
  const elapsedSecs = useElapsedSeconds(progress !== null && !progress.isFinished);

  // ── Suscripción al websocket ───────────────────────────────────────────────
  React.useEffect(() => {
    const ws = WebSocketClientService.Instance;
    if (!ws) return;
    const handler = (data: any) => {
      if (data?.type !== 'mp3_progress') return;
      setProgress(data as Mp3ProgressState);
      if ((data as Mp3ProgressState).isFinished) {
        setTimeout(() => setProgress(null), 2000);
      }
    };
    ws.subscribeToUpdates(handler as any);
    return () => { ws.onUpdateData = ws.onUpdateData.filter(h => h !== handler); };
  }, []);

  const addResultLine = (line: string) => {
    resultInfo = `${resultInfo}${resultInfo ? '\n' : ''}${line}`;
    setLineToSendResult(resultInfo);
  };

  // ── Lógica de la barra de progreso ────────────────────────────────────────
  //   POR FICHERO (percent >= 0): la barra va de 0 a 100 % para el fichero actual.
  //   GLOBAL      (percent === -1): la barra muestra cuántos ficheros se han completado.
  const perFileMode = progress !== null && !progress.isFinished && progress.percent >= 0;

  const barValue = (() => {
    if (!progress)            return 0;
    if (progress.isFinished)  return 100;
    if (perFileMode)          return progress.percent;
    const done = Math.max(0, progress.totalFiles - progress.filesLeft - 1);
    return Math.round((done / progress.totalFiles) * 100);
  })();

  const currentFileNum = progress ? progress.totalFiles - progress.filesLeft : 0;

  // Tiempo: se prefiere el timemark de ffmpeg; si no, el cronómetro local.
  const timeDisplay = (() => {
    if (!progress || progress.isFinished) return '';
    const tm = progress.timemark;
    if (tm && tm !== '' && tm !== '00:00:00' && tm !== '00:00:00.00') return `⏱ ${tm}`;
    return elapsedSecs > 0 ? `⏱ ${formatElapsed(elapsedSecs)}` : '';
  })();

  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', width: MP3_PANEL_WIDTH, maxWidth: '100%' }}>

    {/* Ruta de origen */}
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

    {/* Ruta de destino */}
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

    {/* Casilla de vídeo */}
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
      <Checkbox checked={isVideo} onChange={evt => setIsVideo(evt.target.checked)} />
      <Typography variant='h6' sx={{ textTransform: 'uppercase' }}>{t('mp3.convertTitle')}</Typography>
    </Box>

    {/* Botón convertir */}
    <Button variant='outlined' sx={{ minWidth: '7rem' }}
      onClick={() => {
        if (!folderFrom || !folderTo) { console.log("Fill folder from and folder to!"); return; }
        resultInfo = '';
        setLineToSendResult('');
        setProgress(null);
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

    {progress && (
      <Mp3ProgressPanel
        finishedText={progress.isFinished
          ? `${t('mp3.done')} (${progress.totalFiles} ${progress.totalFiles !== 1 ? t('mp3.files') : t('mp3.file')})`
          : undefined}
        filename={progress.filename}
        rightText={`${timeDisplay ? `${timeDisplay}  ` : ''}${t('mp3.file')} ${currentFileNum}/${progress.totalFiles}`}
        value={barValue}
        footerLeft={perFileMode ? t('mp3.fileProgress') : t('mp3.totalProgress')}
        footerRight={`${barValue}%`}
      />
    )}

    <Mp3LogArea label={t('mp3.result')} value={lineToSendResult} />
  </Box>;
};
