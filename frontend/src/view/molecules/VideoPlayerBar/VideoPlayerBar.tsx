import React from 'react';
import { Box, IconButton, Slider, Tooltip, Typography } from '@mui/material';
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
import { CloudItem } from '../../../data-model/cloud';
import { ModalVideoCloudBrowser } from './ModalVideoCloudBrowser';
import { ModalNetworkBrowser } from './ModalNetworkBrowser';

export const VIDEO_PLAYER_BAR_HEIGHT = '5rem';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  playlist: CloudItem[];
  currentTrackPath: string | null;
  onPlaylistChange: (newPlaylist: CloudItem[]) => void;
  onTrackChange: (path: string) => void;
  onAddVideos: (items: CloudItem[]) => void;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const VideoPlayerBar = ({
  videoRef,
  playlist,
  currentTrackPath,
  onPlaylistChange,
  onTrackChange,
  onAddVideos,
}: Props): JSX.Element | null => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isShuffleOn, setIsShuffleOn] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = React.useState(false);
  const [isNetworkBrowserOpen, setIsNetworkBrowserOpen] = React.useState(false);
  const [dragFromIndex, setDragFromIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  // History of paths that have been played, used to avoid repeating recent
  // videos in shuffle mode. Capped at 2× playlist length.
  const shuffleHistoryRef = React.useRef<string[]>([]);

  const currentIndex = currentTrackPath
    ? playlist.findIndex(item => item.path === currentTrackPath)
    : -1;
  const currentItem = currentIndex >= 0 ? playlist[currentIndex] : null;

  // ── Shuffle: pick a random path that is neither the current video nor among
  //    the last ~10 % of recently played videos. Falls back gracefully for
  //    small playlists. ────────────────────────────────────────────────────────
  const pickShuffleNext = (): string | null => {
    if (playlist.length <= 1) return null;

    // How many recent entries to exclude: 10 % of playlist, minimum 1.
    const historyLimit = Math.max(1, Math.floor(playlist.length * 0.1));
    const recentHistory = shuffleHistoryRef.current.slice(-historyLimit);

    const excluded = new Set<string>([
      ...(currentTrackPath ? [currentTrackPath] : []),
      ...recentHistory,
    ]);

    let candidates = playlist.map(i => i.path).filter(p => !excluded.has(p));

    // Fallback: exclusion window too wide for this playlist size — just avoid
    // replaying the very last video.
    if (candidates.length === 0) {
      candidates = playlist.map(i => i.path).filter(p => p !== currentTrackPath);
    }

    if (candidates.length === 0) return null;

    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  // ── Controls ──────────────────────────────────────────────────────────────
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(err => console.error('Video play error:', err));
    } else {
      video.pause();
    }
  };

  const handlePrev = () => {
    const video = videoRef.current;
    if (currentIndex > 0) {
      onTrackChange(playlist[currentIndex - 1].path);
    } else if (video) {
      video.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleNext = React.useCallback(() => {
    if (isShuffleOn) {
      // Record current video in history before moving on.
      if (currentTrackPath) {
        const maxHistory = Math.max(playlist.length * 2, 20);
        shuffleHistoryRef.current = [
          ...shuffleHistoryRef.current.slice(-(maxHistory - 1)),
          currentTrackPath,
        ];
      }
      const nextPath = pickShuffleNext();
      if (nextPath) {
        onTrackChange(nextPath);
      } else {
        videoRef.current?.pause();
      }
    } else {
      if (currentIndex >= 0 && currentIndex < playlist.length - 1) {
        onTrackChange(playlist[currentIndex + 1].path);
      } else {
        videoRef.current?.pause();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentTrackPath, isShuffleOn, playlist, onTrackChange]);

  // Keep a stable ref so the video 'ended' listener always calls the latest
  // handleNext without needing to re-attach the listener on every render.
  const handleNextRef = React.useRef(handleNext);
  React.useLayoutEffect(() => { handleNextRef.current = handleNext; });

  const handleSeek = (_: Event, value: number | number[]) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;
    const newTime = Array.isArray(value) ? value[0] : value;
    video.currentTime = newTime;
    setCurrentTime(newTime);
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
    if (video.requestFullscreen) {
      video.requestFullscreen().catch(err => console.error('Fullscreen error:', err));
    }
  };

  // ── Sync video events → state ─────────────────────────────────────────────
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration ?? 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    // Delegate to the ref so the listener is never stale.
    const onEnded = () => handleNextRef.current();

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef.current]);

  // ── Playlist management ───────────────────────────────────────────────────
  const handleRemove = (index: number) => {
    onPlaylistChange(playlist.filter((_, i) => i !== index));
  };

  const playTrack = (index: number) => {
    if (index >= 0 && index < playlist.length) {
      onTrackChange(playlist[index].path);
    }
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
      setDragFromIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newPlaylist = [...playlist];
    const [moved] = newPlaylist.splice(dragFromIndex, 1);
    newPlaylist.splice(dropIndex, 0, moved);
    onPlaylistChange(newPlaylist);
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  // ── Render guard ──────────────────────────────────────────────────────────
  if (playlist.length === 0 && !isBrowserOpen && !isNetworkBrowserOpen) {
    return (
      <>
        <ModalVideoCloudBrowser
          isOpen={isBrowserOpen}
          onClose={() => setIsBrowserOpen(false)}
          onAddVideos={onAddVideos}
        />
        <ModalNetworkBrowser
          isOpen={isNetworkBrowserOpen}
          onClose={() => setIsNetworkBrowserOpen(false)}
          onAddVideos={onAddVideos}
        />
        {/* Minimal bar when playlist is empty */}
        <Box sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: VIDEO_PLAYER_BAR_HEIGHT,
          backgroundColor: '#1a1a2e',
          borderTop: '1px solid #3a3a5c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 1rem',
          zIndex: 1200,
          boxShadow: '0 -2px 14px rgba(0,0,0,0.55)',
        }}>
          <IconButton
            onClick={() => setIsBrowserOpen(true)}
            sx={{
              color: '#a0a0c0',
              gap: '0.5rem',
              borderRadius: '8px',
              padding: '0.4rem 1rem',
              '&:hover': { color: '#eee', backgroundColor: 'rgba(255,255,255,0.06)' },
            }}
          >
            <PlaylistAddIcon />
            <Typography variant="body2" sx={{ color: 'inherit', fontSize: '0.85rem' }}>
              Añadir vídeos
            </Typography>
          </IconButton>
          <IconButton
            onClick={() => setIsNetworkBrowserOpen(true)}
            sx={{ color: '#a0a0c0', gap: '0.5rem', borderRadius: '8px', padding: '0.4rem 1rem',
              '&:hover': { color: '#eee', backgroundColor: 'rgba(255,255,255,0.06)' } }}
          >
            <LanIcon />
            <Typography variant="body2" sx={{ color: 'inherit', fontSize: '0.85rem' }}>
              Añadir desde red
            </Typography>
          </IconButton>
        </Box>
      </>
    );
  }

  // Skip-next is enabled in shuffle mode as long as there are ≥ 2 videos.
  const isNextDisabled = isShuffleOn ? playlist.length <= 1 : currentIndex >= playlist.length - 1;

  return (
    <>
      <ModalVideoCloudBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onAddVideos={onAddVideos}
      />
      <ModalNetworkBrowser
        isOpen={isNetworkBrowserOpen}
        onClose={() => setIsNetworkBrowserOpen(false)}
        onAddVideos={onAddVideos}
      />

      {/* ── Playlist panel ── */}
      {isExpanded && (
        <Box sx={{
          position: 'fixed',
          bottom: VIDEO_PLAYER_BAR_HEIGHT,
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
            padding: '0.55rem 1rem',
            borderBottom: '1px solid #2e2e4a',
            backgroundColor: '#141428',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Typography variant="caption" sx={{
              color: '#7a7a9a',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              fontSize: '0.68rem',
            }}>
              Cola de reproducción · {playlist.length} {playlist.length === 1 ? 'vídeo' : 'vídeos'}
            </Typography>
            <Tooltip title="Añadir más vídeos">
              <IconButton
                size="small"
                onClick={() => setIsBrowserOpen(true)}
                sx={{ color: '#7a7a9a', padding: '4px', '&:hover': { color: '#1db954' } }}
              >
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
                display: 'flex',
                alignItems: 'center',
                padding: '0.4rem 0.75rem',
                gap: '0.45rem',
                backgroundColor:
                  dragOverIndex === idx && dragFromIndex !== idx
                    ? 'rgba(29,185,84,0.14)'
                    : idx === currentIndex
                      ? 'rgba(29,185,84,0.07)'
                      : 'transparent',
                borderBottom: '1px solid #22223a',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background-color 0.12s',
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
                flexGrow: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.8rem',
                fontWeight: idx === currentIndex ? 600 : 400,
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
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: VIDEO_PLAYER_BAR_HEIGHT,
        backgroundColor: '#1a1a2e',
        borderTop: '1px solid #3a3a5c',
        display: 'flex',
        alignItems: 'center',
        padding: '0 0.75rem',
        gap: '0.5rem',
        zIndex: 1200,
        boxShadow: '0 -2px 14px rgba(0,0,0,0.55)',
      }}>
        {/* Toggle playlist panel */}
        <IconButton
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{
            color: isExpanded ? '#1db954' : '#7070a0',
            flexShrink: 0,
            padding: '5px',
            '&:hover': { color: '#eee' },
          }}
          title={isExpanded ? 'Ocultar cola' : 'Ver cola de reproducción'}
        >
          {isExpanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>

        {/* Current video name */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          width: { xs: '90px', sm: '170px', md: '210px' },
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          <VideoFileIcon sx={{ color: '#1db954', fontSize: '1rem', flexShrink: 0 }} />
          <Typography
            variant="body2"
            sx={{
              color: '#e0e0f0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.75rem',
            }}
            title={currentItem?.name}
          >
            {currentItem?.name ?? ''}
          </Typography>
        </Box>

        {/* Playback controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.1rem', flexShrink: 0 }}>
          <IconButton
            onClick={handlePrev}
            sx={{ color: '#a0a0c0', padding: '6px', '&:hover': { color: '#eee' } }}
            title="Anterior"
          >
            <SkipPreviousIcon />
          </IconButton>

          <IconButton
            onClick={handlePlayPause}
            sx={{
              color: '#fff',
              backgroundColor: '#1db954',
              padding: '6px',
              '&:hover': { backgroundColor: '#1ed760' },
              '& svg': { fontSize: '1.4rem' },
            }}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <IconButton
            onClick={handleNext}
            disabled={isNextDisabled}
            sx={{ color: '#a0a0c0', padding: '6px', '&:disabled': { color: '#363660' }, '&:hover': { color: '#eee' } }}
            title="Siguiente"
          >
            <SkipNextIcon />
          </IconButton>
        </Box>

        {/* Progress bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, minWidth: 0 }}>
          <Typography variant="caption" sx={{
            color: '#7070a0',
            flexShrink: 0,
            fontSize: '0.68rem',
            fontVariantNumeric: 'tabular-nums',
            minWidth: '2.5rem',
            textAlign: 'right',
          }}>
            {formatTime(currentTime)}
          </Typography>

          <Slider
            size="small"
            min={0}
            max={duration > 0 ? duration : 100}
            value={isFinite(currentTime) ? currentTime : 0}
            onChange={handleSeek}
            sx={{
              color: '#1db954',
              padding: '10px 0',
              '& .MuiSlider-thumb': {
                width: 10,
                height: 10,
                transition: 'width 0.1s, height 0.1s',
                '&:hover, &.Mui-focusVisible': { width: 14, height: 14, boxShadow: '0 0 0 6px rgba(29,185,84,0.18)' },
              },
              '& .MuiSlider-track': { height: 3 },
              '& .MuiSlider-rail': { height: 3, backgroundColor: '#36366a', opacity: 1 },
            }}
          />

          <Typography variant="caption" sx={{
            color: '#7070a0',
            flexShrink: 0,
            fontSize: '0.68rem',
            fontVariantNumeric: 'tabular-nums',
            minWidth: '2.5rem',
          }}>
            {formatTime(duration)}
          </Typography>
        </Box>

        {/* Extra controls: shuffle + mute + fullscreen */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Tooltip title={isShuffleOn ? 'Reproducción aleatoria activada' : 'Activar reproducción aleatoria'}>
            <IconButton
              onClick={() => setIsShuffleOn(prev => !prev)}
              sx={{
                padding: '5px',
                color: isShuffleOn ? '#1db954' : '#7070a0',
                '&:hover': { color: isShuffleOn ? '#1ed760' : '#eee' },
              }}
            >
              <ShuffleIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Tooltip>

          <IconButton
            onClick={handleMuteToggle}
            sx={{ color: '#7070a0', padding: '5px', '&:hover': { color: '#eee' } }}
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeOffIcon sx={{ fontSize: '1.1rem' }} /> : <VolumeUpIcon sx={{ fontSize: '1.1rem' }} />}
          </IconButton>

          <IconButton
            onClick={handleFullscreen}
            sx={{ color: '#7070a0', padding: '5px', '&:hover': { color: '#eee' } }}
            title="Pantalla completa"
          >
            <FullscreenIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Box>
      </Box>
    </>
  );
};
