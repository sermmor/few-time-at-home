import React from 'react';
import { Application, Graphics } from 'pixi.js';

// Same full-screen escape technique used by VideoPlayer:
// EnvelopComponent adds paddingTop: 5.5rem and paddingLeft/Right: 1rem.
// We negate those with negative margins so the canvas fills the viewport.
const CANVAS_TOP_OFFSET  = '4rem';    // real AppMenubar height
const CANVAS_TOP_MARGIN  = '-1.5rem'; // 4rem − 5.5rem = −1.5rem

export const Desktop = (): JSX.Element => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let app: Application | null = null;
    let destroyed = false;

    (async () => {
      app = new Application();

      const w = container.clientWidth;
      const h = container.clientHeight;

      await app.init({
        width:      w,
        height:     h,
        background: 0x00cc44, // green background
        antialias:  true,
      });

      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }

      container.appendChild(app.canvas as HTMLCanvasElement);

      // ── Yellow 400×400 square, centred ─────────────────────────────────────
      const sqSize = 400;
      const sqX    = (w - sqSize) / 2;
      const sqY    = (h - sqSize) / 2;

      const square = new Graphics();
      square.rect(sqX, sqY, sqSize, sqSize);
      square.fill(0xffee00);
      app.stage.addChild(square);

      // ── White circle (r=100) centred on the square ────────────────────────
      const circle = new Graphics();
      circle.circle(sqX + sqSize / 2, sqY + sqSize / 2, 100);
      circle.fill(0xffffff);
      app.stage.addChild(circle);
    })();

    return () => {
      destroyed = true;
      // Small timeout so the async init has a chance to finish before destroy
      setTimeout(() => {
        if (app) {
          app.destroy(true, { children: true });
          app = null;
        }
      }, 50);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        marginTop:   CANVAS_TOP_MARGIN,
        marginLeft:  '-1rem',
        marginRight: '-1rem',
        width:       'calc(100% + 2rem)',
        height:      `calc(100vh - ${CANVAS_TOP_OFFSET})`,
        overflow:    'hidden',
      }}
    />
  );
};
