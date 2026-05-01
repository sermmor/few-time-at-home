import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem as MuiMenuItem,
  Popover,
  Select,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { StickyNote } from '../../../core/actions/desktop';

interface Props {
  note:     StickyNote;
  onUpdate: (id: string, changes: Partial<StickyNote>) => void;
  onDelete: (id: string) => void;
}

const MIN_W = 160;
const MIN_H = 120;

const DEFAULT_COLOR     = '#fef9c3';
const DEFAULT_FONT_SIZE = 13;
const FONT_SIZES        = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32];

// ── Helpers de color ───────────────────────────────────────────────────────────
/** Capa oscura sobre el color de fondo para la cabecera */
const headerBg = (base: string) =>
  `linear-gradient(rgba(0,0,0,0.09), rgba(0,0,0,0.09)), ${base}`;

/** Borde semitransparente que funciona con cualquier color */
const BORDER = 'rgba(0,0,0,0.22)';
const TEXT   = '#1c1917';
const CTRL_C = 'rgba(0,0,0,0.48)'; // color de los botones de control (×, ⋮)

// ── Componente ─────────────────────────────────────────────────────────────────
export const StickyNoteWidget: React.FC<Props> = ({ note, onUpdate, onDelete }) => {
  // Posición y tamaño — estado local para movimiento/resize fluido
  const [lx, setLx] = React.useState(note.x);
  const [ly, setLy] = React.useState(note.y);
  const [lw, setLw] = React.useState(note.width);
  const [lh, setLh] = React.useState(note.height);

  // Contenido
  const [content, setContent] = React.useState(note.content);

  // Color local (preview en tiempo real mientras se usa el color picker)
  const [localColor, setLocalColor] = React.useState(note.color ?? DEFAULT_COLOR);

  // Anchor del menú de opciones
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLButtonElement | null>(null);

  // Sincronizar estado local cuando la nota es completamente reemplazada (carga inicial)
  React.useEffect(() => {
    setLx(note.x);
    setLy(note.y);
    setLw(note.width);
    setLh(note.height);
    setContent(note.content);
    setLocalColor(note.color ?? DEFAULT_COLOR);
  }, [note.id]); // Solo al cambiar la identidad de la nota

  const fontSize = note.fontSize ?? DEFAULT_FONT_SIZE;

  // ── Arrastre (desde la cabecera) ─────────────────────────────────────────────
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
      onUpdate(note.id, { x: fx, y: fy });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  };

  // ── Redimensión (esquina inferior derecha) ───────────────────────────────────
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
      onUpdate(note.id, { width: fw, height: fh });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  };

  // ── Estilos compartidos para botones de control ──────────────────────────────
  const ctrlBtn: React.CSSProperties = {
    background:  'none',
    border:      'none',
    cursor:      'pointer',
    color:       CTRL_C,
    padding:     '0 3px',
    lineHeight:  1,
    display:     'flex',
    alignItems:  'center',
    flexShrink:  0,
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        style={{
          position:        'absolute',
          left:            lx,
          top:             ly,
          width:           lw,
          height:          lh,
          display:         'flex',
          flexDirection:   'column',
          backgroundColor: localColor,
          border:          `1px solid ${BORDER}`,
          borderRadius:    '2px',
          boxShadow:       '3px 6px 18px rgba(0,0,0,0.50)',
          zIndex:          200,
          overflow:        'hidden',
        }}
      >
        {/* ── Cabecera / barra de arrastre ─────────────────────────────────── */}
        <div
          onMouseDown={startDrag}
          style={{
            height:       '22px',
            background:   headerBg(localColor),
            borderBottom: `1px solid ${BORDER}`,
            cursor:       'grab',
            display:      'flex',
            alignItems:   'center',
            flexShrink:   0,
            userSelect:   'none',
          }}
        >
          {/* Botón ⋮ opciones — izquierda */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
            title="Opciones"
            style={{ ...ctrlBtn, fontSize: '16px' }}
          >
            <MoreVertIcon sx={{ fontSize: '15px' }} />
          </button>

          {/* Zona de arrastre central (ocupa todo el espacio libre) */}
          <div style={{ flex: 1 }} />

          {/* Botón × eliminar — derecha */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => onDelete(note.id)}
            title="Eliminar nota"
            style={{ ...ctrlBtn, fontSize: '17px', fontWeight: 700 }}
          >
            ×
          </button>
        </div>

        {/* ── Área de texto ──────────────────────────────────────────────────── */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onBlur={() => onUpdate(note.id, { content })}
          onMouseDown={e => e.stopPropagation()}
          placeholder="Escribe aquí…"
          style={{
            flex:       1,
            resize:     'none',
            border:     'none',
            background: 'transparent',
            padding:    '6px 8px',
            fontFamily: '"Segoe Print", "Bradley Hand", cursive, sans-serif',
            fontSize:   `${fontSize}px`,
            color:      TEXT,
            outline:    'none',
            cursor:     'text',
            lineHeight: 1.55,
          }}
        />

        {/* ── Asa de redimensión ──────────────────────────────────────────────── */}
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
            background: `linear-gradient(135deg, transparent 50%, ${BORDER} 50%)`,
          }}
        />
      </div>

      {/* ── Popover de opciones ──────────────────────────────────────────────── */}
      <Popover
        open={!!menuAnchor}
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt:           0.5,
              borderRadius: '6px',
              minWidth:     '210px',
              boxShadow:    '0 4px 20px rgba(0,0,0,0.3)',
            },
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Color del post-it */}
          <Box>
            <Typography
              variant="caption"
              sx={{ display: 'block', mb: 0.75, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: 'text.secondary', fontSize: '0.68rem' }}
            >
              Color del post-it
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <input
                type="color"
                value={localColor}
                onChange={e => setLocalColor(e.target.value)}
                onBlur={() => onUpdate(note.id, { color: localColor })}
                style={{
                  width:        '48px',
                  height:       '32px',
                  padding:      '2px',
                  border:       '1px solid rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  cursor:       'pointer',
                  background:   'none',
                }}
              />
              {/* Preview del color con etiqueta hex */}
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {localColor.toUpperCase()}
              </Typography>
              {/* Botón para volver al color por defecto */}
              {localColor !== DEFAULT_COLOR && (
                <Typography
                  variant="caption"
                  onClick={() => { setLocalColor(DEFAULT_COLOR); onUpdate(note.id, { color: DEFAULT_COLOR }); }}
                  sx={{ cursor: 'pointer', color: 'primary.main', ml: 'auto', fontSize: '0.7rem' }}
                >
                  Restablecer
                </Typography>
              )}
            </Box>
          </Box>

          {/* Tamaño de fuente */}
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontSize: '0.8rem' }}>Tamaño de fuente</InputLabel>
            <Select
              value={fontSize}
              label="Tamaño de fuente"
              onChange={e => onUpdate(note.id, { fontSize: Number(e.target.value) })}
              sx={{ fontSize: '0.85rem' }}
            >
              {FONT_SIZES.map(s => (
                <MuiMenuItem key={s} value={s} sx={{ fontSize: '0.85rem' }}>
                  {s} px{s === DEFAULT_FONT_SIZE ? ' (por defecto)' : ''}
                </MuiMenuItem>
              ))}
            </Select>
          </FormControl>

        </Box>
      </Popover>
    </>
  );
};
