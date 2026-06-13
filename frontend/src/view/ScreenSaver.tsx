import React, { useEffect, useRef, useState } from 'react';

/**
 * Global screensaver: after 30s without any mouse move / key / touch, a red
 * 3rem ball is spawned from a random edge and bounces around the whole window
 * (DVD-logo style). Any user activity instantly dismisses it. It sits above
 * every other element (max z-index).
 */
const INACTIVITY_MS = 30_000;
const BALL_REM      = 3;
const SPEED         = 4.5;          // px per animation frame (~270 px/s @ 60fps)
const MAX_Z         = 2147483647;   // above everything (modals, menubar, etc.)

// Routes where the screensaver must never appear (e.g. while watching media).
const EXCLUDED_PATHS = ['/alexa', '/alexa-yt'];

const isExcludedRoute = (): boolean => {
  // Case-insensitive: react-router matches routes regardless of case
  // (e.g. "/Alexa" renders the same page as "/alexa").
  const path = window.location.pathname.toLowerCase();
  return EXCLUDED_PATHS.some(p => path === p || path.startsWith(p + '/'));
};

export const ScreenSaver = () => {
  const [active, setActive] = useState(false);
  const activeRef    = useRef(false);
  const lastActivity = useRef(Date.now());
  const ballRef      = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>();
  const posRef       = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  useEffect(() => { activeRef.current = active; }, [active]);

  // ── Activity tracking + inactivity poll ──────────────────────────────────
  useEffect(() => {
    const onActivity = () => {
      lastActivity.current = Date.now();
      if (activeRef.current) setActive(false);
    };
    const events: (keyof WindowEventMap)[] =
      ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'touchmove'];
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    const id = window.setInterval(() => {
      if (!activeRef.current
          && Date.now() - lastActivity.current >= INACTIVITY_MS
          && !isExcludedRoute()) {
        setActive(true);
      }
    }, 1000);

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      window.clearInterval(id);
    };
  }, []);

  // ── Bouncing animation while active ──────────────────────────────────────
  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const size  = BALL_REM * remPx;
    const r     = Math.random;

    // Spawn from a random edge, heading inward at a random diagonal.
    const maxX0 = Math.max(0, window.innerWidth  - size);
    const maxY0 = Math.max(0, window.innerHeight - size);
    const minComp = 0.4;
    let vx = r() * 2 - 1, vy = r() * 2 - 1;
    if (Math.abs(vx) < minComp) vx = vx < 0 ? -minComp : minComp;
    if (Math.abs(vy) < minComp) vy = vy < 0 ? -minComp : minComp;
    const mag = Math.hypot(vx, vy) || 1;
    vx = (vx / mag) * SPEED;
    vy = (vy / mag) * SPEED;

    let x: number, y: number;
    switch (Math.floor(r() * 4)) {
      case 0: y = 0;     x = r() * maxX0; vy = Math.abs(vy);  break; // top → down
      case 1: x = maxX0; y = r() * maxY0; vx = -Math.abs(vx); break; // right → left
      case 2: y = maxY0; x = r() * maxX0; vy = -Math.abs(vy); break; // bottom → up
      default: x = 0;    y = r() * maxY0; vx = Math.abs(vx);  break; // left → right
    }
    posRef.current = { x, y, vx, vy };

    const step = () => {
      const p    = posRef.current;
      const maxX = Math.max(0, window.innerWidth  - size);
      const maxY = Math.max(0, window.innerHeight - size);
      p.x += p.vx;
      p.y += p.vy;
      if (p.x <= 0)         { p.x = 0;    p.vx = Math.abs(p.vx); }
      else if (p.x >= maxX) { p.x = maxX; p.vx = -Math.abs(p.vx); }
      if (p.y <= 0)         { p.y = 0;    p.vy = Math.abs(p.vy); }
      else if (p.y >= maxY) { p.y = maxY; p.vy = -Math.abs(p.vy); }
      if (ballRef.current) ballRef.current.style.transform = `translate(${p.x}px, ${p.y}px)`;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: MAX_Z,
        background: 'transparent', pointerEvents: 'auto',
        cursor: 'none', overflow: 'hidden',
      }}
    >
      <div
        ref={ballRef}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: `${BALL_REM}rem`, height: `${BALL_REM}rem`,
          borderRadius: '50%', backgroundColor: 'red',
          willChange: 'transform',
        }}
      />
    </div>
  );
};
