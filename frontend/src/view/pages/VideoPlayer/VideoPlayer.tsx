import React from 'react';
import { Box, Typography } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { CloudItem } from '../../../data-model/cloud';
import { CloudActions } from '../../../core/actions/cloud';
import { VideoPlayerBar, VIDEO_PLAYER_BAR_HEIGHT } from '../../molecules/VideoPlayerBar/VideoPlayerBar';

// EnvelopComponent in App.tsx applies paddingTop: '7rem' to every page,
// but the actual AppMenubar + ServerInfoBar occupy only ~5.5rem.
// That leaves a ~1.5rem dead gap at the top.
// VIDEO_TOP_OFFSET is the true visual height of the bars (used for height calc).
// VIDEO_TOP_MARGIN pulls the Box up by the excess padding to close the gap.
const VIDEO_TOP_OFFSET = '5.5rem';   // real bar height
const VIDEO_TOP_MARGIN = '-1.5rem';  // 5.5rem − 7rem padding = −1.5rem

export const VideoPlayer = (): JSX.Element => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const [playlist, setPlaylist] = React.useState<CloudItem[]>([]);
  const [currentTrackPath, setCurrentTrackPath] = React.useState<string | null>(null);

  // Refs to break stale-closure in video event handlers
  const playlistRef = React.useRef(playlist);
  React.useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  const prevPlaylistRef = React.useRef<CloudItem[]>(playlist);

  // ── Playlist change handler ────────────────────────────────────────────────
  React.useEffect(() => {
    const prevPlaylist = prevPlaylistRef.current;
    prevPlaylistRef.current = playlist;

    if (playlist.length === 0) {
      setCurrentTrackPath(null);
      return;
    }

    // No track loaded yet → auto-load first video (don't auto-play)
    if (currentTrackPath === null) {
      setCurrentTrackPath(playlist[0].path);
      return;
    }

    // Current video still present → nothing to do
    if (playlist.some(item => item.path === currentTrackPath)) {
      return;
    }

    // Current video was removed → jump to what occupied its slot
    const oldIndex = prevPlaylist.findIndex(item => item.path === currentTrackPath);
    const newIndex = Math.min(Math.max(oldIndex, 0), playlist.length - 1);
    setCurrentTrackPath(playlist[newIndex].path);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist]);

  // ── Video src loading: runs when the track changes ────────────────────────
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!currentTrackPath) {
      video.pause();
      video.src = '';
      video.load();
      return;
    }

    const pl = playlistRef.current;
    const item = pl.find(i => i.path === currentTrackPath);
    if (!item) return;

    const wasPlaying = !video.paused;
    video.src = CloudActions.getStreamUrl({ drive: item.driveName, path: item.path });
    video.load();
    if (wasPlaying) {
      video.play().catch(err => console.error('Video play error:', err));
    }
  }, [currentTrackPath]);

  // ── Playlist helpers ──────────────────────────────────────────────────────
  const handleAddVideos = (items: CloudItem[]) => {
    setPlaylist(prev => {
      // De-duplicate by path
      const existingPaths = new Set(prev.map(i => i.path));
      const newItems = items.filter(i => !existingPaths.has(i.path));
      return [...prev, ...newItems];
    });
  };

  const videoAreaHeight = `calc(100vh - ${VIDEO_TOP_OFFSET} - ${VIDEO_PLAYER_BAR_HEIGHT})`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Video display area ── */}
      {/* Negative margins escape the padding that EnvelopComponent adds:
            marginTop  closes the gap between the bars and the video area
            marginLeft/Right remove the 1rem horizontal side padding */}
      <Box sx={{
        marginTop: VIDEO_TOP_MARGIN,
        marginLeft: '-1rem',
        marginRight: '-1rem',
        width: 'calc(100% + 2rem)',
        height: videoAreaHeight,
        backgroundColor: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {playlist.length === 0 ? (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            color: 'rgba(255,255,255,0.25)',
            userSelect: 'none',
          }}>
            <PlayCircleOutlineIcon sx={{ fontSize: '5rem' }} />
            <Typography variant="h6" sx={{ color: 'inherit', fontWeight: 300 }}>
              Sin vídeo
            </Typography>
            <Typography variant="body2" sx={{ color: 'inherit', textAlign: 'center', maxWidth: '22rem', lineHeight: 1.6 }}>
              Usa el botón de la barra inferior para añadir vídeos desde la Cloud
            </Typography>
          </Box>
        ) : (
          <video
            ref={videoRef}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000',
            }}
            onError={(e) => console.error('Video error:', e)}
          />
        )}
      </Box>

      {/* ── Player bar ── */}
      <VideoPlayerBar
        videoRef={videoRef}
        playlist={playlist}
        currentTrackPath={currentTrackPath}
        onPlaylistChange={setPlaylist}
        onTrackChange={setCurrentTrackPath}
        onAddVideos={handleAddVideos}
      />
    </Box>
  );
};
