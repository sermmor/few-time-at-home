import React from 'react';
import { Box, CircularProgress, IconButton, Slider, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import IosShareIcon from '@mui/icons-material/IosShare';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import WifiTetheringOffIcon from '@mui/icons-material/WifiTetheringOff';
import CastIcon from '@mui/icons-material/Cast';
import CastConnectedIcon from '@mui/icons-material/CastConnected';
import { CloudItem } from '../../../data-model/cloud';
import { SharePlaylistDialog } from '../SharePlaylistDialog/SharePlaylistDialog';
import { WebSocketClientService } from '../../../service/webSocketService/webSocketClient.service';
import {
  castDevicesEndpoint,
  castStartEndpoint,
  castPlayEndpoint,
  castPauseEndpoint,
  castSeekEndpoint,
  castStopEndpoint,
  alexaStateEndpoint,
  alexaSyncEndpoint,
  alexaStopEndpoint,
} from '../../../core/urls-and-end-points';
import { CastDevice, ModalCastDevicePicker } from '../VideoPlayerBar/ModalCastDevicePicker';

export const PLAYER_BAR_HEIGHT = '5rem';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const getAudioContentType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const types: Record<string, string> = {
    mp3:  'audio/mpeg',
    wav:  'audio/wav',
    flac: 'audio/flac',
    aac:  'audio/aac',
    m4a:  'audio/mp4',
    oga:  'audio/ogg',
    opus: 'audio/ogg',
    wma:  'audio/x-ms-wma',
  };
  return types[ext] ?? 'audio/mpeg';
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface CastState {
  playerState: string;
  currentTime: number;
  duration:    number;
  castingTo:   string | null;
  idleReason?: string;
}

interface Props {
  playlist: CloudItem[];
  getStreamUrl: (item: CloudItem) => string;
  onPlaylistChange: (newPlaylist: CloudItem[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const MusicPlayerBar = ({ playlist, getStreamUrl, onPlaylistChange }: Props): JSX.Element | null => {
  const audioRef = React.useRef<HTMLAudioElement>(null);

  // ── Local playback state ───────────────────────────────────────────────────
  const [currentTrackPath, setCurrentTrackPath] = React.useState<string | null>(null);
  const [isPlaying,        setIsPlaying        ] = React.useState(false);
  const [currentTime,      setCurrentTime      ] = React.useState(0);
  const [duration,         setDuration         ] = React.useState(0);
  const [isExpanded,       setIsExpanded       ] = React.useState(false);
  const [shareDialogOpen,  setShareDialogOpen  ] = React.useState(false);
  const [dragFromIndex,    setDragFromIndex    ] = React.useState<number | null>(null);
  const [dragOverIndex,    setDragOverIndex    ] = React.useState<number | null>(null);

  // ── Cast state ─────────────────────────────────────────────────────────────
  const [castState,          setCastState         ] = React.useState<CastState | null>(null);
  const [castDevices,        setCastDevices       ] = React.useState<CastDevice[]>([]);
  const [isDiscovering,      setIsDiscovering     ] = React.useState(false);
  const [isDevicePickerOpen, setIsDevicePickerOpen] = React.useState(false);
  const [isCastStarting,     setIsCastStarting    ] = React.useState(false);

  const isCasting = castState !== null;

  // ── Live / Alexa state ────────────────────────────────────────────────────
  const [isLive,  setIsLive ] = React.useState(false);
  const isLiveRef             = React.useRef(false);
  const liveIntervalRef       = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => { isLiveRef.current = isLive; }, [isLive]);

  // Stop live: clear interval, unmute local, notify backend
  const stopLive = React.useCallback(() => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    const a = audioRef.current;
    if (a) { a.muted = false; }
    fetch(alexaStopEndpoint(), { method: 'POST' }).catch(console.error);
    setIsLive(false);
  }, []);

  // Send full state to /alexa/state and start/restart the 5s sync interval.
  const startLive = React.useCallback((item: CloudItem, url: string, currentTime: number, isPlaying: boolean) => {
    fetch(alexaStateEndpoint(), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'audio',
        url,
        title:       item.name,
        currentTime,
        isPlaying,
      }),
    }).catch(console.error);

    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    liveIntervalRef.current = setInterval(() => {
      const a = audioRef.current;
      if (!a) return;
      // Always sync position so Alexa stays in lockstep, even when paused.
      fetch(alexaSyncEndpoint(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTime: a.currentTime }),
      }).catch(console.error);
    }, 5000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLiveButtonClick = () => {
    if (isLive) { stopLive(); return; }
    if (!currentItem) return;
    const audio = audioRef.current;
    const currentTime = audio?.currentTime ?? 0;
    const isPlaying   = audio ? !audio.paused : false;
    // Mute local — Alexa becomes the audio output. Keep playing so controls work.
    if (audio) { audio.muted = true; }
    setIsLive(true);
    startLive(currentItem, getStreamUrlRef.current(currentItem), currentTime, isPlaying);
  };

  // Re-broadcast when track changes while Live is active. Always start from 0.
  React.useEffect(() => {
    if (!isLive || !currentItem) return;
    startLive(currentItem, getStreamUrlRef.current(currentItem), 0, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackPath, isLive]);

  // Clean up on unmount
  React.useEffect(() => () => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
  }, []);

  // ── Derived display values (cast overrides local when active) ─────────────
  const displayTime      = isCasting ? castState.currentTime        : currentTime;
  const displayDuration  = isCasting ? castState.duration           : duration;
  const displayIsPlaying = isCasting ? castState.playerState === 'PLAYING' : isPlaying;

  // ── Refs to break stale closures in async callbacks ──────────────────────
  const playlistRef         = React.useRef(playlist);
  const currentTrackPathRef = React.useRef(currentTrackPath);
  const lastCastDeviceRef   = React.useRef<CastDevice | null>(null);
  // getStreamUrl closes over `currentDrive` in Cloud.tsx — keep a ref so the
  // WS auto-advance callback (mounted once with [] deps) always uses the
  // up-to-date version and never sends an empty `drive=` in the cast URL.
  const getStreamUrlRef     = React.useRef(getStreamUrl);

  React.useEffect(() => { playlistRef.current         = playlist;         }, [playlist]);
  React.useEffect(() => { currentTrackPathRef.current = currentTrackPath; }, [currentTrackPath]);
  React.useLayoutEffect(() => { getStreamUrlRef.current = getStreamUrl;   }, [getStreamUrl]);

  const isPlayingRef = React.useRef(isPlaying);
  React.useLayoutEffect(() => { isPlayingRef.current = isPlaying; });

  const prevPlaylistRef = React.useRef<CloudItem[]>(playlist);

  const currentIndex = currentTrackPath
    ? playlist.findIndex(item => item.path === currentTrackPath)
    : -1;
  const currentItem = currentIndex >= 0 ? playlist[currentIndex] : null;

  // ── Pick next track in sequence (no shuffle in the audio player) ──────────
  const pickNextPath = (pl: CloudItem[], cur: string | null): string | null => {
    if (pl.length === 0) return null;
    const idx = cur ? pl.findIndex(i => i.path === cur) : -1;
    return idx >= 0 && idx < pl.length - 1 ? pl[idx + 1].path : null;
  };

  // ── Cast: fire /cast/start and show loading spinner ───────────────────────
  /**
   * Sends the cast-start request and activates the loading spinner.
   * Does NOT call setCurrentTrackPath — callers navigating to a different
   * track must do that themselves before calling this.
   */
  const startCastingItem = (item: CloudItem, device: CastDevice, startTime = 0) => {
    setIsCastStarting(true);
    fetch(castStartEndpoint(), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceIp:    device.ip,
        devicePort:  device.port,
        deviceName:  device.name,
        videoUrl:    getStreamUrlRef.current(item),   // use ref so stale WS closure always gets current drive
        contentType: getAudioContentType(item.name),
        startTime,
      }),
    }).catch((err) => {
      console.error('[Cast] start error:', err);
      setIsCastStarting(false);
    });
  };

  // ── WebSocket: receive cast status from the backend ───────────────────────
  React.useEffect(() => {
    const ws = WebSocketClientService.Instance;
    if (!ws) return;

    const castWsCallback = (data: any) => {
      if (!data?.cast) return;
      const c: CastState = data.cast;

      // Track finished naturally → auto-advance to the next one
      if (c.playerState === 'IDLE' && c.idleReason === 'FINISHED') {
        const device = lastCastDeviceRef.current;
        if (!device) { setCastState(null); setIsCastStarting(false); return; }

        const pl   = playlistRef.current;
        const cur  = currentTrackPathRef.current;
        const next = pickNextPath(pl, cur);

        if (!next) {
          // Last track in playlist → stop casting
          setCastState(null);
          setIsCastStarting(false);
          return;
        }

        const nextItem = pl.find(i => i.path === next);
        if (!nextItem) { setCastState(null); setIsCastStarting(false); return; }

        // Keep the cast UI active while the next track loads.
        // setCurrentTrackPath is a stable React setter — safe from a stale closure.
        setCastState({ ...c, idleReason: undefined, castingTo: device.name });
        setCurrentTrackPath(nextItem.path);
        startCastingItem(nextItem, device, 0);
        return;
      }

      // Cast stopped from outside (device disconnected / user) → clear UI
      if (c.playerState === 'IDLE' && !c.castingTo) {
        setCastState(null);
        setIsCastStarting(false);
        return;
      }

      setCastState(c);
      // Keep the loading spinner while the player is still IDLE (e.g. the
      // brief "IDLE without idleReason" frame that arrives just before the
      // FINISHED message during auto-advance).  Only clear it once the
      // Chromecast is actually playing / paused / buffering.
      if (c.playerState !== 'IDLE') {
        setIsCastStarting(false);
      }
    };

    ws.subscribeToUpdates(castWsCallback);
    // Cleanup: remove this specific callback so React StrictMode's double-mount
    // in dev doesn't leave two copies registered (which would fire two
    // /cast/start requests on auto-advance).
    return () => {
      ws.onUpdateData = ws.onUpdateData.filter(cb => cb !== castWsCallback);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Playlist change handler ────────────────────────────────────────────────
  React.useEffect(() => {
    const prevPlaylist = prevPlaylistRef.current;
    prevPlaylistRef.current = playlist;

    if (playlist.length === 0) {
      setCurrentTrackPath(null);
      setIsPlaying(false);
      return;
    }

    // No track loaded yet → auto-load first song (don't auto-play).
    if (currentTrackPath === null) {
      setCurrentTrackPath(playlist[0].path);
      return;
    }

    // Current song still present → nothing to do.
    if (playlist.some(item => item.path === currentTrackPath)) return;

    // Current song was removed → jump to what occupied its position.
    const oldIndex = prevPlaylist.findIndex(item => item.path === currentTrackPath);
    const newIndex = Math.min(Math.max(oldIndex, 0), playlist.length - 1);
    setCurrentTrackPath(playlist[newIndex].path);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist]);

  // ── Audio loading: runs when the track changes ─────────────────────────────
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrackPath) {
      audio.pause();
      audio.src = '';
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const pl  = playlistRef.current;
    const idx = pl.findIndex(item => item.path === currentTrackPath);
    if (idx === -1) return;

    audio.src = getStreamUrl(pl[idx]);
    audio.load();
    // Don't auto-play locally while casting — the Chromecast handles playback.
    // isPlaying is set to false when cast starts, so isPlayingRef.current = false.
    if (isPlayingRef.current) {
      audio.play().catch(err => console.error('Audio play error:', err));
    }
  }, [currentTrackPath, getStreamUrl]);

  // ── Play / pause (local only — skipped while casting) ─────────────────────
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrackPath || isCasting) return;
    if (isPlaying) {
      audio.play().catch(err => console.error('Audio play error:', err));
    } else {
      audio.pause();
    }
    // Sync play/pause state to Alexa immediately
    if (isLiveRef.current) {
      fetch(alexaSyncEndpoint(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentTime: audio.currentTime, isPlaying }),
      }).catch(console.error);
    }
  }, [isPlaying, currentTrackPath, isCasting]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const playTrack = (index: number) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentTrackPath(playlist[index].path);
      setIsPlaying(true);
    }
  };

  const handlePlayPause = () => {
    if (isCasting) {
      if (displayIsPlaying) {
        fetch(castPauseEndpoint(), { method: 'POST' }).catch(console.error);
      } else {
        fetch(castPlayEndpoint(),  { method: 'POST' }).catch(console.error);
      }
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrev = () => {
    if (isCasting) {
      const device = lastCastDeviceRef.current;
      if (!device || currentIndex <= 0) return;
      const prevItem = playlist[currentIndex - 1];
      setCurrentTrackPath(prevItem.path);
      startCastingItem(prevItem, device, 0);
      return;
    }
    const audio = audioRef.current;
    if (currentIndex > 0) {
      playTrack(currentIndex - 1);
    } else if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleNext = () => {
    if (isCasting) {
      const device = lastCastDeviceRef.current;
      if (!device) return;
      const next = pickNextPath(playlistRef.current, currentTrackPathRef.current);
      if (!next) return;
      const nextItem = playlistRef.current.find(i => i.path === next);
      if (!nextItem) return;
      setCurrentTrackPath(nextItem.path);
      startCastingItem(nextItem, device, 0);
      return;
    }
    if (currentIndex < playlist.length - 1) {
      playTrack(currentIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleSeek = (_: Event, value: number | number[]) => {
    const newTime = Array.isArray(value) ? value[0] : value;
    if (isCasting) {
      fetch(castSeekEndpoint(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ seconds: newTime }),
      }).catch(console.error);
      return;
    }
    const audio = audioRef.current;
    if (!audio || !isFinite(audio.duration)) return;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    // Immediately sync seek position to Alexa
    if (isLiveRef.current) {
      fetch(alexaSyncEndpoint(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentTime: newTime }),
      }).catch(console.error);
    }
  };

  // ── Cast controls ─────────────────────────────────────────────────────────
  const handleCastButtonClick = async () => {
    if (isCasting) {
      await fetch(castStopEndpoint(), { method: 'POST' }).catch(console.error);
      setCastState(null);
      return;
    }
    if (!currentItem) return;

    // Open the dialog immediately with the loading state so the user gets
    // instant feedback, then fill in the devices once discovery completes.
    setIsDiscovering(true);
    setIsDevicePickerOpen(true);
    try {
      const res     = await fetch(castDevicesEndpoint());
      const devices = (await res.json()) as CastDevice[];
      setCastDevices(devices);
    } catch {
      setCastDevices([]);
    }
    setIsDiscovering(false);
  };

  const handleDeviceSelected = (device: CastDevice) => {
    setIsDevicePickerOpen(false);
    if (!currentItem) return;

    lastCastDeviceRef.current = device;

    const startTime = audioRef.current?.currentTime ?? 0;

    // Pause local playback before handing off to Chromecast.
    audioRef.current?.pause();
    setIsPlaying(false);

    startCastingItem(currentItem, device, startTime);
  };

  // ── Playlist management ───────────────────────────────────────────────────
  const handleRemove = (index: number) => {
    onPlaylistChange(playlist.filter((_, i) => i !== index));
  };

  // ── Drag and drop ─────────────────────────────────────────────────────────
  const handleDragStart = (index: number) => setDragFromIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragFromIndex === null || dragFromIndex === dropIndex) {
      setDragFromIndex(null); setDragOverIndex(null); return;
    }
    const newPlaylist = [...playlist];
    const [moved] = newPlaylist.splice(dragFromIndex, 1);
    newPlaylist.splice(dropIndex, 0, moved);
    onPlaylistChange(newPlaylist);
    setDragFromIndex(null); setDragOverIndex(null);
  };

  const handleDragEnd = () => { setDragFromIndex(null); setDragOverIndex(null); };

  // ── Render guard ──────────────────────────────────────────────────────────
  if (playlist.length === 0) return null;

  const isPrevDisabled = currentIndex <= 0;
  const isNextDisabled = currentIndex >= playlist.length - 1;

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={handleNext}
        onError={(e) => console.error('Audio error:', e)}
      />

      <ModalCastDevicePicker
        open={isDevicePickerOpen}
        discovering={isDiscovering}
        devices={castDevices}
        onSelect={handleDeviceSelected}
        onClose={() => setIsDevicePickerOpen(false)}
      />

      {/* ── Playlist panel ── */}
      {isExpanded && (
        <Box sx={{
          position: 'fixed',
          bottom: PLAYER_BAR_HEIGHT,
          left: { xs: '2.5vw', sm: 'calc(50% - 260px)', md: 'calc(50% - 320px)' },
          width: { xs: '95vw', sm: '520px', md: '640px' },
          maxHeight: '48vh',
          overflowY: 'auto',
          backgroundColor: '#1a1a2e',
          borderRadius: '10px 10px 0 0',
          border: '1px solid #3a3a5c',
          borderBottom: 'none',
          zIndex: 1300,
          boxShadow: '0 -6px 24px rgba(0,0,0,0.65)',
        }}>
          {/* Panel header */}
          <Box sx={{
            padding: '0.3rem 0.5rem 0.3rem 1rem',
            borderBottom: '1px solid #2e2e4a',
            backgroundColor: '#141428',
            position: 'sticky', top: 0, zIndex: 1,
            display: 'flex', alignItems: 'center',
          }}>
            <Typography variant="caption" sx={{
              color: '#7a7a9a', textTransform: 'uppercase',
              letterSpacing: '0.08em', fontWeight: 600, fontSize: '0.68rem', flexGrow: 1,
            }}>
              Cola de reproducción · {playlist.length} {playlist.length === 1 ? 'canción' : 'canciones'}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setShareDialogOpen(true)}
              title="Crear lista en YouTube / Spotify"
              sx={{ color: '#484868', padding: '4px', '&:hover': { color: '#1db954' } }}
            >
              <IosShareIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Box>

          {/* Song rows */}
          {playlist.map((item, idx) => (
            <Box
              key={item.path}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => playTrack(idx)}
              sx={{
                display: 'flex', alignItems: 'center',
                padding: '0.4rem 0.75rem', gap: '0.45rem',
                backgroundColor:
                  dragOverIndex === idx && dragFromIndex !== idx
                    ? 'rgba(29,185,84,0.14)'
                    : idx === currentIndex ? 'rgba(29,185,84,0.07)' : 'transparent',
                borderBottom: '1px solid #22223a', cursor: 'pointer',
                userSelect: 'none', transition: 'background-color 0.12s',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
              }}
            >
              <DragHandleIcon sx={{ color: '#484868', fontSize: '1.05rem', flexShrink: 0, cursor: 'grab' }} />
              {idx === currentIndex
                ? <MusicNoteIcon sx={{ color: '#1db954', fontSize: '0.85rem', flexShrink: 0 }} />
                : <Box sx={{ width: '0.85rem', flexShrink: 0 }} />
              }
              <Typography variant="caption" sx={{ color: '#666', flexShrink: 0, fontSize: '0.72rem', minWidth: '1.4rem' }}>
                {idx + 1}
              </Typography>
              <Typography variant="body2" sx={{
                color: idx === currentIndex ? '#1db954' : '#c8c8e0',
                flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: '0.8rem', fontWeight: idx === currentIndex ? 600 : 400,
              }}>
                {item.name}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); handleRemove(idx); }}
                sx={{ color: '#484868', padding: '3px', flexShrink: 0, '&:hover': { color: '#e05050' } }}
                title="Eliminar de la cola"
              >
                <DeleteIcon sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* ── Player bar ── */}
      <Box sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: PLAYER_BAR_HEIGHT,
        backgroundColor: isCasting ? '#0e1a2e' : '#1a1a2e',
        borderTop: `1px solid ${isCasting ? '#1a7a4a' : '#3a3a5c'}`,
        display: 'flex', alignItems: 'center',
        padding: '0 0.75rem', gap: '0.5rem',
        zIndex: 1200, boxShadow: '0 -2px 14px rgba(0,0,0,0.55)',
        transition: 'background-color 0.3s, border-color 0.3s',
      }}>

        {/* Toggle playlist panel */}
        <IconButton
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{ color: isExpanded ? '#1db954' : '#7070a0', flexShrink: 0, padding: '5px', '&:hover': { color: '#eee' } }}
          title={isExpanded ? 'Ocultar cola' : 'Ver cola de reproducción'}
        >
          {isExpanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>

        {/* Current song name / cast indicator */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          width: { xs: '90px', sm: '170px', md: '210px' },
          flexShrink: 0, overflow: 'hidden',
        }}>
          {isCasting
            ? <CastConnectedIcon sx={{ color: '#1db954', fontSize: '1rem', flexShrink: 0, filter: 'drop-shadow(0 0 4px #1db954)' }} />
            : <MusicNoteIcon     sx={{ color: '#1db954', fontSize: '1rem', flexShrink: 0 }} />
          }
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" sx={{
              color: '#e0e0f0', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', fontSize: '0.75rem',
            }} title={currentItem?.name}>
              {currentItem?.name ?? ''}
            </Typography>
            {isCasting && castState?.castingTo && (
              <Typography variant="caption" sx={{
                color: '#1db954', fontSize: '0.62rem', display: 'block',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                ▶ {castState.castingTo}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Playback controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.1rem', flexShrink: 0 }}>
          <IconButton
            onClick={handlePrev}
            disabled={isPrevDisabled}
            sx={{ color: '#a0a0c0', padding: '6px', '&:disabled': { color: '#363660' }, '&:hover': { color: '#eee' } }}
            title="Anterior"
          >
            <SkipPreviousIcon />
          </IconButton>

          <IconButton
            onClick={handlePlayPause}
            disabled={isCastStarting}
            sx={{
              color: '#fff', backgroundColor: '#1db954', padding: '6px',
              '&:hover': { backgroundColor: '#1ed760' },
              '&:disabled': { backgroundColor: '#1a3a2a', color: '#888' },
              '& svg': { fontSize: '1.4rem' },
            }}
            title={displayIsPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isCastStarting
              ? <CircularProgress size={20} sx={{ color: '#1db954' }} />
              : displayIsPlaying ? <PauseIcon /> : <PlayArrowIcon />
            }
          </IconButton>

          <IconButton
            onClick={handleNext}
            disabled={isNextDisabled}
            sx={{ color: '#a0a0c0', padding: '6px', '&:disabled': { color: '#363660' }, '&:hover': { color: '#eee' } }}
            title={isCasting ? 'Siguiente (Chromecast)' : 'Siguiente'}
          >
            <SkipNextIcon />
          </IconButton>
        </Box>

        {/* Progress bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{
            color: '#7070a0', flexShrink: 0, fontSize: '0.68rem',
            fontVariantNumeric: 'tabular-nums', minWidth: '2.5rem', textAlign: 'right',
          }}>
            {formatTime(displayTime)}
          </Typography>

          <Slider
            size="small"
            min={0}
            max={displayDuration > 0 ? displayDuration : 100}
            value={isFinite(displayTime) ? displayTime : 0}
            onChange={handleSeek}
            sx={{
              color: isCasting ? '#1a9a64' : '#1db954',
              padding: '10px 0',
              '& .MuiSlider-thumb': {
                width: 10, height: 10, transition: 'width 0.1s, height 0.1s',
                '&:hover, &.Mui-focusVisible': {
                  width: 14, height: 14,
                  boxShadow: `0 0 0 6px ${isCasting ? 'rgba(26,154,100,0.18)' : 'rgba(29,185,84,0.18)'}`,
                },
              },
              '& .MuiSlider-track': { height: 3 },
              '& .MuiSlider-rail': { height: 3, backgroundColor: '#36366a', opacity: 1 },
            }}
          />

          <Typography variant="caption" sx={{
            color: '#7070a0', flexShrink: 0, fontSize: '0.68rem',
            fontVariantNumeric: 'tabular-nums', minWidth: '2.5rem',
          }}>
            {formatTime(displayDuration)}
          </Typography>
        </Box>

        {/* Extra controls — live + cast buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {/* Live / Alexa button */}
          <Tooltip title={isLive ? 'Emitiendo en /alexa — clic para detener' : currentItem ? 'Emitir en vivo a /alexa' : 'Añade canciones para emitir en vivo'}>
            <span>
              <IconButton
                onClick={handleLiveButtonClick}
                disabled={!currentItem && !isLive}
                sx={{
                  padding: '5px',
                  color: isLive ? '#ff4444' : currentItem ? '#7070a0' : '#363660',
                  '&:hover':    { color: isLive ? '#ff6666' : '#eee' },
                  '&:disabled': { color: '#363660' },
                  filter:     isLive ? 'drop-shadow(0 0 4px #ff4444)' : 'none',
                  transition: 'filter 0.3s, color 0.2s',
                }}
              >
                {isLive
                  ? <WifiTetheringOffIcon sx={{ fontSize: '1.1rem' }} />
                  : <WifiTetheringIcon    sx={{ fontSize: '1.1rem' }} />
                }
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={
            isCasting
              ? `Emitiendo en "${castState?.castingTo ?? ''}" — clic para detener`
              : currentItem
                ? 'Emitir en Chromecast'
                : 'Añade canciones para emitir'
          }>
            <span>
              <IconButton
                onClick={handleCastButtonClick}
                disabled={!currentItem && !isCasting}
                sx={{
                  padding: '5px',
                  color: isCasting ? '#1db954' : currentItem ? '#7070a0' : '#363660',
                  '&:hover': { color: isCasting ? '#1ed760' : '#eee' },
                  '&:disabled': { color: '#363660' },
                  filter: isCasting ? 'drop-shadow(0 0 4px #1db954)' : 'none',
                  transition: 'filter 0.3s, color 0.2s',
                }}
              >
                {isCasting
                  ? <CastConnectedIcon sx={{ fontSize: '1.1rem' }} />
                  : <CastIcon         sx={{ fontSize: '1.1rem' }} />
                }
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Share dialog ── */}
      <SharePlaylistDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        playlist={playlist}
      />
    </>
  );
};
