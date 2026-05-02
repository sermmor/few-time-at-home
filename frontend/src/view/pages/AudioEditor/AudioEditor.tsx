import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Scissors, Trash2, FolderOpen, Save,
  ZoomIn, ZoomOut, AlertTriangle, X, Undo2, Redo2,
  Activity, CheckCircle2,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Timeline } from './Timeline';
import { audioEngine } from './AudioEngine';
import type { ClipData, TrackData } from './types';
import {
  audioEditorUploadTempEndpoint,
  audioEditorDownloadExportEndpoint,
} from '../../../core/urls-and-end-points';
import './AudioEditor.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryState {
  tracks: TrackData[];
  clips: ClipData[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export const AudioEditor: React.FC = () => {

  // ── State ──────────────────────────────────────────────────────────────────

  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [clips,  setClips ] = useState<ClipData[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [currentTime,   setCurrentTime  ] = useState(0);
  const [isPlaying,     setIsPlaying    ] = useState(false);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);
  const [isExporting,   setIsExporting  ] = useState(false);

  // Modals
  const [trackToDelete,  setTrackToDelete ] = useState<string | null>(null);
  const [openModalFile,  setOpenModalFile ] = useState<File | null>(null);
  const [openTimeStr,    setOpenTimeStr   ] = useState('00:00');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFilename,  setExportFilename ] = useState('project');
  const [exportFormat,    setExportFormat   ] = useState('mp3');

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Undo / Redo
  const [history,      setHistory     ] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const animationRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar(null), 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms   = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getActiveClips = useCallback(
    () => clips.filter(c => {
      const track = tracks.find(t => t.id === c.trackId);
      return track && !track.muted;
    }),
    [clips, tracks],
  );

  // ── Undo / Redo ────────────────────────────────────────────────────────────

  const pushHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        tracks: JSON.parse(JSON.stringify(tracks)),
        clips:  clips.map(c => ({ ...c })),
      });
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [tracks, clips, historyIndex]);

  const undo = () => {
    if (historyIndex >= 0) {
      const prev = history[historyIndex];
      setTracks(prev.tracks.map(t => ({ ...t })));
      setClips(prev.clips.map(c => ({ ...c })));
      setHistoryIndex(i => i - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 2) {
      const next = history[historyIndex + 2];
      setTracks(next.tracks.map(t => ({ ...t })));
      setClips(next.clips.map(c => ({ ...c })));
      setHistoryIndex(i => i + 1);
    } else if (historyIndex === history.length - 2) {
      const next = history[historyIndex + 1];
      setTracks(next.tracks.map(t => ({ ...t })));
      setClips(next.clips.map(c => ({ ...c })));
      setHistoryIndex(i => i + 1);
    }
  };

  // ── Playback ────────────────────────────────────────────────────────────────

  const updateCurrentTime = useCallback(() => {
    if (audioEngine.isPlaying) {
      setCurrentTime(audioEngine.getCurrentTime());
      animationRef.current = requestAnimationFrame(updateCurrentTime);
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      audioEngine.play(getActiveClips(), tracks, currentTime);
      animationRef.current = requestAnimationFrame(updateCurrentTime);
    } else {
      audioEngine.pause();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, updateCurrentTime]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayPause = () => setIsPlaying(p => !p);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    audioEngine.setPauseTime(time);
    if (isPlaying) { audioEngine.pause(); setIsPlaying(false); }
  }, [isPlaying]);

  // ── File open ───────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setOpenModalFile(file);
      const currentMins = Math.floor(currentTime / 60);
      const currentSecs = Math.floor(currentTime % 60);
      setOpenTimeStr(
        `${currentMins.toString().padStart(2, '0')}:${currentSecs.toString().padStart(2, '0')}`,
      );
    }
    e.target.value = '';
  };

  const confirmOpen = async () => {
    if (!openModalFile) return;

    let startTime = 0;
    const parts = openTimeStr.split(':');
    if (parts.length === 2) {
      startTime = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      if (isNaN(startTime)) startTime = 0;
    }

    try {
      const objectUrl = URL.createObjectURL(openModalFile);
      const buffer    = await audioEngine.loadAudio(objectUrl);

      pushHistory();

      const trackId = uuidv4();

      const newTrack: TrackData = {
        id:     trackId,
        name:   openModalFile.name,
        muted:  false,
        volume: 1.0,
      };

      const newClip: ClipData = {
        id:         uuidv4(),
        trackId,
        buffer,
        start:      startTime,
        duration:   buffer.duration,
        offset:     0,
        sourceFile: openModalFile.name,
        selected:   false,
        fadeMode:   'normal',
      };

      setTracks(prev => [...prev, newTrack]);
      setClips(prev  => [...prev, newClip]);
      setActiveTrackId(trackId);

      if (tracks.length === 0 && startTime === 0) {
        setCurrentTime(0);
        audioEngine.setPauseTime(0);
      }

      setOpenModalFile(null);
    } catch (err) {
      console.error('Failed to open file', err);
      showSnackbar('Error opening audio file.', 'error');
    }
  };

  // ── Edit operations ─────────────────────────────────────────────────────────

  const handleSplit = useCallback(() => {
    if (!activeTrackId) return;
    pushHistory();
    setClips(prev => {
      const newClips = [...prev];
      const idx = newClips.findIndex(
        c => c.trackId === activeTrackId && currentTime > c.start && currentTime < c.start + c.duration,
      );
      if (idx === -1) {
        setHistoryIndex(i => i - 1);
        setHistory(h => h.slice(0, -1));
        return prev;
      }
      const orig       = newClips[idx];
      const splitPoint = currentTime - orig.start;
      const clip1: ClipData = { ...orig, id: uuidv4(), duration: splitPoint,  selected: false };
      const clip2: ClipData = {
        ...orig,
        id:       uuidv4(),
        start:    currentTime,
        offset:   orig.offset + splitPoint,
        duration: orig.duration - splitPoint,
        selected: true,
      };
      newClips.splice(idx, 1, clip1, clip2);
      return newClips;
    });
  }, [activeTrackId, currentTime, pushHistory]);

  const handleDelete = useCallback(() => {
    if (!clips.some(c => c.selected)) return;
    pushHistory();
    setClips(prev => prev.filter(c => !c.selected));
  }, [clips, pushHistory]);

  const cycleFadeMode = useCallback(() => {
    const idx = clips.findIndex(c => c.selected);
    if (idx === -1) return;
    pushHistory();
    setClips(prev => {
      const next = [...prev];
      const clip = next[idx];
      let nextMode: ClipData['fadeMode'] = 'normal';
      if (clip.fadeMode === 'normal')   nextMode = 'fade-in';
      else if (clip.fadeMode === 'fade-in')  nextMode = 'fade-out';
      else if (clip.fadeMode === 'fade-out') nextMode = 'fade-in-out';
      next[idx] = { ...clip, fadeMode: nextMode };
      return next;
    });
  }, [clips, pushHistory]);

  const confirmDeleteTrack = () => {
    if (trackToDelete) {
      pushHistory();
      setTracks(prev => prev.filter(t => t.id !== trackToDelete));
      setClips(prev  => prev.filter(c => c.trackId !== trackToDelete));
      if (activeTrackId === trackToDelete) setActiveTrackId(null);
      setTrackToDelete(null);
      if (isPlaying) handlePlayPause();
    }
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        trackToDelete || openModalFile || exportModalOpen
      ) return;

      if (e.key === 'Delete') {
        handleDelete();
      } else if (e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleSplit();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(currentTime + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setTracks(prev => {
          if (prev.length === 0) return prev;
          const idx = prev.findIndex(t => t.id === activeTrackId);
          if (idx > 0) setActiveTrackId(prev[idx - 1].id);
          return prev;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setTracks(prev => {
          if (prev.length === 0) return prev;
          const idx = prev.findIndex(t => t.id === activeTrackId);
          if (idx < prev.length - 1 && idx !== -1) setActiveTrackId(prev[idx + 1].id);
          else if (idx === -1) setActiveTrackId(prev[0].id);
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, handleSplit, currentTime, activeTrackId, handleSeek, trackToDelete, openModalFile, exportModalOpen]);

  // ── Export ──────────────────────────────────────────────────────────────────

  const confirmExport = async () => {
    setIsExporting(true);
    setExportModalOpen(false);

    try {
      const activeClipsToRender = getActiveClips();
      const wavBlob = await audioEngine.renderToWav(activeClipsToRender, tracks);

      const baseName  = (exportFilename || 'project').replace(/\.(wav|mp3|flac)$/i, '');
      const formData  = new FormData();
      formData.append('audioBlob', wavBlob, 'temp.wav');

      const res = await fetch(audioEditorUploadTempEndpoint(), {
        method: 'POST',
        body:   formData,
      });
      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();

      const downloadUrl =
        `${audioEditorDownloadExportEndpoint()}` +
        `?id=${data.id}` +
        `&filename=${encodeURIComponent(baseName)}` +
        `&format=${exportFormat}`;

      // Trigger the download via a hidden <a> element instead of window.location.href.
      // Using location.href causes the browser to briefly treat it as a navigation,
      // which interrupts in-flight fetch calls and generates JSON-parse errors.
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showSnackbar('¡Procesando exportación! La descarga comenzará pronto.', 'success');
    } catch (err) {
      console.error(err);
      showSnackbar('Error al exportar el archivo.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Toolbar panel styles (shared) ───────────────────────────────────────────

  const toolGroup = {
    display: 'flex',
    gap: '8px',
    background: 'var(--ae-bg-panel)',
    padding: '6px',
    borderRadius: '12px',
    border: '1px solid var(--border-light)',
    alignItems: 'center' as const,
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="audio-editor-root">

      {/* ── Hidden file input ── */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="audio/*"
        onChange={handleFileChange}
      />

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px 16px',
        gap: '16px',
        background: 'rgba(0,0,0,0.2)',
        flexWrap: 'wrap',
        flexShrink: 0,
        borderBottom: '1px solid var(--border-light)',
      }}>

        {/* Open / Export */}
        <div style={toolGroup}>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <FolderOpen size={16} /> Open
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setExportModalOpen(true)}
            disabled={clips.length === 0 || isExporting}
          >
            <Save size={16} /> {isExporting ? 'Exporting…' : 'Export'}
          </button>
        </div>

        {/* Undo / Redo */}
        <div style={toolGroup}>
          <button className="btn-icon" onClick={undo}  disabled={historyIndex < 0}                title="Undo (Ctrl+Z)"><Undo2 size={20} /></button>
          <button className="btn-icon" onClick={redo}  disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)"><Redo2 size={20} /></button>
        </div>

        {/* Play / Pause */}
        <div style={toolGroup}>
          <button className={`btn-icon ${isPlaying ? 'active' : ''}`} onClick={handlePlayPause}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>

        {/* Time display */}
        <div style={{
          fontFamily: 'monospace',
          fontSize: '1.15rem',
          fontWeight: 600,
          color: 'var(--accent-primary)',
          background: 'var(--ae-bg-panel)',
          padding: '8px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border-light)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
          minWidth: '110px',
          textAlign: 'center',
        }}>
          {formatTime(currentTime)}
        </div>

        {/* Edit tools */}
        <div style={toolGroup}>
          <button
            className="btn-icon"
            onClick={handleSplit}
            disabled={!activeTrackId}
            title="Split at cursor (Shift+T)"
          >
            <Scissors size={20} />
          </button>
          <button
            className="btn-icon"
            onClick={cycleFadeMode}
            disabled={!clips.some(c => c.selected)}
            title="Cycle fade mode"
          >
            <Activity
              size={20}
              color={clips.some(c => c.selected) ? 'var(--accent-primary)' : 'currentColor'}
            />
          </button>
          <button
            className="btn-icon"
            onClick={handleDelete}
            disabled={!clips.some(c => c.selected)}
            title="Delete selected clip (Del)"
          >
            <Trash2
              size={20}
              color={clips.some(c => c.selected) ? 'var(--danger)' : 'currentColor'}
            />
          </button>
        </div>

        {/* Zoom */}
        <div style={toolGroup}>
          <button className="btn-icon" onClick={() => setPixelsPerSecond(p => Math.max(10,  p - 10))}><ZoomOut size={20} /></button>
          <span style={{ fontSize: '12px', width: '44px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {pixelsPerSecond}px/s
          </span>
          <button className="btn-icon" onClick={() => setPixelsPerSecond(p => Math.min(200, p + 10))}><ZoomIn  size={20} /></button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <Timeline
          tracks={tracks}
          clips={clips}
          activeTrackId={activeTrackId}
          currentTime={currentTime}
          pixelsPerSecond={pixelsPerSecond}
          onActionStart={pushHistory}
          onSelectTrack={setActiveTrackId}
          onToggleMute={trackId => setTracks(prev => prev.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t))}
          onVolumeChange={(trackId, volume) => setTracks(prev => prev.map(t => t.id === trackId ? { ...t, volume } : t))}
          onDeleteTrack={setTrackToDelete}
          onSplit={handleSplit}
          onMoveClip={(clipId, newStart) => setClips(prev => prev.map(c => c.id === clipId ? { ...c, start: newStart } : c))}
          onSelectClip={clipId => setClips(prev => prev.map(c => ({ ...c, selected: c.id === clipId })))}
          onSeek={handleSeek}
        />

        {/* Empty state */}
        {tracks.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '55%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}>
            <FolderOpen size={48} style={{ opacity: 0.4, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
            <h2 style={{ marginBottom: '8px', fontWeight: 600 }}>No hay audio cargado</h2>
            <p style={{ fontSize: '0.9rem' }}>Haz clic en "Open" para seleccionar un fichero de audio.</p>
          </div>
        )}
      </div>

      {/* ── Insert audio modal ── */}
      {openModalFile && (
        <div className="audio-editor-modal-overlay">
          <div className="audio-editor-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Insert Audio</h3>
              <button className="btn-icon" onClick={() => setOpenModalFile(null)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.9rem' }}>Selected file:</p>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '20px', wordBreak: 'break-all' }}>
                {openModalFile.name}
              </div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.9rem' }}>
                Insert at time (MM:SS):
              </label>
              <input
                type="text"
                className="audio-editor-input"
                style={{ fontFamily: 'monospace' }}
                value={openTimeStr}
                onChange={e => setOpenTimeStr(e.target.value)}
                placeholder="00:00"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setOpenModalFile(null)}>Cancel</button>
              <button className="btn btn-primary"   onClick={confirmOpen}>Insert Audio</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Export modal ── */}
      {exportModalOpen && (
        <div className="audio-editor-modal-overlay">
          <div className="audio-editor-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Export Project</h3>
              <button className="btn-icon" onClick={() => setExportModalOpen(false)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.9rem' }}>Filename:</label>
              <input
                type="text"
                className="audio-editor-input"
                value={exportFilename}
                onChange={e => setExportFilename(e.target.value)}
                placeholder="My Awesome Track"
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.9rem' }}>Format:</label>
              <select
                className="audio-editor-select"
                value={exportFormat}
                onChange={e => setExportFormat(e.target.value)}
              >
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="flac">FLAC</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setExportModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary"   onClick={confirmExport}>Download</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete track modal ── */}
      {trackToDelete && (
        <div className="audio-editor-modal-overlay">
          <div className="audio-editor-modal-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <AlertTriangle size={24} color="var(--danger)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Borrar Pista</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              ¿Está seguro de eliminar esta pista y todos sus recortes asociados? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setTrackToDelete(null)}>Cancelar</button>
              <button className="btn btn-danger"    onClick={confirmDeleteTrack}>Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Snackbar ── */}
      {snackbar && (
        <div
          className="audio-editor-snackbar"
          style={{ background: snackbar.type === 'success' ? 'var(--accent-primary)' : 'var(--danger)' }}
        >
          {snackbar.type === 'success'
            ? <CheckCircle2 size={20} />
            : <AlertTriangle size={20} />}
          {snackbar.message}
        </div>
      )}
    </div>
  );
};
