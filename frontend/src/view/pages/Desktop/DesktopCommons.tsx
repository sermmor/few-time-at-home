import { getCloudEndpoint } from '../../../core/urls-and-end-points';

// ── Canvas geometry ───────────────────────────────────────────────────────────
// EnvelopeComponent adds paddingTop: 5.5rem and paddingLeft/Right: 1rem.
// Negative margins cancel that out so the canvas fills the remaining viewport.
export const CANVAS_TOP_OFFSET = '4rem';
export const CANVAS_TOP_MARGIN = '-1.5rem';

// Workspace thumbnail dimensions for the Shift-overlay (px)
export const WS_W       = 112;
export const WS_H       = 72;
export const WS_GAP     = 10;
export const WS_PADDING = 14;
export const WS_RADIUS  = 5;

// Slide animation duration (ms)
export const TRANSITION_MS = 280;

// ── Workspace colour palette ──────────────────────────────────────────────────
export const BASE_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#2d6a4f', '#1b4332', '#40916c', '#52b788',
  '#7b2d8b', '#6a0572', '#9b5de5', '#c77dff',
  '#e63946', '#c1121f', '#fb8500', '#ffb703',
];
export const wsColor = (i: number): string => BASE_COLORS[i % BASE_COLORS.length];

// ── Slide-transition helpers ──────────────────────────────────────────────────
export type Direction = 'right' | 'left' | 'down' | 'up';

export const getDirection = (from: number, to: number, cols: number): Direction => {
  const fromCol = from % cols, toCol = to % cols;
  const fromRow = Math.floor(from / cols), toRow = Math.floor(to / cols);
  if      (toCol > fromCol) return 'right';
  else if (toCol < fromCol) return 'left';
  else if (toRow > fromRow) return 'down';
  else                      return 'up';
};

export const EXIT_ANIM: Record<Direction, string> = {
  right: 'ws-exit-left',
  left:  'ws-exit-right',
  down:  'ws-exit-up',
  up:    'ws-exit-down',
};

// CSS keyframes — embed once with <style> in whichever canvas root is active.
export const SLIDE_KEYFRAMES = `
  @keyframes ws-exit-left  { from { transform: translateX(0); } to { transform: translateX(-100%); } }
  @keyframes ws-exit-right { from { transform: translateX(0); } to { transform: translateX(100%);  } }
  @keyframes ws-exit-up    { from { transform: translateY(0); } to { transform: translateY(-100%); } }
  @keyframes ws-exit-down  { from { transform: translateY(0); } to { transform: translateY(100%);  } }
`;

// ── Slide state type (shared by Desktop and DesktopTablet) ───────────────────
export interface SlideState {
  key:       number;        // stable per-transition id
  color:     string;
  wallpaper: string | null; // resolved blob / CDN URL, or null
  dir:       Direction;
}

// ── Wallpaper URL builder ─────────────────────────────────────────────────────
export const wallpaperUrl = (cloudPath: string): string =>
  `${getCloudEndpoint('streamFile')}` +
  `?drive=${encodeURIComponent(cloudPath.split('/')[0])}` +
  `&path=${encodeURIComponent(cloudPath)}`;
