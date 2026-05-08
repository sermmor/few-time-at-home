import React from 'react';
import { DesktopPanel } from '../../../core/actions/desktop';

interface Props {
  panel:    DesktopPanel;
  onUpdate: (id: string, changes: Partial<DesktopPanel>) => void;
  onDelete: (id: string) => void;
}

const MIN_W = 50;
const MIN_H = 50;

export const DesktopPanelWidget: React.FC<Props> = ({ panel, onUpdate, onDelete }) => {
  const [lx, setLx] = React.useState(panel.x);
  const [ly, setLy] = React.useState(panel.y);
  const [lw, setLw] = React.useState(panel.width);
  const [lh, setLh] = React.useState(panel.height);

  // Sync local state when panel identity changes
  React.useEffect(() => {
    setLx(panel.x);
    setLy(panel.y);
    setLw(panel.width);
    setLh(panel.height);
  }, [panel.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag (from the whole body) ─────────────────────────────────────────────
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
      onUpdate(panel.id, { x: fx, y: fy });
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
      onUpdate(panel.id, { width: fw, height: fh });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  };

  return (
    <div
      onMouseDown={startDrag}
      style={{
        position:        'absolute',
        left:            lx,
        top:             ly,
        width:           lw,
        height:          lh,
        cursor:          'grab',
        borderRadius:    '4px',
        border:          '1px solid rgba(255,255,255,0.15)',
        boxShadow:       '0 2px 12px rgba(0,0,0,0.4)',
        background:      'rgba(0,0,0,0.6)',
        zIndex:          30,
        userSelect:      'none',
      }}
    >
      {/* × delete button */}
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={() => onDelete(panel.id)}
        title="Eliminar panel"
        style={{
          position:       'absolute',
          top:            4,
          right:          4,
          width:          20,
          height:         20,
          borderRadius:   '50%',
          background:     'rgba(255,255,255,0.15)',
          border:         '1px solid rgba(255,255,255,0.3)',
          cursor:         'pointer',
          color:          'rgba(255,255,255,0.8)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       '14px',
          fontWeight:     700,
          padding:        0,
          lineHeight:     1,
        }}
      >
        ×
      </button>

      {/* Resize handle */}
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
          background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.25) 50%)',
        }}
      />
    </div>
  );
};
