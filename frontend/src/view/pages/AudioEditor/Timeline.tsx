import React, { useRef, useState } from 'react';
import { VolumeX, Volume2, Trash2 } from 'lucide-react';
import type { ClipData, TrackData } from './types';
import { Waveform } from './Waveform';

interface TimelineProps {
  tracks: TrackData[];
  clips: ClipData[];
  activeTrackId: string | null;
  currentTime: number;
  pixelsPerSecond: number;
  onSelectTrack:  (trackId: string) => void;
  onToggleMute:   (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onDeleteTrack:  (trackId: string) => void;
  onSplit:        () => void;
  onMoveClip:     (clipId: string, newStart: number) => void;
  onSelectClip:   (clipId: string | null) => void;
  onSeek:         (time: number) => void;
  onActionStart:  () => void; // pushes undo/redo history
}

const TRACK_HEIGHT = 120;

export const Timeline: React.FC<TimelineProps> = ({
  tracks,
  clips,
  activeTrackId,
  currentTime,
  pixelsPerSecond,
  onSelectTrack,
  onToggleMute,
  onVolumeChange,
  onDeleteTrack,
  onMoveClip,
  onSelectClip,
  onSeek,
  onActionStart,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingClip, setDraggingClip] = useState<{
    id: string;
    startX: number;
    initialStart: number;
  } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingClip && containerRef.current) {
      const deltaX  = e.clientX - draggingClip.startX;
      const newStart = Math.max(0, draggingClip.initialStart + deltaX / pixelsPerSecond);
      onMoveClip(draggingClip.id, newStart);
    }
  };

  const handleMouseUp = () => {
    if (draggingClip) setDraggingClip(null);
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (draggingClip) return;
    if (containerRef.current) {
      const rect   = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
      onSeek(Math.max(0, clickX / pixelsPerSecond));
    }
  };

  const renderRuler = () => {
    const maxEnd           = clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
    const durationToRender = Math.max(600, maxEnd + 60);
    const ticks = [];

    for (let i = 0; i <= durationToRender; i++) {
      ticks.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${i * pixelsPerSecond}px`,
            height: i % 10 === 0 ? '100%' : '30%',
            borderLeft: i % 10 === 0
              ? '1px solid var(--text-muted)'
              : '1px solid var(--border-light)',
            bottom: 0,
          }}
        >
          {i % 10 === 0 && (
            <span style={{
              position: 'absolute',
              top: '2px',
              left: '4px',
              fontSize: '10px',
              color: 'var(--text-muted)',
            }}>
              {Math.floor(i / 60)}:{(i % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>,
      );
    }
    return ticks;
  };

  return (
    <div
      className="glass-panel"
      style={{
        flex: 1,
        margin: '12px 16px',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 0,
      }}
    >
      {/* ── Ruler ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-light)',
        backgroundColor: 'rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}>
        <div style={{ width: '250px', borderRight: '1px solid var(--border-light)', flexShrink: 0 }} />
        <div style={{ flex: 1, height: '30px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            width: '10000px',
            height: '100%',
            transform: containerRef.current
              ? `translateX(-${containerRef.current.scrollLeft}px)`
              : 'none',
          }}>
            {renderRuler()}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* ── Track headers (left sidebar) ── */}
        <div style={{
          width: '250px',
          borderRight: '1px solid var(--border-light)',
          flexShrink: 0,
          overflowY: 'auto',
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}>
          {tracks.map(track => (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              style={{
                height: `${TRACK_HEIGHT}px`,
                borderBottom: '1px solid var(--border-light)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: activeTrackId === track.id
                  ? 'rgba(99,102,241,0.2)'
                  : 'transparent',
                borderLeft: activeTrackId === track.id
                  ? '4px solid var(--accent-primary)'
                  : '4px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  checked={activeTrackId === track.id}
                  onChange={() => onSelectTrack(track.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span style={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: track.muted ? 'var(--text-muted)' : 'var(--text-main)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {track.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', paddingLeft: '20px', alignItems: 'center' }}>
                <button
                  className="btn-icon"
                  style={{ padding: '4px', color: track.muted ? 'var(--danger)' : 'var(--text-muted)' }}
                  onClick={e => { e.stopPropagation(); onActionStart(); onToggleMute(track.id); }}
                  title={track.muted ? 'Unmute Track' : 'Mute Track'}
                >
                  {track.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>

                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={track.volume ?? 1}
                  title="Track Volume"
                  onMouseDown={e => { e.stopPropagation(); onActionStart(); }}
                  onClick={e => e.stopPropagation()}
                  onMouseUp={e => e.stopPropagation()}
                  onChange={e => { e.stopPropagation(); onVolumeChange(track.id, parseFloat(e.target.value)); }}
                  style={{ flex: 1, cursor: 'pointer', height: '4px', accentColor: 'var(--accent-primary)' }}
                />

                <button
                  className="btn-icon"
                  style={{ padding: '4px' }}
                  onClick={e => { e.stopPropagation(); onDeleteTrack(track.id); }}
                  title="Delete Track"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Clip canvas area ── */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflowX: 'auto',
            overflowY: 'auto',
            cursor: 'text',
          }}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div style={{
            position: 'absolute',
            width: '10000px',
            height: `${Math.max(200, tracks.length * TRACK_HEIGHT)}px`,
          }}>
            {/* Track row backgrounds */}
            {tracks.map((track, idx) => (
              <div
                key={track.id}
                style={{
                  position: 'absolute',
                  top: `${idx * TRACK_HEIGHT}px`,
                  left: 0,
                  width: '100%',
                  height: `${TRACK_HEIGHT}px`,
                  borderBottom: '1px solid var(--border-light)',
                  backgroundColor: activeTrackId === track.id
                    ? 'rgba(99,102,241,0.05)'
                    : 'transparent',
                  opacity: track.muted ? 0.4 : 1,
                }}
              />
            ))}

            {/* Clips */}
            {clips.map(clip => {
              const trackIdx = tracks.findIndex(t => t.id === clip.trackId);
              if (trackIdx === -1) return null;
              const track = tracks[trackIdx];

              const clipBgColor  = clip.selected ? 'rgba(199,210,254,0.4)' : 'rgba(200,200,200,0.15)';
              const borderColor  = clip.selected ? 'var(--accent-primary)' : 'var(--border-light)';

              return (
                <div
                  key={clip.id}
                  style={{
                    position: 'absolute',
                    left: `${clip.start * pixelsPerSecond}px`,
                    width: `${clip.duration * pixelsPerSecond}px`,
                    height: `${TRACK_HEIGHT - 20}px`,
                    top: `${trackIdx * TRACK_HEIGHT + 10}px`,
                    backgroundColor: clipBgColor,
                    border: `1px solid ${borderColor}`,
                    boxShadow: clip.selected ? `0 0 0 2px var(--accent-primary)` : undefined,
                    borderRadius: '8px',
                    cursor: draggingClip?.id === clip.id ? 'grabbing' : 'grab',
                    overflow: 'hidden',
                    transition: draggingClip?.id === clip.id ? 'none' : 'background-color 0.2s',
                    zIndex: clip.selected ? 10 : 1,
                    opacity: track.muted ? 0.4 : 1,
                  }}
                  onMouseDown={e => {
                    e.stopPropagation();
                    if (e.button === 0) {
                      onActionStart();
                      setDraggingClip({ id: clip.id, startX: e.clientX, initialStart: clip.start });
                      onSelectClip(clip.id);
                      onSelectTrack(clip.trackId);
                    }
                  }}
                  onContextMenu={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectClip(clip.id);
                    onSelectTrack(clip.trackId);
                  }}
                >
                  <Waveform
                    clip={clip}
                    width={clip.duration * pixelsPerSecond}
                    height={TRACK_HEIGHT - 20}
                    pixelsPerSecond={pixelsPerSecond}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '4px 6px',
                    background: 'rgba(0,0,0,0.7)',
                    fontSize: '11px',
                    color: 'white',
                    pointerEvents: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {clip.sourceFile.split('\\').pop() || clip.sourceFile}
                    </span>
                    {clip.fadeMode && clip.fadeMode !== 'normal' && (
                      <span style={{ fontWeight: 'bold' }}>{clip.fadeMode}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Playhead */}
            <div style={{
              position: 'absolute',
              left: `${currentTime * pixelsPerSecond}px`,
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: 'var(--accent-primary)',
              boxShadow: '0 0 10px var(--accent-primary)',
              zIndex: 20,
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute',
                top: '-5px',
                left: '-4px',
                width: '10px',
                height: '10px',
                backgroundColor: 'var(--accent-primary)',
                borderRadius: '50%',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
