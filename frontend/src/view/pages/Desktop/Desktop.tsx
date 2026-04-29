import React from 'react';

// EnvelopComponent adds paddingTop: 5.5rem and paddingLeft/Right: 1rem.
// Negative margins cancel that out so the canvas fills the remaining viewport.
const CANVAS_TOP_OFFSET = '4rem';
const CANVAS_TOP_MARGIN = '-1.5rem';

// ── Grid constants ────────────────────────────────────────────────────────────
const COLS = 4;
const ROWS = 4;
const TOTAL = COLS * ROWS;

// Workspace thumbnail dimensions (px)
const WS_W       = 112;
const WS_H       = 72;
const WS_GAP     = 10;
const WS_PADDING = 14;
const WS_RADIUS  = 5;

// Slide animation duration (ms)
const TRANSITION_MS = 280;

// One background colour per workspace
const WS_COLORS: string[] = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#2d6a4f', '#1b4332', '#40916c', '#52b788',
  '#7b2d8b', '#6a0572', '#9b5de5', '#c77dff',
  '#e63946', '#c1121f', '#fb8500', '#ffb703',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
type Direction = 'right' | 'left' | 'down' | 'up';

const getDirection = (from: number, to: number): Direction => {
  const fromCol = from % COLS, toCol = to % COLS;
  const fromRow = Math.floor(from / COLS), toRow = Math.floor(to / COLS);
  if      (toCol > fromCol) return 'right';
  else if (toCol < fromCol) return 'left';
  else if (toRow > fromRow) return 'down';
  else                      return 'up';
};

// CSS keyframe names per direction: the OLD workspace slides out in the
// direction opposite to the movement (e.g. going right → old slides left).
const EXIT_ANIM: Record<Direction, string> = {
  right: 'ws-exit-left',
  left:  'ws-exit-right',
  down:  'ws-exit-up',
  up:    'ws-exit-down',
};

// ── Component ─────────────────────────────────────────────────────────────────
export const Desktop = (): JSX.Element => {
  const prevWsRef = React.useRef(0);

  const [activeWs, setActiveWs] = React.useState(0);
  const [visible,  setVisible ] = React.useState(false);

  // slide: the outgoing colour + direction; cleared when animation ends
  const [slide, setSlide] = React.useState<{ color: string; dir: Direction } | null>(null);

  // ── Workspace transition ─────────────────────────────────────────────────
  React.useEffect(() => {
    const from = prevWsRef.current;
    const to   = activeWs;
    if (from === to) return;

    const dir = getDirection(from, to);
    prevWsRef.current = to;

    // Kick the outgoing colour out with a CSS animation.
    // If a previous animation is still running, replace it immediately.
    setSlide({ color: WS_COLORS[from], dir });
  }, [activeWs]);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      setVisible(true);

      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setActiveWs(prev => {
          const col = prev % COLS;
          const row = Math.floor(prev / COLS);
          if      (e.key === 'ArrowRight' && col < COLS - 1) return prev + 1;
          else if (e.key === 'ArrowLeft'  && col > 0)        return prev - 1;
          else if (e.key === 'ArrowDown'  && row < ROWS - 1) return prev + COLS;
          else if (e.key === 'ArrowUp'    && row > 0)        return prev - COLS;
          return prev;
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setVisible(false);
    };

    // Use document instead of window — more reliable across different browsers
    // and React environments where window listeners can sometimes be skipped.
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* CSS keyframes for the slide-out animations */}
      <style>{`
        @keyframes ws-exit-left  { from { transform: translateX(0);     } to { transform: translateX(-100%); } }
        @keyframes ws-exit-right { from { transform: translateX(0);     } to { transform: translateX(100%);  } }
        @keyframes ws-exit-up    { from { transform: translateY(0);     } to { transform: translateY(-100%); } }
        @keyframes ws-exit-down  { from { transform: translateY(0);     } to { transform: translateY(100%);  } }
      `}</style>

      <div
        tabIndex={0}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        style={{
          position:    'relative',
          marginTop:   CANVAS_TOP_MARGIN,
          marginLeft:  '-1rem',
          marginRight: '-1rem',
          width:       'calc(100% + 2rem)',
          height:      `calc(100vh - ${CANVAS_TOP_OFFSET})`,
          overflow:    'hidden',
          outline:     'none',                        // suppress focus ring
          // Current workspace colour — instantly reflects the active workspace
          backgroundColor: WS_COLORS[activeWs],
        }}
      >
        {/* ── Outgoing workspace layer (slides out via CSS animation) ────── */}
        {slide && (
          <div
            key={`${slide.color}-${slide.dir}`}
            style={{
              position:         'absolute',
              inset:            0,
              backgroundColor:  slide.color,
              animation:        `${EXIT_ANIM[slide.dir]} ${TRANSITION_MS}ms ease forwards`,
            }}
            onAnimationEnd={() => setSlide(null)}
          />
        )}

        {/* ── Workspace switcher overlay — shown while Shift is held ──────── */}
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
    </>
  );
};
