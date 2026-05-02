import React from 'react';
import { Box, Typography } from '@mui/material';
import TvOffIcon from '@mui/icons-material/TvOff';
import { YoutubePageActions } from '../../../core/actions/youtube';
import { WebSocketClientService } from '../../../service/webSocketService/webSocketClient.service';

// ── Component ─────────────────────────────────────────────────────────────────
// Full-screen YouTube embed page.
// The current video ID is stored in backend memory (POST /youtube-page/live)
// and fetched on mount (GET /youtube-page/live).
// No menu bar, not listed in the nav — mirrors the /alexa pattern.

export const AlexaYT = (): JSX.Element => {
  const [videoId, setVideoId] = React.useState<string>('');

  // ── Fetch video ID from backend on mount ────────────────────────────────────
  React.useEffect(() => {
    YoutubePageActions.getLiveVideo()
      .then(({ videoId: id }) => { if (id) setVideoId(id); })
      .catch(console.error);
  }, []);

  // ── Listen for live updates via WebSocket ───────────────────────────────────
  // If the user changes the video while /alexa-yt is open the new ID arrives
  // here immediately.
  React.useEffect(() => {
    const ws = WebSocketClientService.Instance;
    if (!ws) return;
    const handler = (data: any) => {
      if (data?.youtubeLive?.videoId !== undefined) {
        setVideoId(data.youtubeLive.videoId as string);
      }
    };
    ws.subscribeToUpdates(handler as any);
    return () => {
      ws.onUpdateData = ws.onUpdateData.filter((h: any) => h !== handler);
    };
  }, []);

  const embedSrc = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`
    : '';

  return (
    <Box sx={{
      position:        'fixed',
      inset:           0,
      backgroundColor: '#000',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
    }}>
      {videoId ? (
        <iframe
          key={videoId}          /* force remount on video change */
          src={embedSrc}
          title="YouTube video"
          style={{
            position: 'absolute',
            inset:    0,
            width:    '100%',
            height:   '100%',
            border:   'none',
          }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <Box sx={{
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           '1rem',
          color:         'rgba(255,255,255,0.25)',
          userSelect:    'none',
        }}>
          <TvOffIcon sx={{ fontSize: '5rem' }} />
          <Typography variant="h6" sx={{ color: 'inherit', fontWeight: 300 }}>
            Sin vídeo
          </Typography>
          <Typography variant="body2" sx={{
            color:      'inherit',
            textAlign:  'center',
            maxWidth:   '22rem',
            lineHeight: 1.6,
          }}>
            Pulsa <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Emitir en vivo</strong> en
            la página YouTube para embeber un vídeo aquí.
          </Typography>
        </Box>
      )}
    </Box>
  );
};
