// ignore_for_file: smaller variant of DesktopTabletLinkTile for mobile mode.
// Sized to fit 5 tiles per row on a 390 px phone canvas.

import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon        from '@mui/icons-material/Edit';
import DeleteIcon      from '@mui/icons-material/Delete';
import { DesktopLink } from '../../../core/actions/desktop';
import { desktopFaviconImageEndpoint } from '../../../core/urls-and-end-points';
import { copyToClipboard } from '../../../core/clipboard';

export type MobileTileAction = 'normal' | 'edit' | 'delete';

interface Props {
  link:     DesktopLink;
  mode:     MobileTileAction;
  onDelete: (id: string) => void;
  onEdit:   (link: DesktopLink) => void;
}

// ── Favicon with fallback ─────────────────────────────────────────────────────
const FaviconImg: React.FC<{ name: string }> = ({ name }) => {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <InsertLinkIcon sx={{ fontSize: '1.4rem', color: '#3b82f6' }} />;
  return (
    <img
      src={desktopFaviconImageEndpoint(name)}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      style={{ width: '26px', height: '26px', objectFit: 'contain' }}
    />
  );
};

// ── DesktopMobileLinkTile ─────────────────────────────────────────────────────
export const DesktopMobileLinkTile: React.FC<Props> = ({ link, mode, onDelete, onEdit }) => {
  const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number } | null>(null);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mode-dependent accent colours
  const accentColor =
    mode === 'edit'   ? '#00ffe7' :
    mode === 'delete' ? '#ff00cc' :
    undefined;

  const handleClick = () => {
    if (mode === 'normal') {
      window.open(link.url, '_blank', 'noreferrer');
    } else if (mode === 'edit') {
      onEdit(link);
    } else if (mode === 'delete') {
      onDelete(link.id);
    }
  };

  // Long-press → context menu (normal mode only, for touch devices)
  const handleTouchStart = () => {
    if (mode !== 'normal') return;
    longPressTimer.current = setTimeout(() => {
      // Can't get touch coordinates easily here — use tile centre approximation
      setCtxMenu({ x: 0, y: 0 });
    }, 500);
  };
  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (mode !== 'normal') return;
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      {/* ── Tile ── */}
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={clearLongPress}
        onTouchMove={clearLongPress}
        title={link.url}
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            '4px',
          cursor:         'pointer',
          userSelect:     'none',
          WebkitTapHighlightColor: 'transparent',
          position:       'relative',
        }}
      >
        {/* Icon container */}
        <div style={{
          width:           '42px',
          height:          '42px',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          borderRadius:    '10px',
          backgroundColor: accentColor
            ? `${accentColor}22`
            : 'rgba(59,130,246,0.18)',
          border: `1.5px solid ${accentColor ?? 'rgba(59,130,246,0.45)'}`,
          boxShadow:       accentColor
            ? `0 0 8px ${accentColor}55`
            : '0 2px 6px rgba(0,0,0,0.30)',
          overflow:        'hidden',
          transition:      'transform 0.1s ease',
        }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {link.favicon ? (
            <FaviconImg name={link.favicon} />
          ) : (
            <InsertLinkIcon
              sx={{ fontSize: '1.4rem', color: accentColor ?? '#3b82f6' }}
            />
          )}
        </div>

        {/* Mode badge */}
        {mode !== 'normal' && (
          <div style={{
            position:        'absolute',
            top:             '-4px',
            right:           '-4px',
            width:           '14px',
            height:          '14px',
            borderRadius:    '50%',
            backgroundColor: accentColor!,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        '8px',
            color:           '#000',
            fontWeight:      900,
          }}>
            {mode === 'edit' ? '✏' : '×'}
          </div>
        )}

        {/* Name */}
        <div style={{
          width:          '100%',
          textAlign:      'center',
          fontSize:       '9px',
          fontFamily:     'system-ui, sans-serif',
          color:          '#ffffff',
          textShadow:     '0 1px 3px rgba(0,0,0,0.85)',
          lineHeight:     1.25,
          display:            '-webkit-box',
          WebkitLineClamp:    2,
          WebkitBoxOrient:    'vertical' as const,
          overflow:           'hidden',
          overflowWrap:       'break-word',
        }}>
          {link.name || link.url}
        </div>
      </div>

      {/* ── Context menu (normal mode only) ── */}
      <Menu
        open={ctxMenu !== null}
        onClose={() => setCtxMenu(null)}
        anchorReference={ctxMenu && (ctxMenu.x || ctxMenu.y)
          ? 'anchorPosition'
          : 'anchorEl'}
        anchorPosition={ctxMenu && (ctxMenu.x || ctxMenu.y)
          ? { top: ctxMenu.y, left: ctxMenu.x }
          : undefined}
        slotProps={{ paper: { sx: { minWidth: '160px' } } }}
      >
        <MenuItem onClick={() => { setCtxMenu(null); copyToClipboard(link.url); }} dense>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Copiar enlace</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setCtxMenu(null); onEdit(link); }} dense>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Editar nombre</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => { setCtxMenu(null); onDelete(link.id); }} dense
          sx={{ color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } }}
        >
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Borrar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
