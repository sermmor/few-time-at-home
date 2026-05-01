import React from 'react';
import {
  Divider,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import { DesktopActions, DesktopConfig, DEFAULT_DESKTOP_CONFIG } from '../../../core/actions/desktop';
import { DesktopPropertiesDialog } from './DesktopPropertiesDialog';
import { getCloudEndpoint } from '../../../core/urls-and-end-points';

// Build a GET URL for the streamFile endpoint (?drive=...&path=...)
// The endpoint is GET /cloud/stream-file and serves files directly.
const wallpaperUrl = (cloudPath: string): string =>
  `${getCloudEndpoint('streamFile')}` +
  `?drive=${encodeURIComponent(cloudPath.split('/')[0])}` +
  `&path=${encodeURIComponent(cloudPath)}`;

// EnvelopComponent adds paddingTop: 5.5rem and paddingLeft/Right: 1rem.
// Negative margins cancel that out so the canvas fills the remaining viewport.
const CANVAS_TOP_OFFSET = '4rem';
const CANVAS_TOP_MARGIN = '-1.5rem';

// Workspace thumbnail dimensions (px)
const WS_W       = 112;
const WS_H       = 72;
const WS_GAP     = 10;
const WS_PADDING = 14;
const WS_RADIUS  = 5;

// Slide animation duration (ms)
const TRANSITION_MS = 280;

// Default colour palette (cycles for workspaces beyond index 15)
const BASE_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#2d6a4f', '#1b4332', '#40916c', '#52b788',
  '#7b2d8b', '#6a0572', '#9b5de5', '#c77dff',
  '#e63946', '#c1121f', '#fb8500', '#ffb703',
];
const wsColor = (i: number) => BASE_COLORS[i % BASE_COLORS.length];

// ── Helpers ───────────────────────────────────────────────────────────────────
type Direction = 'right' | 'left' | 'down' | 'up';

const getDirection = (from: number, to: number, cols: number): Direction => {
  const fromCol = from % cols, toCol = to % cols;
  const fromRow = Math.floor(from / cols), toRow = Math.floor(to / cols);
  if      (toCol > fromCol) return 'right';
  else if (toCol < fromCol) return 'left';
  else if (toRow > fromRow) return 'down';
  else                      return 'up';
};

const EXIT_ANIM: Record<Direction, string> = {
  right: 'ws-exit-left',
  left:  'ws-exit-right',
  down:  'ws-exit-up',
  up:    'ws-exit-down',
};


// ── Component ─────────────────────────────────────────────────────────────────
export const Desktop = (): JSX.Element => {
  const [config,   setConfig  ] = React.useState<DesktopConfig>(DEFAULT_DESKTOP_CONFIG);
  const [activeWs, setActiveWs] = React.useState(0);
  const [visible,   setVisible  ] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number } | null>(null);
  const [propsOpen,   setPropsOpen  ] = React.useState(false);

  // slide: outgoing workspace content; cleared when CSS animation ends
  const [slide, setSlide] = React.useState<{
    key:         number;         // stable per-transition id (set at creation)
    color:       string;
    wallpaper:   string | null;  // blob URL or null
    dir:         Direction;
  } | null>(null);

  // Refs for reading current values inside effects without re-subscribing
  const configRef   = React.useRef(config);
  configRef.current = config;
  const prevWsRef   = React.useRef(0);

  // ── Load config on mount ─────────────────────────────────────────────────
  React.useEffect(() => {
    DesktopActions.getDesktopConfig().then(setConfig);
  }, []);

  // ── Clamp activeWs when grid shrinks ────────────────────────────────────
  React.useEffect(() => {
    const max = config.rows * config.cols - 1;
    setActiveWs(prev => Math.min(prev, max));
  }, [config.rows, config.cols]);

  // ── Workspace slide transition ───────────────────────────────────────────
  React.useEffect(() => {
    const from = prevWsRef.current;
    const to   = activeWs;
    if (from === to) return;

    const dir = getDirection(from, to, configRef.current.cols);
    prevWsRef.current = to;

    const fromPath = configRef.current.wallpapers[from] ?? '';
    setSlide({
      key:      Date.now(),  // computed once at creation; stable across re-renders
      color:    wsColor(from),
      wallpaper: fromPath ? wallpaperUrl(fromPath) : null,
      dir,
    });
  }, [activeWs]);

  // ── Keyboard: navigate with Shift+arrows, show overlay while Shift held ─
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      setVisible(true);

      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setActiveWs(prev => {
          const cols = configRef.current.cols;
          const rows = configRef.current.rows;
          const col  = prev % cols;
          const row  = Math.floor(prev / cols);
          if      (e.key === 'ArrowRight' && col < cols - 1) return prev + 1;
          else if (e.key === 'ArrowLeft'  && col > 0)        return prev - 1;
          else if (e.key === 'ArrowDown'  && row < rows - 1) return prev + cols;
          else if (e.key === 'ArrowUp'    && row > 0)        return prev - cols;
          return prev;
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setVisible(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // ── Derived display values ───────────────────────────────────────────────
  const COLS  = config.cols;
  const ROWS  = config.rows;
  const TOTAL = COLS * ROWS;

  const activeWsPath    = config.wallpapers[activeWs] ?? '';
  const activeWallpaper = activeWsPath ? wallpaperUrl(activeWsPath) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* CSS keyframes for slide-out animations */}
      <style>{`
        @keyframes ws-exit-left  { from { transform: translateX(0);    } to { transform: translateX(-100%); } }
        @keyframes ws-exit-right { from { transform: translateX(0);    } to { transform: translateX(100%);  } }
        @keyframes ws-exit-up    { from { transform: translateY(0);    } to { transform: translateY(-100%); } }
        @keyframes ws-exit-down  { from { transform: translateY(0);    } to { transform: translateY(100%);  } }
      `}</style>

      {/* ── Main desktop area ─────────────────────────────────────────── */}
      <div
        tabIndex={0}
        autoFocus
        onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
        style={{
          position:            'relative',
          marginTop:           CANVAS_TOP_MARGIN,
          marginLeft:          '-1rem',
          marginRight:         '-1rem',
          width:               'calc(100% + 2rem)',
          height:              `calc(100vh - ${CANVAS_TOP_OFFSET})`,
          overflow:            'hidden',
          outline:             'none',
          // Background: wallpaper image if configured, else workspace colour
          backgroundColor:     activeWallpaper ? 'transparent' : wsColor(activeWs),
          backgroundImage:     activeWallpaper ? `url(${activeWallpaper})` : 'none',
          backgroundSize:      'cover',
          backgroundPosition:  'center',
        }}
      >
        {/* ── Outgoing workspace layer (CSS slide-out animation) ─────── */}
        {slide && (
          <div
            key={slide.key}
            style={{
              position:           'absolute',
              inset:              0,
              backgroundColor:    slide.wallpaper ? 'transparent' : slide.color,
              backgroundImage:    slide.wallpaper ? `url(${slide.wallpaper})` : 'none',
              backgroundSize:     'cover',
              backgroundPosition: 'center',
              animation:          `${EXIT_ANIM[slide.dir]} ${TRANSITION_MS}ms ease forwards`,
            }}
            onAnimationEnd={() => setSlide(null)}
          />
        )}

        {/* ── Workspace switcher overlay (shown while Shift is held) ─── */}
        <div style={{
          position:       'absolute',
          inset:          0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          pointerEvents:  'none',
          opacity:        visible ? 1 : 0,
          transition:     'opacity 0.15s ease',
        }}>
          <div style={{
            display:             'grid',
            gridTemplateColumns: `repeat(${COLS}, ${WS_W}px)`,
            gridTemplateRows:    `repeat(${ROWS}, ${WS_H}px)`,
            gap:                 `${WS_GAP}px`,
            padding:             `${WS_PADDING}px`,
            background:          'rgba(255, 255, 255, 0.1)',
            border:              '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius:        '10px',
            backdropFilter:      'blur(4px)',
          }}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <div
                key={i}
                style={{
                  borderRadius: `${WS_RADIUS}px`,
                  background:   i === activeWs
                    ? 'rgba(255, 255, 255, 1.0)'
                    : 'rgba(255, 255, 255, 0.4)',
                  transition:   'background 0.12s ease',
                }}
              />
            ))}
          </div>
        </div>

      </div>

      {/* ── Right-click context menu ───────────────────────────────────── */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu
          ? { top: contextMenu.y, left: contextMenu.x }
          : undefined}
      >
        <MenuItem disabled>
          <ListItemText primary="Añadir notas" />
        </MenuItem>
        <MenuItem disabled>
          <ListItemText primary="Añadir link" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setContextMenu(null); setPropsOpen(true); }}>
          <ListItemText primary="Propiedades" />
        </MenuItem>
      </Menu>

      {/* ── Properties dialog ─────────────────────────────────────────── */}
      <DesktopPropertiesDialog
        isOpen={propsOpen}
        onClose={() => setPropsOpen(false)}
        config={config}
        onSave={updated => setConfig(updated)}
      />
    </>
  );
};
