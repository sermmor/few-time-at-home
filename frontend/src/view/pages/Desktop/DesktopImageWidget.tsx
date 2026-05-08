import React from 'react';
import { DesktopImage } from '../../../core/actions/desktop';
import { wallpaperUrl } from './DesktopCommons';

interface Props {
  image:    DesktopImage;
  onUpdate: (id: string, changes: Partial<DesktopImage>) => void;
  onDelete: (id: string) => void;
}

const MIN_W = 60;
const MIN_H = 40;

export const DesktopImageWidget: React.FC<Props> = ({ image, onUpdate, onDelete }) => {
  const [lx, setLx] = React.useState(image.x);
  const [ly, setLy] = React.useState(image.y);
  const [lw, setLw] = React.useState(image.width);
  const [lh, setLh] = React.useState(image.height);

  // Flag: only auto-size once (when height was 0 on first mount)
  const didAutoSize = React.useRef(image.height === 0);

  // Sync local state when image identity changes
  React.useEffect(() => {
    setLx(image.x);
    setLy(image.y);
    setLw(image.width);
    setLh(image.height);
    didAutoSize.current = image.height === 0;
  }, [image.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const imgSrc = wallpaperUrl(image.cloudPath);

  // ── Auto-size on load ──────────────────────────────────────────────────────
  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!didAutoSize.current) return;
    didAutoSize.current = false;
    const el = e.currentTarget;
    const naturalW = el.naturalWidth;
    const naturalH = el.naturalHeight;
    if (naturalW > 0 && naturalH > 0) {
      const newH = Math.round(lw / (naturalW / naturalH));
      setLh(newH);
      onUpdate(image.id, { height: newH });
    }
  };

  // ── Drag (from header) ─────────────────────────────────────────────────────
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const ox = e.clientX - lx;
    const oy = e.clientY - ly;

    const onMove = (ev: MouseEvent) => {
      setLx(ev.clientX - ox);
      setLy(ev.clientY - oy);
    };
    const onUp = (ev: MouseEvent) => {
      const fx = ev.clientX - ox;
      const fy = ev.clientY - oy;
      setLx(fx); setLy(fy);
      onUpdate(image.id, { x: fx, y: fy });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  };

  // ── Resize (bottom-right corner) ──────────────────────────────────────────
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const mx0 = e.clientX, my0 = e.clientY;
    const w0  = lw,        h0  = lh;

    const onMove = (ev: MouseEvent) => {
      setLw(Math.max(MIN_W, w0 + ev.clientX - mx0));
      setLh(Math.max(MIN_H, h0 + ev.clientY - my0));
    };
    const onUp = (ev: MouseEvent) => {
      const fw = Math.max(MIN_W, w0 + ev.clientX - mx0);
      const fh = Math.max(MIN_H, h0 + ev.clientY - my0);
      setLw(fw); setLh(fh);
      onUpdate(image.id, { width: fw, height: fh });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  };

  return (
    <div
      style={{
        position:      'absolute',
        left:          lx,
        top:           ly,
        width:         lw,
        height:        lh > 0 ? lh : 'auto',
        display:       'flex',
        flexDirection: 'column',
        zIndex:        200,
        border:        '1px solid rgba(255,255,255,0.15)',
        borderRadius:  '3px',
        boxShadow:     '3px 6px 18px rgba(0,0,0,0.60)',
        overflow:      'hidden',
      }}
    >
      {/* Header / drag bar */}
      <div
        onMouseDown={startDrag}
        style={{
          height:     '22px',
          background: 'rgba(0,0,0,0.55)',
          cursor:     'grab',
          display:    'flex',
          alignItems: 'center',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Drag grip spacer */}
        <div style={{ flex: 1 }} />

        {/* × delete button */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => onDelete(image.id)}
          title="Eliminar imagen"
          style={{
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            color:       'rgba(255,255,255,0.8)',
            padding:     '0 5px',
            lineHeight:  1,
            fontSize:    '17px',
            fontWeight:  700,
            display:     'flex',
            alignItems:  'center',
            flexShrink:  0,
          }}
        >
          ×
        </button>
      </div>

      {/* Image */}
      <img
        src={imgSrc}
        alt=""
        onLoad={handleImgLoad}
        style={{
          width:        '100%',
          height:       'calc(100% - 22px)',
          objectFit:    'contain',
          display:      'block',
          userSelect:   'none',
          pointerEvents:'none',
          draggable:    false,
        } as React.CSSProperties}
        draggable={false}
      />

      {/* Resize handle — only shown once height is known */}
      {lh > 0 && (
        <div
          onMouseDown={startResize}
          title="Redimensionar"
          style={{
            position:   'absolute',
            bottom:     0,
            right:      0,
            width:      '14px',
            height:     '14px',
            cursor:     'nwse-resize',
            background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.35) 50%)',
          }}
        />
      )}
    </div>
  );
};
