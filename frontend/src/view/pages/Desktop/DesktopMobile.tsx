import React from 'react';
import { DesktopLink, StickyNote } from '../../../core/actions/desktop';
import { StickyNoteWidget } from './StickyNoteWidget';
import { DesktopMobileLinkTile, MobileTileAction } from './DesktopMobileLinkTile';
import {
  CANVAS_TOP_OFFSET,
  CANVAS_TOP_MARGIN,
  MOBILE_WS_W, MOBILE_WS_H, WS_GAP, WS_PADDING, WS_RADIUS,
  wsColor,
  EXIT_ANIM,
  SLIDE_KEYFRAMES,
  SlideState,
} from './DesktopCommons';

// ── Phone canvas width ────────────────────────────────────────────────────────
// 390 px matches iPhone 14/15 Pro and Pixel 8 logical width.
const PHONE_W = 390;

// ── Props ─────────────────────────────────────────────────────────────────────
export interface DesktopMobileProps {
  activeWs:         number;
  setActiveWs:      React.Dispatch<React.SetStateAction<number>>;
  slide:            SlideState | null;
  setSlide:         React.Dispatch<React.SetStateAction<SlideState | null>>;
  activeWallpaper:  string | null;
  linksForActiveWs: DesktopLink[];
  notesForActiveWs: StickyNote[];
  onDeleteLink:     (id: string) => void;
  onEditLink:       (link: DesktopLink) => void;
  onAddLink:        () => void;
  onUpdateNote:     (id: string, changes: Partial<StickyNote>) => void;
  onDeleteNote:     (id: string) => void;
  onPropsOpen:      () => void;
  /** Total number of workspaces (= COLS, since mobile mode has 1 implicit row). */
  COLS:             number;
  wsOverlayVisible: boolean;
}

// ── Floating nav arrow (small rounded button, not full-height strip) ───────────
// Positioned at the vertical centre of the canvas so it never covers icon rows.
const NavBtn: React.FC<{ dir: 'left' | 'right'; onClick: () => void }> = ({ dir, onClick }) => (
  <button
    onClick={onClick}
    title={dir === 'left' ? 'Escritorio anterior' : 'Escritorio siguiente'}
    style={{
      position:                'absolute',
      top:                     '50%',
      [dir]:                   '4px',
      transform:               'translateY(-50%)',
      width:                   '28px',
      height:                  '52px',
      borderRadius:            '8px',
      background:              'rgba(2,12,24,0.55)',
      backdropFilter:          'blur(6px)',
      border:                  '1px solid rgba(255,255,255,0.18)',
      boxShadow:               '0 2px 8px rgba(0,0,0,0.45)',
      color:                   'rgba(255,255,255,0.9)',
      fontSize:                '1.5rem',
      lineHeight:              1,
      cursor:                  'pointer',
      display:                 'flex',
      alignItems:              'center',
      justifyContent:          'center',
      zIndex:                  150,
      WebkitTapHighlightColor: 'transparent',
      userSelect:              'none',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(2,12,24,0.75)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(2,12,24,0.55)')}
  >
    {dir === 'left' ? '‹' : '›'}
  </button>
);

// ── ToolbarBtn ────────────────────────────────────────────────────────────────
interface ToolbarBtnProps {
  label:       string;
  title:       string;
  active:      boolean;
  activeColor: string;
  onClick:     () => void;
}

const ToolbarBtn: React.FC<ToolbarBtnProps> = ({ label, title, active, activeColor, onClick }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width:                   '40px',
      height:                  '40px',
      borderRadius:            '50%',
      backgroundColor:         active ? `${activeColor}33` : 'rgba(255,255,255,0.08)',
      border:                  active
        ? `1.5px solid ${activeColor}`
        : '1.5px solid rgba(255,255,255,0.18)',
      boxShadow:               active ? `0 0 10px ${activeColor}66` : 'none',
      color:                   '#fff',
      fontSize:                label === '+' ? '22px' : '16px',
      lineHeight:              1,
      cursor:                  'pointer',
      display:                 'flex',
      alignItems:              'center',
      justifyContent:          'center',
      transition:              'transform 0.12s ease, background-color 0.12s ease',
      WebkitTapHighlightColor: 'transparent',
      userSelect:              'none',
    }}
    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
  >
    {label}
  </button>
);

// ── DesktopMobile ─────────────────────────────────────────────────────────────
export const DesktopMobile: React.FC<DesktopMobileProps> = ({
  activeWs, setActiveWs,
  slide, setSlide,
  activeWallpaper,
  linksForActiveWs, notesForActiveWs,
  onDeleteLink, onEditLink, onAddLink,
  onUpdateNote, onDeleteNote, onPropsOpen,
  COLS,
  wsOverlayVisible,
}) => {
  const [tileAction, setTileAction] = React.useState<MobileTileAction>('normal');

  const canLeft  = activeWs > 0;
  const canRight = activeWs < COLS - 1;

  return (
    <>
      <style>{SLIDE_KEYFRAMES}</style>

      {/* ── Outer stage: dark desk, centres the phone ────────────────── */}
      <div
        style={{
          position:        'relative',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          marginTop:       CANVAS_TOP_MARGIN,
          marginLeft:      '-1rem',
          marginRight:     '-1rem',
          width:           'calc(100% + 2rem)',
          height:          `calc(100vh - ${CANVAS_TOP_OFFSET})`,
          backgroundColor: '#020c18',
          overflow:        'hidden',
        }}
      >
        {/* ── Phone canvas ─────────────────────────────────────────── */}
        <div
          style={{
            position:           'relative',
            width:              `${PHONE_W}px`,
            maxWidth:           '100%',
            height:             '100%',
            borderRadius:       '20px',
            overflow:           'hidden',
            boxShadow:          '0 0 0 1.5px rgba(255,255,255,0.10), 0 16px 64px rgba(0,0,0,0.85)',
            backgroundColor:    activeWallpaper ? 'transparent' : wsColor(activeWs),
            backgroundImage:    activeWallpaper ? `url(${activeWallpaper})` : 'none',
            backgroundSize:     'cover',
            backgroundPosition: 'center top',
          }}
        >
          {/* ── Slide-out animation layer ──────────────────────────── */}
          {slide && (
            <div
              key={slide.key}
              style={{
                position:           'absolute',
                inset:              0,
                pointerEvents:      'none',
                backgroundColor:    slide.wallpaper ? 'transparent' : slide.color,
                backgroundImage:    slide.wallpaper ? `url(${slide.wallpaper})` : 'none',
                backgroundSize:     'cover',
                backgroundPosition: 'center top',
                animation:          `${EXIT_ANIM[slide.dir]} 280ms ease forwards`,
              }}
              onAnimationEnd={() => setSlide(null)}
            />
          )}

          {/* ── Sticky notes ─────────────────────────────────────── */}
          {notesForActiveWs.map(note => (
            <StickyNoteWidget
              key={note.id}
              note={note}
              onUpdate={onUpdateNote}
              onDelete={onDeleteNote}
            />
          ))}

          {/* ── Icon grid — 5 fixed columns ──────────────────────── */}
          {/*                                                          */}
          {/* Layout maths (PHONE_W = 390 px):                        */}
          {/*   side padding: 8 px each → available = 374 px          */}
          {/*   5 cols × tile + 4 gaps × 8 px = 374 px                */}
          {/*   tile width = (374 − 32) / 5 ≈ 68 px                   */}
          {/*                                                          */}
          {/* The floating nav buttons (28 px wide) sit at the very   */}
          {/* edge and do NOT overlap the content area.               */}
          <div style={{
            position:              'absolute',
            inset:                 0,
            display:               'grid',
            gridTemplateColumns:   'repeat(5, 1fr)',
            gap:                   '8px',
            padding:               '48px 8px 88px',
            overflowY:             'auto',
            alignContent:          'flex-start',
          }}>
            {linksForActiveWs.map(link => (
              <DesktopMobileLinkTile
                key={link.id}
                link={link}
                mode={tileAction}
                onDelete={id => { onDeleteLink(id); setTileAction('normal'); }}
                onEdit={l  => { onEditLink(l);  setTileAction('normal'); }}
              />
            ))}
          </div>

          {/* ── Floating nav buttons (left / right) ──────────────── */}
          {canLeft  && <NavBtn key="left"  dir="left"  onClick={() => setActiveWs(p => p - 1)} />}
          {canRight && <NavBtn key="right" dir="right" onClick={() => setActiveWs(p => p + 1)} />}

          {/* ── Floating toolbar — bottom centre ─────────────────── */}
          <div style={{
            position:       'absolute',
            bottom:         '14px',
            left:           '50%',
            transform:      'translateX(-50%)',
            display:        'flex',
            gap:            '8px',
            zIndex:         200,
            padding:        '6px 12px',
            borderRadius:   '32px',
            background:     'rgba(2,12,24,0.80)',
            backdropFilter: 'blur(10px)',
            border:         '1px solid rgba(255,255,255,0.12)',
            boxShadow:      '0 4px 20px rgba(0,0,0,0.55)',
          }}>
            <ToolbarBtn
              label="+"
              title="Añadir enlace"
              active={false}
              activeColor="#3b82f6"
              onClick={onAddLink}
            />
            <ToolbarBtn
              label="✏️"
              title={tileAction === 'edit' ? 'Cancelar edición' : 'Editar icono'}
              active={tileAction === 'edit'}
              activeColor="#00ffe7"
              onClick={() => setTileAction(p => p === 'edit' ? 'normal' : 'edit')}
            />
            <ToolbarBtn
              label="🗑️"
              title={tileAction === 'delete' ? 'Cancelar borrado' : 'Borrar icono'}
              active={tileAction === 'delete'}
              activeColor="#ff00cc"
              onClick={() => setTileAction(p => p === 'delete' ? 'normal' : 'delete')}
            />
            <ToolbarBtn
              label="⚙️"
              title="Propiedades"
              active={false}
              activeColor="#a855f7"
              onClick={onPropsOpen}
            />
          </div>

          {/* ── Workspace overlay (Shift hint) ────────────────────── */}
          {/* Single horizontal row of portrait thumbnails             */}
          <div style={{
            position:       'absolute',
            inset:          0,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            pointerEvents:  'none',
            zIndex:         500,
            opacity:        wsOverlayVisible ? 1 : 0,
            transition:     'opacity 0.15s ease',
          }}>
            <div style={{
              display:        'flex',
              flexDirection:  'row',
              flexWrap:       'wrap',
              justifyContent: 'center',
              gap:            `${WS_GAP}px`,
              padding:        `${WS_PADDING}px`,
              background:     'rgba(255,255,255,0.1)',
              border:         '1px solid rgba(255,255,255,0.4)',
              borderRadius:   '10px',
              backdropFilter: 'blur(4px)',
              maxWidth:       '90%',
            }}>
              {Array.from({ length: COLS }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width:        `${MOBILE_WS_W}px`,
                    height:       `${MOBILE_WS_H}px`,
                    borderRadius: `${WS_RADIUS}px`,
                    background:   i === activeWs
                      ? 'rgba(255,255,255,1.0)'
                      : 'rgba(255,255,255,0.4)',
                    transition:   'background 0.12s ease',
                  }}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
