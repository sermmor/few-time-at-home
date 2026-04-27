import React from 'react';
import { Box, Typography } from '@mui/material';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { WebSocketClientService } from '../../../service/webSocketService/webSocketClient.service';
import { alexaStateEndpoint } from '../../../core/urls-and-end-points';

// ── State shape (mirrors AlexaLiveState on the backend) ──────────────────────
interface AlexaLiveState {
  type: 'audio' | 'video' | null;
  url: string;
  title: string;
  currentTime: number;
  isPlaying: boolean;
  timestamp: number;
}

// How many seconds have elapsed since the sender recorded `state.timestamp`?
const adjustedTime = (state: AlexaLiveState): number =>
  state.currentTime + (Date.now() - state.timestamp) / 1000;

// Only re-seek if the receiver has drifted more than this many seconds.
const DRIFT_THRESHOLD = 3;

export const Alexa = (): JSX.Element => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const [liveState, setLiveState] = React.useState<AlexaLiveState | null>(null);

  // ── URL tracking (ref, not el.src, to avoid browser URL-normalisation diffs) ─
  const currentUrlRef = React.useRef<string>('');

  // ── Pending canplay listener (so we can cancel it if a new URL arrives) ──────
  // We store it on the element that owns it so the cleanup is unambiguous.
  const pendingCanPlayVideoRef = React.useRef<(() => void) | null>(null);
  const pendingCanPlayAudioRef = React.useRef<(() => void) | null>(null);

  const clearPendingCanPlay = (el: HTMLMediaElement, pendingRef: React.MutableRefObject<(() => void) | null>) => {
    if (pendingRef.current) {
      el.removeEventListener('canplay', pendingRef.current);
      pendingRef.current = null;
    }
  };

  // ── Autoplay unlock ───────────────────────────────────────────────────────────
  // Browsers block el.play() unless triggered by a user gesture on *this* page.
  // We show a tap overlay once; after the tap the autoplay lock is lifted for the
  // entire session.
  const [playUnlocked, setPlayUnlocked] = React.useState(false);
  const playUnlockedRef = React.useRef(false);

  const handleActivate = () => {
    playUnlockedRef.current = true;
    setPlayUnlocked(true);
    // Resume whatever element has content loaded and is waiting to play.
    [videoRef.current, audioRef.current].forEach(el => {
      if (el && el.src && el.paused) el.play().catch(console.error);
    });
  };

  // ── Core: apply a received live state to the player elements ─────────────────
  const applyState = React.useCallback((state: AlexaLiveState) => {
    // ── STOP ──────────────────────────────────────────────────────────────────
    if (!state.type) {
      // Cancel any in-flight canplay listeners so they don't start old content.
      if (videoRef.current) {
        clearPendingCanPlay(videoRef.current, pendingCanPlayVideoRef);
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load(); // fully unloads: flushes buffer, stops network
      }
      if (audioRef.current) {
        clearPendingCanPlay(audioRef.current, pendingCanPlayAudioRef);
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      currentUrlRef.current = '';
      setLiveState(null);
      return;
    }

    // ── PLAY / UPDATE ─────────────────────────────────────────────────────────
    const el: HTMLMediaElement | null =
      state.type === 'video' ? videoRef.current :
      state.type === 'audio' ? audioRef.current : null;

    const pendingRef =
      state.type === 'video' ? pendingCanPlayVideoRef : pendingCanPlayAudioRef;

    setLiveState(state);
    if (!el) return;

    const target = adjustedTime(state);

    if (currentUrlRef.current !== state.url) {
      // ── New URL: fully reload the element ──────────────────────────────────
      // Cancel any previous canplay listener first (prevents old-video ghost starts).
      clearPendingCanPlay(el, pendingRef);
      currentUrlRef.current = state.url;

      el.pause();
      el.src = state.url;
      el.load();

      const onCanPlay = () => {
        pendingRef.current = null;
        el.removeEventListener('canplay', onCanPlay);
        el.currentTime = target;
        if (state.isPlaying && playUnlockedRef.current) {
          el.play().catch(console.error);
        }
        // If not yet unlocked, handleActivate will call play() on tap.
      };
      pendingRef.current = onCanPlay;
      el.addEventListener('canplay', onCanPlay);
    } else {
      // ── Same URL: only re-seek if drift is large ───────────────────────────
      const drift = Math.abs(el.currentTime - target);
      if (drift > DRIFT_THRESHOLD) el.currentTime = target;

      if (state.isPlaying && el.paused && playUnlockedRef.current) {
        el.play().catch(console.error);
      } else if (!state.isPlaying && !el.paused) {
        el.pause();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch current state on page load ─────────────────────────────────────────
  React.useEffect(() => {
    fetch(alexaStateEndpoint())
      .then(r => r.json())
      .then((state: AlexaLiveState) => {
        if (state.type) applyState(state);
      })
      .catch(console.error);
  }, [applyState]);

  // ── Subscribe to real-time WebSocket updates ──────────────────────────────────
  React.useEffect(() => {
    const ws = WebSocketClientService.Instance;
    if (!ws) return;

    const callback = (data: any) => {
      if (!data?.alexaLive) return;
      applyState(data.alexaLive as AlexaLiveState);
    };

    ws.subscribeToUpdates(callback);
    return () => {
      ws.onUpdateData = ws.onUpdateData.filter(cb => cb !== callback);
    };
  }, [applyState]);

  // ── Render ────────────────────────────────────────────────────────────────────
  // EnvelopComponent is NOT rendered for /alexa (see App.tsx isFullscreenPage),
  // so we take the full viewport directly — no negative-margin escape needed.
  return (
    <Box sx={{
      position:        'relative',
      width:           '100vw',
      height:          '100vh',
      backgroundColor: '#000',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      overflow:        'hidden',
    }}>

      {/* ── Video element (always in DOM so the ref is always available) ── */}
      <video
        ref={videoRef}
        style={{
          position:   'absolute',
          inset:      0,
          width:      '100%',
          height:     '100%',
          objectFit:  'contain',
          display:    liveState?.type === 'video' ? 'block' : 'none',
        }}
        onError={e => console.error('[Alexa] video error:', e)}
      />

      {/* ── Audio element (always in DOM, never visible) ── */}
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
        onError={e => console.error('[Alexa] audio error:', e)}
      />

      {/* ── Audio now-playing card ── */}
      {liveState?.type === 'audio' && (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '1.5rem', color: '#fff',
        }}>
          <Box sx={{
            width: '10rem', height: '10rem', borderRadius: '50%',
            backgroundColor: '#1a1a2e', border: '2px solid #3a3a6a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GraphicEqIcon sx={{ fontSize: '4rem', color: '#1db954' }} />
          </Box>
          <Typography variant="h6" sx={{
            fontWeight: 400, textAlign: 'center',
            maxWidth: '80vw', px: '1rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {liveState.title}
          </Typography>
        </Box>
      )}

      {/* ── Idle state (shown once unlocked and nothing is playing) ── */}
      {!liveState && playUnlocked && (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '1rem', color: 'rgba(255,255,255,0.25)', userSelect: 'none',
        }}>
          <WifiTetheringIcon sx={{ fontSize: '5rem' }} />
          <Typography variant="h6" sx={{ color: 'inherit', fontWeight: 300 }}>
            Esperando reproducción…
          </Typography>
          <Typography variant="body2" sx={{
            color: 'inherit', textAlign: 'center',
            maxWidth: '24rem', lineHeight: 1.6,
          }}>
            Pulsa el botón{' '}
            <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Live</strong>{' '}
            en el reproductor de música o vídeo para emitir aquí desde cualquier
            dispositivo de la red.
          </Typography>
        </Box>
      )}

      {/* ── Tap-to-activate overlay ───────────────────────────────────────────
           Browsers block autoplay without a user gesture on this page.
           One tap lifts the lock for the entire session.                     ── */}
      {!playUnlocked && (
        <Box
          onClick={handleActivate}
          sx={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '1.5rem',
            backgroundColor: 'rgba(0,0,0,0.75)',
            cursor: 'pointer', zIndex: 10,
            color: '#fff', userSelect: 'none',
          }}
        >
          <TouchAppIcon sx={{ fontSize: '5rem', color: '#ff4444', opacity: 0.85 }} />
          <Typography variant="h5" sx={{ fontWeight: 300, textAlign: 'center', px: '2rem' }}>
            Toca para activar el audio
          </Typography>
          <Typography variant="body2" sx={{
            color: 'rgba(255,255,255,0.45)', textAlign: 'center', maxWidth: '22rem',
          }}>
            Los navegadores bloquean la reproducción automática hasta la primera
            interacción. Toca una vez y el contenido empezará a reproducirse solo.
          </Typography>
        </Box>
      )}
    </Box>
  );
};
