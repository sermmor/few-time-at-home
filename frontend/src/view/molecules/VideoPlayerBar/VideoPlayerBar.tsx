import React from 'react';
import { Box, CircularProgress, IconButton, Slider, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import LanIcon from '@mui/icons-material/Lan';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import WifiTetheringOffIcon from '@mui/icons-material/WifiTetheringOff';
import CastIcon from '@mui/icons-material/Cast';
import CastConnectedIcon from '@mui/icons-material/CastConnected';
import { CloudItem } from '../../../data-model/cloud';
import { CloudActions } from '../../../core/actions/cloud';
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
import { ModalVideoCloudBrowser } from './ModalVideoCloudBrowser';
import { ModalNetworkBrowser, NETWORK_DRIVE } from './ModalNetworkBrowser';
import { CastDevice, ModalCastDevicePicker } from './ModalCastDevicePicker';

export const VIDEO_PLAYER_BAR_HEIGHT = '5rem';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const getVideoContentType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const types: Record<string, string> = {
    mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime',
    webm: 'video/webm', mkv: 'video/x-matroska',
    avi: 'video/x-msvideo', ogv: 'video/ogg',
  };
  return types[ext] ?? 'video/mp4';
};

interface CastState {
  playerState: string;
  currentTime: number;
  duration:    number;
  castingTo:   string | null;
  idleReason?: string;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  videoRef:         React.RefObject<HTMLVideoElement>;
  playlist:         CloudItem[];
  currentTrackPath: string | null;
  onPlaylistChange: (newPlaylist: CloudItem[]) => void;
  onTrackChange:    (path: string) => void;
  onAddVideos:      (items: CloudItem[]) => void;
}

export const VideoPlayerBar = ({
  videoRef,
  playlist,
  currentTrackPath,
  onPlaylistChange,
  onTrackChange,
  onAddVideos,
}: Props): JSX.Element | null => {
  // ── Local playback state ───────────────────────────────────────────────────
  const [isPlaying,            setIsPlaying           ] = React.useState(false);
  const [currentTime,          setCurrentTime         ] = React.useState(0);
  const [duration,             setDuration            ] = React.useState(0);
  const [isMuted,              setIsMuted             ] = React.useState(false);
  const [isShuffleOn,          setIsShuffleOn         ] = React.useState(false);
  const [isExpanded,           setIsExpanded          ] = React.useState(false);
  const [isBrowserOpen,        setIsBrowserOpen       ] = React.useState(false);
  const [isNetworkBrowserOpen, setIsNetworkBrowserOpen] = React.useState(false);
  const [dragFromIndex,        setDragFromIndex       ] = React.useState<number | null>(null);
  const [dragOverIndex,        setDragOverIndex       ] = React.useState<number | null>(null);

  // ── Cast state ─────────────────────────────────────────────────────────────
  const [castState,         setCastState        ] = React.useState<CastState | null>(null);
  const [castDevices,       setCastDevices      ] = React.useState<CastDevice[]>([]);
  const [isDiscovering,     setIsDiscovering    ] = React.useState(false);
  const [isDevicePickerOpen,setIsDevicePickerOpen] = React.useState(false);
  const [isCastStarting,    setIsCastStarting   ] = React.useState(false);

  const isCasting = castState !== null;

  // ── Live / Alexa state ────────────────────────────────────────────────────
  const [isLive,    setIsLive   ] = React.useState(false);
  const isLiveRef                 = React.useRef(false);
  const liveIntervalRef           = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => { isLiveRef.current = isLive; }, [isLive]);

  // Stop live: clear interval, unmute local, notify backend
  const stopLive = React.useCallback(() => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    const v = videoRef.current;
    if (v) { v.muted = false; }
    fetch(alexaStopEndpoint(), { method: 'POST' }).catch(console.error);
    setIsLive(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Send full state to /alexa/state and start/restart the 5s sync interval.
  const startLive = React.useCallback((item: CloudItem, url: string, currentTime: number, isPlaying: boolean) => {
    fetch(alexaStateEndpoint(), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'video',
        url,
        title:       item.name,
        currentTime,
        isPlaying,
      }),
    }).catch(console.error);

    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    liveIntervalRef.current = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      // Always sync position so Alexa stays in lockstep, even when paused.
      fetch(alexaSyncEndpoint(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTime: v.currentTime }),
      }).catch(console.error);
    }, 5000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLiveButtonClick = () => {
    if (isLive) {
      stopLive();
      return;
    }
    if (!currentItem) return;
    const video = videoRef.current;
    const currentTime = video?.currentTime ?? 0;
    const isPlaying   = video ? !video.paused : false;
    // Mute local — Alexa becomes the audio output. Keep playing so controls work.
    if (video) { video.muted = true; setIsMuted(true); }
    setIsLive(true);
    startLive(currentItem, getVideoUrlForItem(currentItem), currentTime, isPlaying);
  };

  // When the track changes while Live is active, re-broadcast the new state.
  // Always start from 0 and treat the new track as playing (auto-advance).
  React.useEffect(() => {
    if (!isLive || !currentItem) return;
    startLive(currentItem, getVideoUrlForItem(currentItem), 0, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackPath, isLive]);

  // Stop live on unmount
  React.useEffect(() => () => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
  }, []);

  // ── Derived display values (cast mode overrides local) ────────────────────
  const displayTime      = isCasting ? castState.currentTime : currentTime;
  const displayDuration  = isCasting ? castState.duration    : duration;
  const displayIsPlaying = isCasting ? castState.playerState === 'PLAYING' : isPlaying;

  // ── Refs to break stale closures in async callbacks ──────────────────────
  const playlistRef         = React.useRef(playlist);
  const currentTrackPathRef = React.useRef(currentTrackPath);
  const isShuffleOnRef      = React.useRef(isShuffleOn);
  const lastCastDeviceRef   = React.useRef<CastDevice | null>(null);

  React.useEffect(() => { playlistRef.current         = playlist;         }, [playlist]);
  React.useEffect(() => { currentTrackPathRef.current = currentTrackPath; }, [currentTrackPath]);
  React.useEffect(() => { isShuffleOnRef.current      = isShuffleOn;      }, [isShuffleOn]);

  // ── Shuffle history ────────────────────────────────────────────────────────
  const shuffleHistoryRef = React.useRef<string[]>([]);

  const currentIndex = currentTrackPath
    ? playlist.findIndex(item => item.path === currentTrackPath)
    : -1;
  const currentItem = currentIndex >= 0 ? playlist[currentIndex] : null;

  // ── Helpers: build video URL + fire /cast/start ───────────────────────────
  const getVideoUrlForItem = (item: CloudItem): string =>
    item.driveName === NETWORK_DRIVE
      ? item.path
      : CloudActions.getStreamUrl({ drive: item.driveName, path: item.path });

  /**
   * Fires the /cast/start network request and sets the loading spinner.
   * Does NOT call onTrackChange — callers that are navigating to a *different*
   * track must call onTrackChange(item.path) themselves before/after this.
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
        videoUrl:    getVideoUrlForItem(item),
        contentType: getVideoContentType(item.name),
        startTime,
      }),
    }).catch((err) => {
      console.error('[Cast] start error:', err);
      setIsCastStarting(false);
    });
  };

  /** Picks the next path from [pl] given [cur], honouring shuffle mode. */
  const pickNextPath = (pl: CloudItem[], cur: string | null, shuffle: boolean): string | null => {
    if (pl.length === 0) return null;
    if (shuffle) {
      if (pl.length <= 1) return null;
      const historyLimit  = Math.max(1, Math.floor(pl.length * 0.1));
      const recentHistory = shuffleHistoryRef.current.slice(-historyLimit);
      const excluded      = new Set<string>([...(cur ? [cur] : []), ...recentHistory]);
      let candidates      = pl.map(i => i.path).filter(p => !excluded.has(p));
      if (candidates.length === 0) candidates = pl.map(i => i.path).filter(p => p !== cur);
      if (candidates.length === 0) return null;
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      // Record current in shuffle history
      if (cur) {
        const maxH = Math.max(pl.length * 2, 20);
        shuffleHistoryRef.current = [...shuffleHistoryRef.current.slice(-(maxH - 1)), cur];
      }
      return next;
    }
    const idx = cur ? pl.findIndex(i => i.path === cur) : -1;
    return idx >= 0 && idx < pl.length - 1 ? pl[idx + 1].path : null;
  };

  // ── WebSocket: listen for cast status from the backend ────────────────────
  React.useEffect(() => {
    const ws = WebSocketClientService.Instance;
    if (!ws) return;

    const castWsCallback = (data: any) => {
      if (!data?.cast) return;
      const c: CastState = data.cast;

      // Media finished naturally → try to auto-advance to the next track
      if (c.playerState === 'IDLE' && c.idleReason === 'FINISHED') {
        const device = lastCastDeviceRef.current;
        if (!device) { setCastState(null); setIsCastStarting(false); return; }

        const pl   = playlistRef.current;
        const cur  = currentTrackPathRef.current;
        const next = pickNextPath(pl, cur, isShuffleOnRef.current);

        if (!next) {
          // Last track — cast fully finished
          setCastState(null);
          setIsCastStarting(false);
          return;
        }

        const nextItem = pl.find(i => i.path === next);
        if (!nextItem) { setCastState(null); return; }

        // Keep showing the cast UI (spinner) while the next item loads.
        // Tell the parent to update currentTrackPath so the track name / index
        // in the bar reflects the new item.  onTrackChange === setCurrentTrackPath
        // (a stable React state-setter), so calling it from this stale closure is safe.
        setCastState({ ...c, idleReason: undefined, castingTo: device.name });
        onTrackChange(nextItem.path);
        startCastingItem(nextItem, device, 0);
        return;
      }

      // Cast stopped externally (user/device) → clear UI
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

  // ── Shuffle helper ────────────────────────────────────────────────────────
  const pickShuffleNext = (): string | null => {
    if (playlist.length <= 1) return null;
    const historyLimit  = Math.max(1, Math.floor(playlist.length * 0.1));
    const recentHistory = shuffleHistoryRef.current.slice(-historyLimit);
    const excluded      = new Set<string>([
      ...(currentTrackPath ? [currentTrackPath] : []),
      ...recentHistory,
    ]);
    let candidates = playlist.map(i => i.path).filter(p => !excluded.has(p));
    if (candidates.length === 0)
      candidates = playlist.map(i => i.path).filter(p => p !== currentTrackPath);
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  // ── Local playback controls ────────────────────────────────────────────────
  const handlePlayPause = () => {
    if (isCasting) {
      if (displayIsPlaying) {
        fetch(castPauseEndpoint(), { method: 'POST' }).catch(console.error);
      } else {
        fetch(castPlayEndpoint(), { method: 'POST' }).catch(console.error);
      }
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(err => console.error('Video play error:', err));
    } else {
      video.pause();
    }
  };

  const handlePrev = () => {
    if (isCasting) {
      const device = lastCastDeviceRef.current;
      if (!device || currentIndex <= 0) return;
      const prevItem = playlist[currentIndex - 1];
      onTrackChange(prevItem.path);
      startCastingItem(prevItem, device, 0);
      return;
    }
    const video = videoRef.current;
    if (currentIndex > 0) {
      onTrackChange(playlist[currentIndex - 1].path);
    } else if (video) {
      video.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleNext = React.useCallback(() => {
    if (isCasting) {
      const device = lastCastDeviceRef.current;
      if (!device) return;
      const next = pickNextPath(playlistRef.current, currentTrackPathRef.current, isShuffleOnRef.current);
      if (!next) return;
      const nextItem = playlistRef.current.find(i => i.path === next);
      if (!nextItem) return;
      onTrackChange(next);
      startCastingItem(nextItem, device, 0);
      return;
    }
    if (isShuffleOn) {
      if (currentTrackPath) {
        const maxHistory = Math.max(playlist.length * 2, 20);
        shuffleHistoryRef.current = [
          ...shuffleHistoryRef.current.slice(-(maxHistory - 1)),
          currentTrackPath,
        ];
      }
      const nextPath = pickShuffleNext();
      if (nextPath) onTrackChange(nextPath);
      else videoRef.current?.pause();
    } else {
      if (currentIndex >= 0 && currentIndex < playlist.length - 1) {
        onTrackChange(playlist[currentIndex + 1].path);
      } else {
        videoRef.current?.pause();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentTrackPath, isCasting, isShuffleOn, playlist, onTrackChange]);

  const handleNextRef = React.useRef(handleNext);
  React.useLayoutEffect(() => { handleNextRef.current = handleNext; });

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
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;
    video.currentTime = newTime;
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

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    video.requestFullscreen?.().catch(err => console.error('Fullscreen error:', err));
  };

  // ── Sync video events → state ─────────────────────────────────────────────
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDuration   = () => setDuration(video.duration ?? 0);
    const onPlay       = () => {
      setIsPlaying(true);
      if (isLiveRef.current) {
        fetch(alexaSyncEndpoint(), {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ currentTime: video.currentTime, isPlaying: true }),
        }).catch(console.error);
      }
    };
    const onPause = () => {
      setIsPlaying(false);
      if (isLiveRef.current) {
        fetch(alexaSyncEndpoint(), {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ currentTime: video.currentTime, isPlaying: false }),
        }).catch(console.error);
      }
    };
    const onEnded = () => handleNextRef.current();
    video.addEventListener('timeupdate',     onTimeUpdate);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('play',           onPlay);
    video.addEventListener('pause',          onPause);
    video.addEventListener('ended',          onEnded);
    return () => {
      video.removeEventListener('timeupdate',     onTimeUpdate);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('play',           onPlay);
      video.removeEventListener('pause',          onPause);
      video.removeEventListener('ended',          onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef.current]);

  // ── Cast controls ─────────────────────────────────────────────────────────
  const handleCastButtonClick = async () => {
    if (isCasting) {
      // Already casting → stop
      await fetch(castStopEndpoint(), { method: 'POST' }).catch(console.error);
      setCastState(null);
      return;
    }
    if (!currentItem) return;
    setIsDiscovering(true);
    try {
      const res     = await fetch(castDevicesEndpoint());
      const devices = (await res.json()) as CastDevice[];
      setCastDevices(devices);
    } catch {
      setCastDevices([]);
    }
    setIsDiscovering(false);
    setIsDevicePickerOpen(true);
  };

  const handleDeviceSelected = (device: CastDevice) => {
    setIsDevicePickerOpen(false);
    if (!currentItem) return;

    // Remember the device so auto-advance and prev/next can reuse it
    lastCastDeviceRef.current = device;

    const startTime = videoRef.current?.currentTime ?? 0;

    // Pause local playback before handing off to Chromecast
    videoRef.current?.pause();

    startCastingItem(currentItem, device, startTime);
  };

  // ── Playlist management ───────────────────────────────────────────────────
  const handleRemove = (index: number) => {
    onPlaylistChange(playlist.filter((_, i) => i !== index));
  };

  const playTrack = (index: number) => {
    if (index >= 0 && index < playlist.length) onTrackChange(playlist[index].path);
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

  // ── Render guard (empty playlist) ─────────────────────────────────────────
  if (playlist.length === 0 && !isBrowserOpen && !isNetworkBrowserOpen) {
    return (
      <>
        <ModalVideoCloudBrowser isOpen={isBrowserOpen} onClose={() => setIsBrowserOpen(false)} onAddVideos={onAddVideos} />
        <ModalNetworkBrowser isOpen={isNetworkBrowserOpen} onClose={() => setIsNetworkBrowserOpen(false)} onAddVideos={onAddVideos} />
        <Box sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: VIDEO_PLAYER_BAR_HEIGHT, backgroundColor: '#1a1a2e',
          borderTop: '1px solid #3a3a5c', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '0 1rem', zIndex: 1200,
          boxShadow: '0 -2px 14px rgba(0,0,0,0.55)',
        }}>
          <IconButton
            onClick={() => setIsBrowserOpen(true)}
            sx={{ color: '#a0a0c0', gap: '0.5rem', borderRadius: '8px', padding: '0.4rem 1rem',
              '&:hover': { color: '#eee', backgroundColor: 'rgba(255,255,255,0.06)' } }}
          >
            <PlaylistAddIcon />
            <Typography variant="body2" sx={{ color: 'inherit', fontSize: '0.85rem' }}>Añadir vídeos</Typography>
          </IconButton>
          <IconButton
            onClick={() => setIsNetworkBrowserOpen(true)}
            sx={{ color: '#a0a0c0', gap: '0.5rem', borderRadius: '8px', padding: '0.4rem 1rem',
              '&:hover': { color: '#eee', backgroundColor: 'rgba(255,255,255,0.06)' } }}
          >
            <LanIcon />
            <Typography variant="body2" sx={{ color: 'inherit', fontSize: '0.85rem' }}>Añadir desde red</Typography>
          </IconButton>
        </Box>
      </>
    );
  }

  const isPrevDisabled = isCasting ? currentIndex <= 0 : currentIndex <= 0;
  const isNextDisabled = isShuffleOn ? playlist.length <= 1 : currentIndex >= playlist.length - 1;

  return (
    <>
      <ModalVideoCloudBrowser isOpen={isBrowserOpen} onClose={() => setIsBrowserOpen(false)} onAddVideos={onAddVideos} />
      <ModalNetworkBrowser isOpen={isNetworkBrowserOpen} onClose={() => setIsNetworkBrowserOpen(false)} onAddVideos={onAddVideos} />
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
          position: 'fixed', bottom: VIDEO_PLAYER_BAR_HEIGHT,
          left: { xs: '2.5vw', sm: 'calc(50% - 260px)', md: 'calc(50% - 320px)' },
          width: { xs: '95vw', sm: '520px', md: '640px' },
          maxHeight: '48vh', overflowY: 'auto',
          backgroundColor: '#1a1a2e', borderRadius: '10px 10px 0 0',
          border: '1px solid #3a3a5c', borderBottom: 'none',
          zIndex: 1300, boxShadow: '0 -6px 24px rgba(0,0,0,0.65)',
        }}>
          {/* Panel header */}
          <Box sx={{
            padding: '0.55rem 1rem', borderBottom: '1px solid #2e2e4a',
            backgroundColor: '#141428', position: 'sticky', top: 0, zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Typography variant="caption" sx={{
              color: '#7a7a9a', textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: 600, fontSize: '0.68rem',
            }}>
              Cola de reproducción · {playlist.length} {playlist.length === 1 ? 'vídeo' : 'vídeos'}
            </Typography>
            <Tooltip title="Añadir más vídeos">
              <IconButton size="small" onClick={() => setIsBrowserOpen(true)}
                sx={{ color: '#7a7a9a', padding: '4px', '&:hover': { color: '#1db954' } }}>
                <PlaylistAddIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Añadir desde red local">
              <IconButton size="small" onClick={() => setIsNetworkBrowserOpen(true)}
                sx={{ color: '#7a7a9a', padding: '4px', '&:hover': { color: '#4db8ff' } }}>
                <LanIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Video rows */}
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
                ? <VideoFileIcon sx={{ color: '#1db954', fontSize: '0.85rem', flexShrink: 0 }} />
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
              <IconButton size="small"
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
        height: VIDEO_PLAYER_BAR_HEIGHT,
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
          sx={{ color: isExpanded ? '#1db954' : '#7070a0', flexShrink: 0, padding: '5px',
            '&:hover': { color: '#eee' } }}
          title={isExpanded ? 'Ocultar cola' : 'Ver cola de reproducción'}
        >
          {isExpanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>

        {/* Current video name / cast indicator */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          width: { xs: '90px', sm: '170px', md: '210px' },
          flexShrink: 0, overflow: 'hidden',
        }}>
          {isCasting ? (
            <CastConnectedIcon sx={{ color: '#1db954', fontSize: '1rem', flexShrink: 0,
              filter: 'drop-shadow(0 0 4px #1db954)' }} />
          ) : (
            <VideoFileIcon sx={{ color: '#1db954', fontSize: '1rem', flexShrink: 0 }} />
          )}
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
          <IconButton onClick={handlePrev} disabled={isPrevDisabled}
            sx={{ color: '#a0a0c0', padding: '6px',
              '&:disabled': { color: '#363660' }, '&:hover': { color: '#eee' } }}
            title="Anterior"
          >
            <SkipPreviousIcon />
          </IconButton>

          <IconButton
            onClick={handlePlayPause}
            disabled={isCastStarting}
            sx={{
              color: '#fff',
              backgroundColor: '#1db954',
              padding: '6px',
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

          <IconButton onClick={handleNext} disabled={isNextDisabled}
            sx={{ color: '#a0a0c0', padding: '6px',
              '&:disabled': { color: '#363660' }, '&:hover': { color: '#eee' } }}
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
                '&:hover, &.Mui-focusVisible': { width: 14, height: 14,
                  boxShadow: `0 0 0 6px ${isCasting ? 'rgba(26,154,100,0.18)' : 'rgba(29,185,84,0.18)'}` },
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

        {/* Extra controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Tooltip title={isShuffleOn ? 'Reproducción aleatoria activada' : 'Activar reproducción aleatoria'}>
            <IconButton onClick={() => setIsShuffleOn(prev => !prev)}
              sx={{ padding: '5px', color: isShuffleOn ? '#1db954' : '#7070a0',
                '&:hover': { color: isShuffleOn ? '#1ed760' : '#eee' } }}>
              <ShuffleIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Tooltip>

          <IconButton onClick={handleMuteToggle}
            sx={{ color: '#7070a0', padding: '5px', '&:hover': { color: '#eee' } }}
            title={isMuted ? 'Activar sonido' : 'Silenciar'}>
            {isMuted ? <VolumeOffIcon sx={{ fontSize: '1.1rem' }} /> : <VolumeUpIcon sx={{ fontSize: '1.1rem' }} />}
          </IconButton>

          <IconButton onClick={handleFullscreen}
            sx={{ color: '#7070a0', padding: '5px', '&:hover': { color: '#eee' } }}
            title="Pantalla completa">
            <FullscreenIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>

          {/* Live / Alexa button */}
          <Tooltip title={isLive ? 'Emitiendo en /alexa — clic para detener' : currentItem ? 'Emitir en vivo a /alexa' : 'Carga un vídeo para emitir en vivo'}>
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

          {/* Cast button */}
          <Tooltip title={
            isCasting
              ? `Emitiendo en "${castState?.castingTo ?? ''}" — clic para detener`
              : currentItem
                ? 'Emitir en Chromecast'
                : 'Carga un vídeo para emitir'
          }>
            <span> {/* span wrapper so Tooltip works on disabled buttons */}
              <IconButton
                onClick={handleCastButtonClick}
                disabled={!currentItem && !isCasting}
                sx={{
                  padding: '5px',
                  color: isCasting
                    ? '#1db954'
                    : currentItem ? '#7070a0' : '#363660',
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
    </>
  );
};
