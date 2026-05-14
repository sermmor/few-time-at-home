import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon        from '@mui/icons-material/Edit';
import DeleteIcon      from '@mui/icons-material/Delete';
import { DesktopLink } from '../../../core/actions/desktop';
import { desktopFaviconImageEndpoint } from '../../../core/urls-and-end-points';
import { copyToClipboard } from '../../../core/clipboard';

export type TabletAction = 'normal' | 'edit' | 'delete';

interface Props {
  link:     DesktopLink;
  mode:     TabletAction;
  onDelete: (id: string) => void;
  onEdit:   (link: DesktopLink) => void;
}

const FaviconImg: React.FC<{ name: string }> = ({ name }) => {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <InsertLinkIcon sx={{ fontSize: '2.4rem', color: '#3b82f6',
                                           filter: 'drop-shadow(0 0 5px rgba(59,130,246,0.5))' }} />;
  return (
    <img
      src={desktopFaviconImageEndpoint(name)}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      style={{ width: '44px', height: '44px', objectFit: 'contain' }}
    />
  );
};

// Mode colours
const MODE_BORDER: Record<TabletAction, string> = {
  normal: 'rgba(59,130,246,0.45)',
  edit:   '#00ffe7',
  delete: '#ff00cc',
};
const MODE_SHADOW: Record<TabletAction, string> = {
  normal: '0 3px 10px rgba(0,0,0,0.4)',
  edit:   '0 0 0 2px #00ffe7, 0 3px 10px rgba(0,0,0,0.4)',
  delete: '0 0 0 2px #ff00cc, 0 3px 10px rgba(0,0,0,0.4)',
};

export const DesktopTabletLinkTile: React.FC<Props> = ({ link, mode, onDelete, onEdit }) => {
  const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number } | null>(null);

  const handleClick = () => {
    if      (mode === 'edit')   onEdit(link);
    else if (mode === 'delete') onDelete(link.id);
    else                        window.open(link.url, '_blank', 'noreferrer');
  };

  // Right-click / long-press only available in normal mode
  const handleContextMenu = (e: React.MouseEvent) => {
    if (mode !== 'normal') return;
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (mode !== 'normal') return;
    pressTimer.current = setTimeout(() => {
      const t = e.touches[0];
      setCtxMenu({ x: t.clientX, y: t.clientY });
    }, 500);
  };
  const handleTouchEnd = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  const closeCtx = () => setCtxMenu(null);

  return (
    <>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        title={mode === 'normal' ? link.url : mode === 'edit' ? 'Editar' : 'Borrar'}
        style={{
          width:          '96px',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            '6px',
          cursor:         mode === 'normal' ? 'pointer' : mode === 'edit' ? 'cell' : 'no-drop',
          userSelect:     'none',
          WebkitTapHighlightColor: 'transparent',
          position:       'relative',
        }}
      >
        {/* Mode badge overlay */}
        {mode !== 'normal' && (
          <div style={{
            position:        'absolute',
            top:             '-4px',
            right:           '-4px',
            width:           '22px',
            height:          '22px',
            borderRadius:    '50%',
            backgroundColor: mode === 'edit' ? '#00ffe7' : '#ff00cc',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            zIndex:          10,
            boxShadow:       '0 2px 6px rgba(0,0,0,0.5)',
          }}>
            {mode === 'edit'
              ? <EditIcon   style={{ fontSize: '13px', color: '#020c18' }} />
              : <DeleteIcon style={{ fontSize: '13px', color: '#020c18' }} />
            }
          </div>
        )}

        {/* Icon */}
        <div style={{
          width:           '64px',
          height:          '64px',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          borderRadius:    '14px',
          backgroundColor: mode === 'delete' ? 'rgba(255,0,204,0.15)' : 'rgba(59,130,246,0.18)',
          border:          `1.5px solid ${MODE_BORDER[mode]}`,
          boxShadow:       MODE_SHADOW[mode],
          overflow:        'hidden',
          transition:      'transform 0.1s ease, box-shadow 0.1s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.07)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
        >
          {link.favicon
            ? <FaviconImg name={link.favicon} />
            : <InsertLinkIcon sx={{ fontSize: '2.4rem', color: '#3b82f6',
                                    filter: 'drop-shadow(0 0 5px rgba(59,130,246,0.5))' }} />
          }
        </div>

        {/* Name */}
        <div style={{
          width:              '96px',
          textAlign:          'center',
          fontSize:           '12px',
          fontFamily:         'system-ui, sans-serif',
          color:              '#ffffff',
          textShadow:         '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)',
          lineHeight:         1.3,
          display:            '-webkit-box',
          WebkitLineClamp:    2,
          WebkitBoxOrient:    'vertical' as const,
          overflow:           'hidden',
          overflowWrap:       'break-word',
        }}>
          {link.name || link.url}
        </div>
      </div>

      {/* Context menu — only in normal mode */}
      <Menu
        open={ctxMenu !== null}
        onClose={closeCtx}
        anchorReference="anchorPosition"
        anchorPosition={ctxMenu ? { top: ctxMenu.y, left: ctxMenu.x } : undefined}
        slotProps={{ paper: { sx: { minWidth: '170px' } } }}
      >
        <MenuItem onClick={() => { closeCtx(); copyToClipboard(link.url); }} dense>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Copiar enlace</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { closeCtx(); onEdit(link); }} dense>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Editar nombre</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => { closeCtx(); onDelete(link.id); }} dense
          sx={{ color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } }}
        >
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Borrar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
