import React from 'react';
import { DesktopLink, StickyNote } from '../../../core/actions/desktop';
import { StickyNoteWidget } from './StickyNoteWidget';
import { DesktopTabletLinkTile, TabletAction } from './DesktopTabletLinkTile';
import {
  CANVAS_TOP_OFFSET,
  CANVAS_TOP_MARGIN,
  WS_W, WS_H, WS_GAP, WS_PADDING, WS_RADIUS,
  wsColor,
  EXIT_ANIM,
  SLIDE_KEYFRAMES,
  SlideState,
} from './DesktopCommons';

// ── Props contract ────────────────────────────────────────────────────────────
export interface DesktopTabletProps {
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
  COLS:             number;
  ROWS:             number;
  TOTAL:            number;
  wsOverlayVisible: boolean;
}

// ── NavArrow ──────────────────────────────────────────────────────────────────
// Absolutely-positioned translucent button that fades in from the edge.
// Left / right: full-height strips on each side.
// Up / down: full-width strips at the top / above the toolbar.

type NavDir = 'left' | 'right' | 'up' | 'down';

// Up/down reuse the same ‹ glyph, rotated via CSS so they look identical
// to the side arrows.  ‹ rotated -90° → up;  ‹ rotated +90° → down.
const ARROW_LABEL: Record<NavDir, string> = {
  left:  '‹',
  right: '›',
  up:    '‹',
  down:  '‹',
};

// ‹ is a left-pointing glyph (<).
// rotate(+90deg) CW  → open side faces right, point faces up   → looks like ∧ (UP)
// rotate(-90deg) CCW → open side faces left,  point faces down → looks like ∨ (DOWN)
const ARROW_ROTATE: Partial<Record<NavDir, string>> = {
  up:   'rotate(90deg)',
  down: 'rotate(-90deg)',
};

const ARROW_TITLE: Record<NavDir, string> = {
  left:  'Escritorio a la izquierda',
  right: 'Escritorio a la derecha',
  up:    'Escritorio superior',
  down:  'Escritorio inferior',
};

// All arrows have transparent backgrounds — they're just touch targets.
// Horizontal: full-height strips on each side.
// Vertical: full-width strips at top / bottom edge (no corner inset needed
// since the side arrows are also transparent and don't visually clash).
const ARROW_STYLE: Record<NavDir, React.CSSProperties> = {
  left:  { left:   0, top: 0, bottom: 0,  width:  '52px', background: 'transparent' },
  right: { right:  0, top: 0, bottom: 0,  width:  '52px', background: 'transparent' },
  up:    { top:    0, left: 0, right: 0,  height: '52px', background: 'transparent' },
  down:  { bottom: 0, left: 0, right: 0,  height: '52px', background: 'transparent' },
};

interface NavArrowProps {
  dir:     NavDir;
  onClick: () => void;
}

const NavArrow: React.FC<NavArrowProps> = ({ dir, onClick }) => (
  // IMPORTANT: transform must NOT be applied to the <button> itself.
  // A rotated button element has its pointer-event hit area rotated too,
  // which turns a horizontal top/bottom strip into a vertical centre strip
  // that overlaps the opposite arrow and causes wrong navigation.
  // We rotate only the inner <span> (the glyph) so the hit area stays
  // exactly the strip defined by ARROW_STYLE.
  <button
    onClick={onClick}
    title={ARROW_TITLE[dir]}
    style={{
      position:                'absolute',
      ...ARROW_STYLE[dir],
      border:                  'none',
      cursor:                  'pointer',
      display:                 'flex',
      alignItems:              'center',
      justifyContent:          'center',
      color:                   'rgba(255,255,255,0.85)',
      fontSize:                '2.4rem',
      lineHeight:              1,
      zIndex:                  150,
      WebkitTapHighlightColor: 'transparent',
      userSelect:              'none',
      // no transform here
    }}
  >
    <span style={{ display: 'inline-block', transform: ARROW_ROTATE[dir] }}>
      {ARROW_LABEL[dir]}
    </span>
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
      width:                   '48px',
      height:                  '48px',
      borderRadius:            '50%',
      backgroundColor:         active ? `${activeColor}33` : 'rgba(255,255,255,0.08)',
      border:                  active
        ? `1.5px solid ${activeColor}`
        : '1.5px solid rgba(255,255,255,0.18)',
      boxShadow:               active ? `0 0 10px ${activeColor}66` : 'none',
      color:                   '#fff',
      fontSize:                label === '+' ? '26px' : '18px',
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

// ── DesktopTablet ─────────────────────────────────────────────────────────────
export const DesktopTablet: React.FC<DesktopTabletProps> = ({
  activeWs, setActiveWs,
  slide, setSlide,
  activeWallpaper,
  linksForActiveWs, notesForActiveWs,
  onDeleteLink, onEditLink, onAddLink,
  onUpdateNote, onDeleteNote, onPropsOpen,
  COLS, ROWS, TOTAL,
  wsOverlayVisible,
}) => {
  const [tabletAction, setTabletAction] = React.useState<TabletAction>('normal');

  // ── Navigation bounds ──────────────────────────────────────────────────────
  const col     = activeWs % COLS;
  const row     = Math.floor(activeWs / COLS);
  const canLeft  = col > 0;
  const canRight = col < COLS - 1;
  const canUp    = row > 0;
  const canDown  = row < ROWS - 1;

  return (
    <>
      <style>{SLIDE_KEYFRAMES}</style>

      {/* ── Full-viewport canvas ──────────────────────────────────────── */}
      <div
        style={{
          position:           'relative',
          marginTop:          CANVAS_TOP_MARGIN,
          marginLeft:         '-1rem',
          marginRight:        '-1rem',
          width:              'calc(100% + 2rem)',
          height:             `calc(100vh - ${CANVAS_TOP_OFFSET})`,
          overflow:           'hidden',
          outline:            'none',
          backgroundColor:    activeWallpaper ? 'transparent' : wsColor(activeWs),
          backgroundImage:    activeWallpaper ? `url(${activeWallpaper})` : 'none',
          backgroundSize:     'cover',
          backgroundPosition: 'center',
        }}
      >

        {/* ── Outgoing workspace slide-out layer ─────────────────────── */}
        {slide && (
          <div
            key={slide.key}
            style={{
              position:           'absolute',
              inset:              0,
              pointerEvents:      'none',   // never intercept clicks during animation
              backgroundColor:    slide.wallpaper ? 'transparent' : slide.color,
              backgroundImage:    slide.wallpaper ? `url(${slide.wallpaper})` : 'none',
              backgroundSize:     'cover',
              backgroundPosition: 'center',
              animation:          `${EXIT_ANIM[slide.dir]} ${280}ms ease forwards`,
            }}
            onAnimationEnd={() => setSlide(null)}
          />
        )}

        {/* ── Sticky notes ──────────────────────────────────────────── */}
        {notesForActiveWs.map(note => (
          <StickyNoteWidget
            key={note.id}
            note={note}
            onUpdate={onUpdateNote}
            onDelete={onDeleteNote}
          />
        ))}

        {/* ── Scrollable icon grid ───────────────────────────────────── */}
        {/* top padding leaves room for the up-arrow (52 px);          */}
        {/* side padding = side-arrow width (52 px + a little gap);    */}
        {/* bottom padding leaves room for the toolbar (~100 px).      */}
        <div style={{
          position:     'absolute',
          inset:        0,
          display:      'flex',
          flexWrap:     'wrap',
          alignContent: 'flex-start',
          gap:          '20px',
          padding:      '60px 68px 68px',
          overflowY:    'auto',
        }}>
          {linksForActiveWs.map(link => (
            <DesktopTabletLinkTile
              key={link.id}
              link={link}
              mode={tabletAction}
              onDelete={id => { onDeleteLink(id); setTabletAction('normal'); }}
              onEdit={l  => { onEditLink(l);  setTabletAction('normal'); }}
            />
          ))}
        </div>

        {/* ── Navigation arrows ─────────────────────────────────────── */}
        {/* Explicit keys ensure React never reuses a component with a stale  */}
        {/* onClick when canLeft/canRight toggle and shift sibling positions.  */}
        {canLeft  && <NavArrow key="left"  dir="left"  onClick={() => setActiveWs(p => p - 1)}    />}
        {canRight && <NavArrow key="right" dir="right" onClick={() => setActiveWs(p => p + 1)}    />}
        {canUp    && <NavArrow key="up"    dir="up"    onClick={() => setActiveWs(p => p - COLS)} />}
        {canDown  && <NavArrow key="down"  dir="down"  onClick={() => setActiveWs(p => p + COLS)} />}

        {/* ── Floating toolbar (bottom-right corner) ────────────────── */}
        <div style={{
          position:       'absolute',
          bottom:         '20px',
          right:          '20px',
          display:        'flex',
          gap:            '10px',
          zIndex:         200,
          padding:        '8px 12px',
          borderRadius:   '32px',
          background:     'rgba(2,12,24,0.75)',
          backdropFilter: 'blur(8px)',
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
            title={tabletAction === 'edit' ? 'Cancelar edición' : 'Editar icono'}
            active={tabletAction === 'edit'}
            activeColor="#00ffe7"
            onClick={() => setTabletAction(p => p === 'edit' ? 'normal' : 'edit')}
          />
          <ToolbarBtn
            label="🗑️"
            title={tabletAction === 'delete' ? 'Cancelar borrado' : 'Borrar icono'}
            active={tabletAction === 'delete'}
            activeColor="#ff00cc"
            onClick={() => setTabletAction(p => p === 'delete' ? 'normal' : 'delete')}
          />
          <ToolbarBtn
            label="⚙️"
            title="Propiedades"
            active={false}
            activeColor="#a855f7"
            onClick={onPropsOpen}
          />
        </div>

        {/* ── Workspace switcher overlay (Shift key hint) ────────────── */}
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
            display:             'grid',
            gridTemplateColumns: `repeat(${COLS}, ${WS_W}px)`,
            gridTemplateRows:    `repeat(${ROWS}, ${WS_H}px)`,
            gap:                 `${WS_GAP}px`,
            padding:             `${WS_PADDING}px`,
            background:          'rgba(255,255,255,0.1)',
            border:              '1px solid rgba(255,255,255,0.4)',
            borderRadius:        '10px',
            backdropFilter:      'blur(4px)',
          }}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <div
                key={i}
                style={{
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
    </>
  );
};
