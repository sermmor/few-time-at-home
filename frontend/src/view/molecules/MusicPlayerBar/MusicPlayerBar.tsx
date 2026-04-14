import React from 'react';
import { Box, IconButton, Slider, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { CloudItem } from '../../../data-model/cloud';

export const PLAYER_BAR_HEIGHT = '5rem';

interface Props {
  playlist: CloudItem[];
  getStreamUrl: (item: CloudItem) => string;
  onPlaylistChange: (newPlaylist: CloudItem[]) => void;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const MusicPlayerBar = ({ playlist, getStreamUrl, onPlaylistChange }: Props): JSX.Element | null => {
  const audioRef = React.useRef<HTMLAudioElement>(null);

  // Track current song by path so it survives playlist reordering.
  const [currentTrackPath, setCurrentTrackPath] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [dragFromIndex, setDragFromIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  // Refs to avoid stale closures in effects.
  const playlistRef = React.useRef(playlist);
  React.useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  const isPlayingRef = React.useRef(isPlaying);
  React.useLayoutEffect(() => { isPlayingRef.current = isPlaying; });

  const prevPlaylistRef = React.useRef<CloudItem[]>(playlist);

  const currentIndex = currentTrackPath
    ? playlist.findIndex(item => item.path === currentTrackPath)
    : -1;

  // ── Playlist change handler ────────────────────────────────────────────────
  // Runs whenever the playlist array changes (add, remove, reorder).
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
    if (playlist.some(item => item.path === currentTrackPath)) {
      return;
    }

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

    const pl = playlistRef.current;
    const idx = pl.findIndex(item => item.path === currentTrackPath);
    if (idx === -1) return;

    audio.src = getStreamUrl(pl[idx]);
    audio.load();
    if (isPlayingRef.current) {
      audio.play().catch(err => console.error('Audio play error:', err));
    }
  // getStreamUrl is stable as long as currentDrive is unchanged; include it for correctness.
  }, [currentTrackPath, getStreamUrl]);

  // ── Play / pause ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrackPath) return;
    if (isPlaying) {
      audio.play().catch(err => console.error('Audio play error:', err));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrackPath]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const playTrack = (index: number) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentTrackPath(playlist[index].path);
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    const audio = audioRef.current;
    if (currentIndex > 0) {
      playTrack(currentIndex - 1);
    } else if (audio) {
      // Restart current track.
      audio.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < playlist.length - 1) {
      playTrack(currentIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleSeek = (_: Event, value: number | number[]) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(audio.duration)) return;
    const newTime = Array.isArray(value) ? value[0] : value;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
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
  if (playlist.length === 0) return null;

  const currentItem = currentIndex >= 0 ? playlist[currentIndex] : null;

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
            padding: '0.55rem 1rem',
            borderBottom: '1px solid #2e2e4a',
            backgroundColor: '#141428',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}>
            <Typography variant="caption" sx={{
              color: '#7a7a9a',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              fontSize: '0.68rem',
            }}>
              Cola de reproducción · {playlist.length} {playlist.length === 1 ? 'canción' : 'canciones'}
            </Typography>
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
                ? <MusicNoteIcon sx={{ color: '#1db954', fontSize: '0.85rem', flexShrink: 0 }} />
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
        height: PLAYER_BAR_HEIGHT,
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

        {/* Current song name */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          width: { xs: '90px', sm: '170px', md: '210px' },
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          <MusicNoteIcon sx={{ color: '#1db954', fontSize: '1rem', flexShrink: 0 }} />
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
            onClick={() => setIsPlaying(!isPlaying)}
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
            disabled={currentIndex >= playlist.length - 1}
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
      </Box>
    </>
  );
};
