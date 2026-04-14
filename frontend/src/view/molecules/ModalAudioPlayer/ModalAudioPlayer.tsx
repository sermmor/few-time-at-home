import React from 'react';
import { Box, Button, Dialog, DialogContent, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { CloudItem } from '../../../data-model/cloud';

export const audioFileExtensions = [
  '.mp3', '.wav', '.flac', '.aac', '.m4a', '.oga', '.opus', '.wma',
];

const isAudioFile = (name: string): boolean =>
  audioFileExtensions.some(ext => name.toLowerCase().endsWith(ext));

interface Props {
  fileList: CloudItem[];
  isOpen: boolean;
  firstAudioName: string | undefined;
  onClose: () => void;
  /** Returns the streaming URL for a given cloud item (supports HTTP Range). */
  getStreamUrl: (item: CloudItem) => string;
  downloadCloudFile: (item: CloudItem) => void;
}

export const ModalAudioPlayer = ({
  fileList,
  isOpen,
  firstAudioName,
  onClose,
  getStreamUrl,
  downloadCloudFile,
}: Props): JSX.Element => {
  const [audioList, setAudioList] = React.useState<CloudItem[]>([]);
  const [index, setIndex] = React.useState<number>(0);
  const [initialized, setInitialized] = React.useState<boolean>(false);
  const [audioError, setAudioError] = React.useState<boolean>(false);

  React.useEffect(() => {
    setAudioList(fileList.filter(f => isAudioFile(f.name)));
  }, [fileList]);

  // Same render-time init pattern as ModalPhotoLibrary / ModalVideoPlayer.
  if (isOpen && !initialized && audioList.length > 0) {
    const startIndex = firstAudioName
      ? Math.max(0, audioList.findIndex(a => a.name === firstAudioName))
      : 0;
    setIndex(startIndex);
    setAudioError(false);
    setInitialized(true);
  } else if (!isOpen && initialized) {
    setInitialized(false);
  }

  const currentAudio = audioList[index];
  const streamUrl = currentAudio ? getStreamUrl(currentAudio) : '';

  const goTo = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < audioList.length) {
      setAudioError(false);
      setIndex(newIndex);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      onKeyUp={e => {
        if (e.code === 'ArrowLeft') goTo(index - 1);
        else if (e.code === 'ArrowRight') goTo(index + 1);
      }}
    >
      <DialogContent dividers sx={{ padding: '1.5rem' }}>
        {/* ── Decorative header ── */}
        <Box sx={{ display: 'flex', justifyContent: 'center', paddingBottom: '1rem' }}>
          <MusicNoteIcon sx={{ fontSize: '4rem', color: 'primary.main', opacity: 0.7 }} />
        </Box>

        {/* ── File name ── */}
        <Box sx={{ display: 'flex', justifyContent: 'center', paddingBottom: '1rem' }}>
          <Typography
            variant="body1"
            sx={{ fontFamily: 'monospace', textAlign: 'center', wordBreak: 'break-all' }}
          >
            {currentAudio?.name ?? ''}
          </Typography>
        </Box>

        {/* ── Audio element ── */}
        {currentAudio && !audioError && (
          /*
           * key={streamUrl} forces React to remount <audio> when the track changes,
           * so the browser loads the new source instead of keeping the previous one.
           */
          <Box sx={{ display: 'flex', justifyContent: 'center', paddingBottom: '0.5rem' }}>
            <audio
              key={streamUrl}
              src={streamUrl}
              controls
              autoPlay
              onError={() => setAudioError(true)}
              style={{ width: '100%' }}
            />
          </Box>
        )}

        {currentAudio && audioError && (
          <Box sx={{ textAlign: 'center', padding: '1rem 0', color: 'error.main' }}>
            <Typography variant="body2">
              El navegador no puede reproducir este formato de audio.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Usa el botón de descarga para obtener el fichero.
            </Typography>
          </Box>
        )}

        {/* ── Controls ── */}
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '0.5rem', paddingTop: '0.5rem' }}>
          <Button
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            title="Pista anterior (←)"
          >
            <ArrowBackIcon />
          </Button>

          <Button
            onClick={() => currentAudio && downloadCloudFile(currentAudio)}
            title="Descargar"
          >
            <FileDownloadIcon />
          </Button>

          <Button
            disabled={index === audioList.length - 1}
            onClick={() => goTo(index + 1)}
            title="Pista siguiente (→)"
          >
            <ArrowForwardIcon />
          </Button>
        </Box>

        {/* ── Counter ── */}
        {audioList.length > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', paddingTop: '0.25rem' }}>
            <Typography variant="caption" color="text.disabled">
              {index + 1} / {audioList.length}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
