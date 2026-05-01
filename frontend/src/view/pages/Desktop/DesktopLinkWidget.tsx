import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import EditIcon        from '@mui/icons-material/Edit';
import DeleteIcon      from '@mui/icons-material/Delete';
import { DesktopLink } from '../../../core/actions/desktop';
import { desktopFaviconImageEndpoint } from '../../../core/urls-and-end-points';

interface Props {
  link:     DesktopLink;
  onUpdate: (id: string, changes: Partial<DesktopLink>) => void;
  onDelete: (id: string) => void;
  onEdit:   (link: DesktopLink) => void;
}

// ── Subcomponente de favicon con fallback ──────────────────────────────────────
const FaviconImg: React.FC<{ name: string }> = ({ name }) => {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <InsertLinkIcon sx={{ fontSize: '2rem', color: '#3b82f6',
                            filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.5))' }} />
    );
  }
  return (
    <img
      src={desktopFaviconImageEndpoint(name)}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      style={{ width: '36px', height: '36px', objectFit: 'contain' }}
    />
  );
};

// Si el mouse se mueve más de este umbral durante el drag, se trata como arrastre
const DRAG_THRESHOLD = 6;

// ── DesktopLinkWidget ──────────────────────────────────────────────────────────
export const DesktopLinkWidget: React.FC<Props> = ({ link, onUpdate, onDelete, onEdit }) => {
  const [lx, setLx] = React.useState(link.x);
  const [ly, setLy] = React.useState(link.y);

  // Menú contextual (clic derecho)
  const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number } | null>(null);

  // Sincronizar con el exterior solo cuando cambia la identidad del link
  React.useEffect(() => {
    setLx(link.x);
    setLy(link.y);
  }, [link.id]);

  // ── Drag con detección de clic ─────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // solo botón izquierdo
    e.preventDefault();
    e.stopPropagation(); // no disparar el onContextMenu del escritorio

    const ox = e.clientX - lx;
    const oy = e.clientY - ly;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    // Ref mutable para la posición final (evita stale closure)
    const finalPos = { x: lx, y: ly };

    const onMove = (ev: MouseEvent) => {
      if (!moved) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          moved = true;
        }
      }
      if (moved) {
        finalPos.x = ev.clientX - ox;
        finalPos.y = ev.clientY - oy;
        setLx(finalPos.x);
        setLy(finalPos.y);
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);

      if (moved) {
        // Fue un arrastre: guardar posición
        onUpdate(link.id, { x: finalPos.x, y: finalPos.y });
      } else {
        // Fue un clic: abrir URL en nueva pestaña
        window.open(link.url, '_blank', 'noreferrer');
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  };

  // ── Menú contextual ────────────────────────────────────────────────────────
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // evitar que se abra el menú del escritorio
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const closeCtx = () => setCtxMenu(null);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        title={link.url}
        style={{
          position:   'absolute',
          left:       lx,
          top:        ly,
          width:      '76px',
          display:    'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap:        '5px',
          zIndex:     150,
          cursor:     'default',
          userSelect: 'none',
        }}
      >
        {/* ── Icono ───────────────────────────────────────────────────────── */}
        <div style={{
          width:           '52px',
          height:          '52px',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          borderRadius:    '10px',
          backgroundColor: 'rgba(59,130,246,0.18)',
          border:          '1.5px solid rgba(59,130,246,0.45)',
          boxShadow:       '0 2px 8px rgba(0,0,0,0.35)',
          overflow:        'hidden',
        }}>
          {link.favicon ? (
            <FaviconImg name={link.favicon} />
          ) : (
            <InsertLinkIcon
              sx={{ fontSize: '2rem', color: '#3b82f6',
                    filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.5))' }}
            />
          )}
        </div>

        {/* ── Nombre ──────────────────────────────────────────────────────── */}
        <div style={{
          width:          '76px',
          textAlign:      'center',
          fontSize:       '11px',
          fontFamily:     'system-ui, sans-serif',
          color:          '#ffffff',
          textShadow:     '0 1px 3px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.6)',
          lineHeight:     1.3,
          // Hasta 2 líneas, después ellipsis
          display:            '-webkit-box',
          WebkitLineClamp:    2,
          WebkitBoxOrient:    'vertical' as const,
          overflow:           'hidden',
          overflowWrap:       'break-word',
        }}>
          {link.name || link.url}
        </div>
      </div>

      {/* ── Menú contextual ─────────────────────────────────────────────────── */}
      <Menu
        open={ctxMenu !== null}
        onClose={closeCtx}
        anchorReference="anchorPosition"
        anchorPosition={ctxMenu ? { top: ctxMenu.y, left: ctxMenu.x } : undefined}
        slotProps={{ paper: { sx: { minWidth: '170px' } } }}
      >
        <MenuItem
          onClick={() => { closeCtx(); onEdit(link); }}
          dense
        >
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Editar nombre</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => { closeCtx(); onDelete(link.id); }}
          dense
          sx={{ color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } }}
        >
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Borrar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
