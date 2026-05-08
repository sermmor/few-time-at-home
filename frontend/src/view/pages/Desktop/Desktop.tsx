import React from 'react';
import {
  Divider,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  DesktopActions,
  DesktopConfig,
  DEFAULT_DESKTOP_CONFIG,
  StickyNote,
  DesktopLink,
  DesktopImage,
  DesktopPanel,
} from '../../../core/actions/desktop';
import { desktopFlushEndpoint } from '../../../core/urls-and-end-points';
import { DesktopPropertiesDialog } from './DesktopPropertiesDialog';
import { StickyNoteWidget } from './StickyNoteWidget';
import { AddLinkDialog } from './AddLinkDialog';
import { DesktopLinkWidget } from './DesktopLinkWidget';
import { DesktopTablet } from './DesktopTablet';
import {
  CANVAS_TOP_OFFSET,
  CANVAS_TOP_MARGIN,
  WS_W, WS_H, WS_GAP, WS_PADDING, WS_RADIUS,
  TRANSITION_MS,
  wsColor,
  getDirection,
  EXIT_ANIM,
  wallpaperUrl,
  SLIDE_KEYFRAMES,
  SlideState,
  type Direction,
} from './DesktopCommons';
import { DesktopImageWidget } from './DesktopImageWidget';
import { DesktopPanelWidget } from './DesktopPanelWidget';
import { ModalCloudImagePicker } from '../../molecules/ModalCloudImagePicker/ModalCloudImagePicker';

// ── Component ─────────────────────────────────────────────────────────────────
export const Desktop = (): JSX.Element => {

  // ── Shared state ──────────────────────────────────────────────────────────
  const [config,        setConfig       ] = React.useState<DesktopConfig>(DEFAULT_DESKTOP_CONFIG);
  const [activeWs,      setActiveWs     ] = React.useState(0);
  const [visible,       setVisible      ] = React.useState(false);
  const [slide,         setSlide        ] = React.useState<SlideState | null>(null);
  const [contextMenu,   setContextMenu  ] = React.useState<{ x: number; y: number } | null>(null);
  const [propsOpen,     setPropsOpen    ] = React.useState(false);
  const [linkDialogOpen,setLinkDialogOpen] = React.useState(false);
  const [editingLink,   setEditingLink  ] = React.useState<DesktopLink | undefined>(undefined);
  const [imagePickerOpen, setImagePickerOpen] = React.useState(false);

  // Ref to the normal-mode canvas div (used for context-menu position calc)
  const desktopRef = React.useRef<HTMLDivElement>(null);

  // Refs so effects can read current values without re-subscribing
  const configRef   = React.useRef(config);
  configRef.current = config;
  const prevWsRef   = React.useRef(0);

  // Refs for dialog-blocking check in keyboard handler
  const propsOpenRef        = React.useRef(false);
  const linkDialogOpenRef   = React.useRef(false);
  const imagePickerOpenRef  = React.useRef(false);

  // For circular navigation direction override
  const pendingDirRef  = React.useRef<Direction | null>(null);
  // For reading current activeWs synchronously in event handler
  const activeWsRef    = React.useRef(0);

  // Update refs on every render
  propsOpenRef.current       = propsOpen;
  linkDialogOpenRef.current  = linkDialogOpen;
  imagePickerOpenRef.current = imagePickerOpen;
  activeWsRef.current        = activeWs;

  // ── Effects ───────────────────────────────────────────────────────────────

  // Load config on mount
  React.useEffect(() => {
    DesktopActions.getDesktopConfig().then(setConfig);
  }, []);

  // Clamp activeWs when the grid shrinks
  React.useEffect(() => {
    const max = config.rows * config.cols - 1;
    setActiveWs(prev => Math.min(prev, max));
  }, [config.rows, config.cols]);

  // Slide transition: fires whenever activeWs changes
  React.useEffect(() => {
    const from = prevWsRef.current;
    const to   = activeWs;
    if (from === to) return;

    const dir = pendingDirRef.current ?? getDirection(from, to, configRef.current.cols);
    pendingDirRef.current = null;
    prevWsRef.current = to;

    const fromPath = configRef.current.wallpapers[from] ?? '';
    setSlide({
      key:      Date.now(),
      color:    wsColor(from),
      wallpaper: fromPath ? wallpaperUrl(fromPath) : null,
      dir,
    });
  }, [activeWs]);

  // Keyboard navigation (Shift + arrows) + overlay visibility
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      // Block workspace switching while any dialog is open
      if (propsOpenRef.current || linkDialogOpenRef.current || imagePickerOpenRef.current) return;
      setVisible(true);

      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        const cols = configRef.current.cols;
        const rows = configRef.current.rows;
        const cur  = activeWsRef.current;
        const col  = cur % cols;
        const row  = Math.floor(cur / cols);

        let next: number = cur;
        let overrideDir: Direction | null = null;

        if (e.key === 'ArrowRight') {
          if (col < cols - 1) {
            next = cur + 1;
          } else {
            next = cur - (cols - 1);   // wrap to col 0, same row
            overrideDir = 'right';
          }
        } else if (e.key === 'ArrowLeft') {
          if (col > 0) {
            next = cur - 1;
          } else {
            next = cur + (cols - 1);   // wrap to last col, same row
            overrideDir = 'left';
          }
        } else if (e.key === 'ArrowDown') {
          if (row < rows - 1) {
            next = cur + cols;
          } else {
            next = cur - cols * (rows - 1);  // wrap to row 0, same col
            overrideDir = 'down';
          }
        } else if (e.key === 'ArrowUp') {
          if (row > 0) {
            next = cur - cols;
          } else {
            next = cur + cols * (rows - 1);  // wrap to last row, same col
            overrideDir = 'up';
          }
        }

        if (next !== cur) {
          if (overrideDir !== null) pendingDirRef.current = overrideDir;
          setActiveWs(next);
        }
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

  // Flush on tab/window close (sendBeacon is reliable here)
  React.useEffect(() => {
    const handler = () =>
      navigator.sendBeacon(
        desktopFlushEndpoint(),
        new Blob(['{}'], { type: 'application/json' }),
      );
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Flush when navigating away (component unmount)
  React.useEffect(() => {
    return () => { DesktopActions.flushDesktopConfig(); };
  }, []);

  // ── Config helpers ────────────────────────────────────────────────────────
  const saveConfig = (updated: DesktopConfig) => {
    setConfig(updated);
    DesktopActions.saveDesktopConfig(updated);
  };

  // ── Note handlers ─────────────────────────────────────────────────────────
  const addNote = () => {
    const rect = desktopRef.current?.getBoundingClientRect();
    const x = contextMenu ? Math.max(0, contextMenu.x - (rect?.left ?? 0) - 110) : 60;
    const y = contextMenu ? Math.max(0, contextMenu.y - (rect?.top  ?? 0) - 90)  : 60;
    const newNote: StickyNote = {
      id:             `note-${Date.now()}`,
      workspaceIndex: activeWs,
      x, y,
      width:   220,
      height:  180,
      content: '',
    };
    saveConfig({ ...config, notes: [...(config.notes ?? []), newNote] });
    setContextMenu(null);
  };

  const updateNote = (id: string, changes: Partial<StickyNote>) => {
    setConfig(prev => {
      const updated = {
        ...prev,
        notes: (prev.notes ?? []).map(n => n.id === id ? { ...n, ...changes } : n),
      };
      DesktopActions.saveDesktopConfig(updated);
      return updated;
    });
  };

  const deleteNote = (id: string) => {
    setConfig(prev => {
      const updated = {
        ...prev,
        notes: (prev.notes ?? []).filter(n => n.id !== id),
      };
      DesktopActions.saveDesktopConfig(updated);
      return updated;
    });
  };

  // ── Image handlers ────────────────────────────────────────────────────────
  const addImage = (cloudPath: string) => {
    const rect = desktopRef.current?.getBoundingClientRect();
    const x = contextMenu ? Math.max(0, contextMenu.x - (rect?.left ?? 0) - 150) : 100;
    const y = contextMenu ? Math.max(0, contextMenu.y - (rect?.top  ?? 0) - 100) : 100;
    const newImage: DesktopImage = {
      id:             `img-${Date.now()}`,
      workspaceIndex: activeWs,
      x, y,
      width:  300,
      height: 0,   // 0 = auto-size after image loads
      cloudPath,
    };
    saveConfig({ ...config, images: [...(config.images ?? []), newImage] });
    setImagePickerOpen(false);
    setContextMenu(null);
  };

  const updateImage = (id: string, changes: Partial<DesktopImage>) => {
    setConfig(prev => {
      const updated = {
        ...prev,
        images: (prev.images ?? []).map(im => im.id === id ? { ...im, ...changes } : im),
      };
      DesktopActions.saveDesktopConfig(updated);
      return updated;
    });
  };

  const deleteImage = (id: string) => {
    setConfig(prev => {
      const updated = {
        ...prev,
        images: (prev.images ?? []).filter(im => im.id !== id),
      };
      DesktopActions.saveDesktopConfig(updated);
      return updated;
    });
  };

  // ── Panel handlers ────────────────────────────────────────────────────────
  const addPanel = () => {
    const rect = desktopRef.current?.getBoundingClientRect();
    const x = contextMenu ? Math.max(0, contextMenu.x - (rect?.left ?? 0) - 100) : 80;
    const y = contextMenu ? Math.max(0, contextMenu.y - (rect?.top  ?? 0) - 75)  : 80;
    const newPanel: DesktopPanel = {
      id:             `panel-${Date.now()}`,
      workspaceIndex: activeWs,
      x, y,
      width:  200,
      height: 150,
    };
    saveConfig({ ...config, panels: [...(config.panels ?? []), newPanel] });
    setContextMenu(null);
  };

  const updatePanel = (id: string, changes: Partial<DesktopPanel>) => {
    setConfig(prev => {
      const updated = {
        ...prev,
        panels: (prev.panels ?? []).map(p => p.id === id ? { ...p, ...changes } : p),
      };
      DesktopActions.saveDesktopConfig(updated);
      return updated;
    });
  };

  const deletePanel = (id: string) => {
    setConfig(prev => {
      const updated = {
        ...prev,
        panels: (prev.panels ?? []).filter(p => p.id !== id),
      };
      DesktopActions.saveDesktopConfig(updated);
      return updated;
    });
  };

  // ── Link handlers ─────────────────────────────────────────────────────────
  const openAddLinkDialog = () => {
    setEditingLink(undefined);
    setLinkDialogOpen(true);
    setContextMenu(null);
  };

  const handleLinkAccept = (url: string, name: string) => {
    if (editingLink) {
      setConfig(prev => {
        const updated = {
          ...prev,
          links: (prev.links ?? []).map(l =>
            l.id === editingLink.id ? { ...l, name } : l,
          ),
        };
        DesktopActions.saveDesktopConfig(updated);
        return updated;
      });
    } else {
      const rect = desktopRef.current?.getBoundingClientRect();
      const x = contextMenu ? Math.max(0, contextMenu.x - (rect?.left ?? 0) - 38) : 80;
      const y = contextMenu ? Math.max(0, contextMenu.y - (rect?.top  ?? 0) - 30) : 80;
      const newLink: DesktopLink = {
        id:             `link-${Date.now()}`,
        workspaceIndex: activeWs,
        x, y, url, name,
      };
      setConfig(prev => {
        const updated = { ...prev, links: [...(prev.links ?? []), newLink] };
        DesktopActions.saveDesktopConfig(updated);
        return updated;
      });
      DesktopActions.getFavicon(url).then(favicon => {
        if (favicon) updateLink(newLink.id, { favicon });
      });
    }
  };

  const updateLink = (id: string, changes: Partial<DesktopLink>) => {
    setConfig(prev => {
      const updated = {
        ...prev,
        links: (prev.links ?? []).map(l => l.id === id ? { ...l, ...changes } : l),
      };
      DesktopActions.saveDesktopConfig(updated);
      return updated;
    });
  };

  const deleteLink = (id: string) => {
    setConfig(prev => {
      const updated = {
        ...prev,
        links: (prev.links ?? []).filter(l => l.id !== id),
      };
      DesktopActions.saveDesktopConfig(updated);
      return updated;
    });
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const COLS  = config.cols;
  const ROWS  = config.rows;
  const TOTAL = COLS * ROWS;

  const activeWsPath    = config.wallpapers[activeWs] ?? '';
  const activeWallpaper = activeWsPath ? wallpaperUrl(activeWsPath) : null;

  const linksForActiveWs  = (config.links  ?? []).filter(l  => l.workspaceIndex  === activeWs);
  const notesForActiveWs  = (config.notes  ?? []).filter(n  => n.workspaceIndex  === activeWs);
  const imagesForActiveWs = (config.images ?? []).filter(im => im.workspaceIndex === activeWs);
  const panelsForActiveWs = (config.panels ?? []).filter(p  => p.workspaceIndex  === activeWs);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {config.tabletMode ? (
        // ── Tablet mode: delegated to DesktopTablet ──────────────────────
        <DesktopTablet
          activeWs={activeWs}
          setActiveWs={setActiveWs}
          slide={slide}
          setSlide={setSlide}
          activeWallpaper={activeWallpaper}
          linksForActiveWs={linksForActiveWs}
          notesForActiveWs={notesForActiveWs}
          onDeleteLink={deleteLink}
          onEditLink={l => { setEditingLink(l); setLinkDialogOpen(true); }}
          onAddLink={openAddLinkDialog}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onPropsOpen={() => setPropsOpen(true)}
          COLS={COLS}
          ROWS={ROWS}
          TOTAL={TOTAL}
          wsOverlayVisible={visible}
        />
      ) : (
        // ── Normal mode: free-floating desktop ───────────────────────────
        <>
          <style>{SLIDE_KEYFRAMES}</style>

          <div
            ref={desktopRef}
            tabIndex={0}
            autoFocus
            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
            style={{
              position:           'relative',
              marginTop:          CANVAS_TOP_MARGIN,
              marginLeft:         '-1rem',
              marginRight:        '-1rem',
              width:              'calc(100% + 2rem)',
              height:             `calc(100vh - ${CANVAS_TOP_OFFSET})`,
              overflow:           'hidden',
              outline:            'none',
              backgroundColor:    activeWallpaper ? 'transparent' : wsColor(activeWs),
              backgroundImage:    activeWallpaper ? `url(${activeWallpaper})` : 'none',
              backgroundSize:     'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Outgoing workspace slide-out animation layer */}
            {slide && (
              <div
                key={slide.key}
                style={{
                  position:           'absolute',
                  inset:              0,
                  pointerEvents:      'none',   // never intercept clicks during animation
                  backgroundColor:    slide.wallpaper ? 'transparent' : slide.color,
                  backgroundImage:    slide.wallpaper ? `url(${slide.wallpaper})` : 'none',
                  backgroundSize:     'cover',
                  backgroundPosition: 'center',
                  animation:          `${EXIT_ANIM[slide.dir]} ${TRANSITION_MS}ms ease forwards`,
                }}
                onAnimationEnd={() => setSlide(null)}
              />
            )}

            {/* Dark panel widgets (behind links and notes) */}
            {panelsForActiveWs.map(panel => (
              <DesktopPanelWidget
                key={panel.id}
                panel={panel}
                onUpdate={updatePanel}
                onDelete={deletePanel}
              />
            ))}

            {/* Sticky notes */}
            {notesForActiveWs.map(note => (
              <StickyNoteWidget
                key={note.id}
                note={note}
                onUpdate={updateNote}
                onDelete={deleteNote}
              />
            ))}

            {/* Image widgets */}
            {imagesForActiveWs.map(im => (
              <DesktopImageWidget
                key={im.id}
                image={im}
                onUpdate={updateImage}
                onDelete={deleteImage}
              />
            ))}

            {/* Free-floating link widgets */}
            {linksForActiveWs.map(link => (
              <DesktopLinkWidget
                key={link.id}
                link={link}
                onUpdate={updateLink}
                onDelete={deleteLink}
                onEdit={l => { setEditingLink(l); setLinkDialogOpen(true); }}
              />
            ))}

            {/* Workspace switcher overlay (visible while Shift is held) */}
            <div style={{
              position:       'absolute',
              inset:          0,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              pointerEvents:  'none',
              zIndex:         500,
              opacity:        visible ? 1 : 0,
              transition:     'opacity 0.15s ease',
            }}>
              <div style={{
                display:             'grid',
                gridTemplateColumns: `repeat(${COLS}, ${WS_W}px)`,
                gridTemplateRows:    `repeat(${ROWS}, ${WS_H}px)`,
                gap:                 `${WS_GAP}px`,
                padding:             `${WS_PADDING}px`,
                background:          'rgba(255,255,255,0.1)',
                border:              '1px solid rgba(255,255,255,0.4)',
                borderRadius:        '10px',
                backdropFilter:      'blur(4px)',
              }}>
                {Array.from({ length: TOTAL }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: `${WS_RADIUS}px`,
                      background:   i === activeWs
                        ? 'rgba(255,255,255,1.0)'
                        : 'rgba(255,255,255,0.4)',
                      transition:   'background 0.12s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right-click context menu */}
          <Menu
            open={contextMenu !== null}
            onClose={() => setContextMenu(null)}
            anchorReference="anchorPosition"
            anchorPosition={contextMenu
              ? { top: contextMenu.y, left: contextMenu.x }
              : undefined}
          >
            <MenuItem onClick={addNote}>
              <ListItemText primary="Añadir nota" />
            </MenuItem>
            <MenuItem onClick={openAddLinkDialog}>
              <ListItemText primary="Añadir link" />
            </MenuItem>
            <MenuItem onClick={() => { setImagePickerOpen(true); setContextMenu(null); }}>
              <ListItemText primary="Añadir imagen" />
            </MenuItem>
            <MenuItem onClick={addPanel}>
              <ListItemText primary="Añadir panel" />
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setContextMenu(null); setPropsOpen(true); }}>
              <ListItemText primary="Propiedades" />
            </MenuItem>
          </Menu>
        </>
      )}

      {/* ── Dialogs — rendered regardless of mode ────────────────────────── */}
      <DesktopPropertiesDialog
        isOpen={propsOpen}
        onClose={() => setPropsOpen(false)}
        config={config}
        onSave={updated => setConfig(updated)}
      />

      <AddLinkDialog
        isOpen={linkDialogOpen}
        onClose={() => { setLinkDialogOpen(false); setEditingLink(undefined); }}
        onAccept={handleLinkAccept}
        editLink={editingLink}
      />

      <ModalCloudImagePicker
        isOpen={imagePickerOpen}
        title="Añadir imagen al escritorio"
        onClose={() => { setImagePickerOpen(false); setContextMenu(null); }}
        onAccept={addImage}
      />
    </>
  );
};
