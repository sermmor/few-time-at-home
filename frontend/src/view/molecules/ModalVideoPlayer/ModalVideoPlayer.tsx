import React from 'react';
import { Box, Button, Dialog, DialogContent, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { CloudItem } from '../../../data-model/cloud';

export const videoFileExtensions = [
  '.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv', '.avi',
];

const isVideoFile = (name: string): boolean =>
  videoFileExtensions.some(ext => name.toLowerCase().endsWith(ext));

interface Props {
  fileList: CloudItem[];
  isOpen: boolean;
  firstVideoName: string | undefined;
  onClose: () => void;
  /** Returns the streaming URL for a given cloud item (no download, supports Range). */
  getStreamUrl: (item: CloudItem) => string;
  downloadCloudFile: (item: CloudItem) => void;
}

export const ModalVideoPlayer = ({
  fileList,
  isOpen,
  firstVideoName,
  onClose,
  getStreamUrl,
  downloadCloudFile,
}: Props): JSX.Element => {
  const [videoList, setVideoList] = React.useState<CloudItem[]>([]);
  const [index, setIndex] = React.useState<number>(0);
  const [initialized, setInitialized] = React.useState<boolean>(false);
  const [videoError, setVideoError] = React.useState<boolean>(false);

  // Re-build the filtered list whenever the parent folder changes.
  React.useEffect(() => {
    setVideoList(fileList.filter(f => isVideoFile(f.name)));
  }, [fileList]);

  // When the dialog opens, jump to the requested video.
  // Uses the same render-time pattern as ModalPhotoLibrary for consistency.
  if (isOpen && !initialized && videoList.length > 0) {
    const startIndex = firstVideoName
      ? Math.max(0, videoList.findIndex(v => v.name === firstVideoName))
      : 0;
    setIndex(startIndex);
    setVideoError(false);
    setInitialized(true);
  } else if (!isOpen && initialized) {
    setInitialized(false);
  }

  const currentVideo = videoList[index];
  const streamUrl = currentVideo ? getStreamUrl(currentVideo) : '';

  const goTo = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < videoList.length) {
      setVideoError(false);
      setIndex(newIndex);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      onKeyUp={e => {
        if (e.code === 'ArrowLeft') goTo(index - 1);
        else if (e.code === 'ArrowRight') goTo(index + 1);
      }}
    >
      <DialogContent dividers sx={{ padding: '1rem' }}>
        {/* ── Video ── */}
        <Box sx={{ display: 'flex', justifyContent: 'center', backgroundColor: '#000', borderRadius: '4px', overflow: 'hidden' }}>
          {currentVideo && !videoError && (
            /*
             * key={streamUrl} forces React to unmount/remount the <video> element
             * whenever the URL changes (i.e. when the user navigates between videos).
             * Without this the browser keeps the previous video loaded.
             */
            <video
              key={streamUrl}
              src={streamUrl}
              controls
              autoPlay
              onError={() => setVideoError(true)}
              style={{ maxHeight: '70vh', maxWidth: '100%', display: 'block' }}
            />
          )}
          {currentVideo && videoError && (
            <Box sx={{ color: '#fff', padding: '3rem 2rem', textAlign: 'center' }}>
              <Typography variant="body1" gutterBottom>
                El navegador no puede reproducir este formato de vídeo.
              </Typography>
              <Typography variant="body2" color="grey.400">
                Usa el botón de descarga para obtener el fichero y reproducirlo localmente.
              </Typography>
            </Box>
          )}
        </Box>

        {/* ── File name ── */}
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: '0.6rem 0 0.2rem' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {currentVideo?.name ?? ''}
          </Typography>
        </Box>

        {/* ── Controls ── */}
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '0.5rem' }}>
          <Button
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            title="Vídeo anterior (←)"
          >
            <ArrowBackIcon />
          </Button>

          <Button
            onClick={() => currentVideo && downloadCloudFile(currentVideo)}
            title="Descargar"
          >
            <FileDownloadIcon />
          </Button>

          <Button
            disabled={index === videoList.length - 1}
            onClick={() => goTo(index + 1)}
            title="Vídeo siguiente (→)"
          >
            <ArrowForwardIcon />
          </Button>
        </Box>

        {/* ── Counter ── */}
        {videoList.length > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.disabled">
              {index + 1} / {videoList.length}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
