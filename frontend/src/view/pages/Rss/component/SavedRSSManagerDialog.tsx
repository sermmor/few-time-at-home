import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon      from '@mui/icons-material/Close';
import EditIcon        from '@mui/icons-material/Edit';
import DeleteIcon      from '@mui/icons-material/Delete';
import SaveIcon        from '@mui/icons-material/Save';
import CancelIcon      from '@mui/icons-material/Cancel';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ReadLaterRSSActions } from '../../../../core/actions/readLaterRss';
import { ReadLaterMessage } from '../../../../data-model/readLaterRss';

// ── Cyberpunk palette ──────────────────────────────────────────────────────────
const CY = {
  bg:       '#020c18',
  bgPanel:  '#071526',
  bgRow:    '#0a1e35',
  cyan:     '#00ffe7',
  cyanDim:  'rgba(0,255,231,0.55)',
  cyanFaint:'rgba(0,255,231,0.08)',
  magenta:  '#ff00cc',
  border:   'rgba(0,255,231,0.2)',
  borderHi: 'rgba(0,255,231,0.45)',
  text:     '#e0e0e0',
  textDim:  '#5a7080',
};

const PAGE_SIZE = 20;

// ── URL renderer ──────────────────────────────────────────────────────────────
const URL_RE = /https?:\/\/[^\s]+/g;

const MessageWithLinks: React.FC<{ text: string }> = ({ text }) => {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={last}>{text.slice(last, match.index)}</span>);
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{ color: CY.cyan, wordBreak: 'break-all', textDecorationColor: CY.cyanDim }}
      >
        {url}
      </a>
    );
    last = match.index + url.length;
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>);
  return <>{parts}</>;
};

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  open:    boolean;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────
export const SavedRSSManagerDialog: React.FC<Props> = ({ open, onClose }) => {
  const [items,    setItems   ] = React.useState<ReadLaterMessage[]>([]);
  const [total,    setTotal   ] = React.useState(0);
  const [page,     setPage    ] = React.useState(1);
  const [loading,  setLoading ] = React.useState(false);
  const [editId,   setEditId  ] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState('');
  const [saving,   setSaving  ] = React.useState(false);
  const [deleting, setDeleting] = React.useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Fetch page ───────────────────────────────────────────────────────────────
  const fetchPage = React.useCallback((p: number) => {
    setLoading(true);
    setEditId(null);
    ReadLaterRSSActions.getAll({ page: p, pageSize: PAGE_SIZE })
      .then(({ data, total: t }) => {
        setItems(data);
        setTotal(t);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (open) { setPage(1); fetchPage(1); }
  }, [open, fetchPage]);

  const goToPage = (p: number) => {
    setPage(p);
    fetchPage(p);
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const startEdit = (item: ReadLaterMessage) => {
    setEditId(item.id);
    setEditText(item.message);
  };
  const cancelEdit = () => setEditId(null);
  const saveEdit = () => {
    if (editId === null) return;
    setSaving(true);
    ReadLaterRSSActions.update({ id: editId, message: editText })
      .then(() => {
        setItems(prev => prev.map(i => i.id === editId ? { ...i, message: editText } : i));
        setEditId(null);
      })
      .finally(() => setSaving(false));
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = (id: number) => {
    setDeleting(id);
    ReadLaterRSSActions.remove({ id })
      .then(() => {
        // Re-fetch the same page (or previous if it became empty)
        const newTotal = total - 1;
        const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
        const targetPage = Math.min(page, newTotalPages);
        setTotal(newTotal);
        setPage(targetPage);
        fetchPage(targetPage);
      })
      .finally(() => setDeleting(null));
  };

  // ── ESC key ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { backgroundColor: CY.bg, backgroundImage: 'none' } }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Box sx={{
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        px: '1.25rem',
        py: '0.75rem',
        borderBottom: `1px solid ${CY.border}`,
        backgroundColor: CY.bgPanel,
        flexShrink: 0,
      }}>
        <Box>
          <Typography sx={{
            fontFamily: 'monospace', fontWeight: 700,
            fontSize: '0.85rem', color: CY.cyan, letterSpacing: '2px',
          }}>
            // GESTIONAR GUARDADOS
          </Typography>
          <Typography sx={{
            fontFamily: 'monospace', fontSize: '0.7rem', color: CY.textDim, mt: '1px',
          }}>
            {total} elemento{total !== 1 ? 's' : ''} · página {page} de {totalPages}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: CY.cyanDim, '&:hover': { color: CY.cyan } }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress sx={{ color: CY.cyan }} size={32} />
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: '0.75rem', sm: '1.5rem' }, py: '0.75rem' }}>
            {items.length === 0 ? (
              <Box sx={{ textAlign: 'center', mt: '4rem' }}>
                <Typography sx={{ fontFamily: 'monospace', color: CY.textDim, fontSize: '0.85rem' }}>
                  // SIN ELEMENTOS //
                </Typography>
              </Box>
            ) : items.map((item, idx) => (
              <Box
                key={item.id}
                sx={{
                  mb: '0.5rem',
                  p: '0.75rem 1rem',
                  backgroundColor: idx % 2 === 0 ? CY.bgRow : CY.bgPanel,
                  border: `1px solid ${CY.border}`,
                  borderRadius: '3px',
                  '&:hover': { borderColor: CY.borderHi },
                  transition: 'border-color 0.15s',
                }}
              >
                {editId === item.id ? (
                  /* ── Edit mode ─────────────────────────────────────── */
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <TextField
                      multiline
                      fullWidth
                      minRows={3}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      variant="outlined"
                      size="small"
                      autoFocus
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          fontFamily: 'monospace', fontSize: '0.8rem',
                          color: CY.text,
                          '& fieldset': { borderColor: CY.border },
                          '&:hover fieldset': { borderColor: CY.cyan },
                          '&.Mui-focused fieldset': { borderColor: CY.cyan },
                        },
                        '& .MuiInputBase-input': { backgroundColor: 'transparent' },
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={12} color="inherit" /> : <SaveIcon fontSize="small" />}
                        disabled={saving}
                        onClick={saveEdit}
                        sx={{
                          backgroundColor: CY.cyan, color: CY.bg,
                          fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700,
                          '&:hover': { backgroundColor: '#00cfc0' },
                        }}
                      >
                        Guardar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CancelIcon fontSize="small" />}
                        onClick={cancelEdit}
                        disabled={saving}
                        sx={{
                          borderColor: CY.border, color: CY.cyanDim,
                          fontFamily: 'monospace', fontSize: '0.72rem',
                          '&:hover': { borderColor: CY.cyan, color: CY.cyan },
                        }}
                      >
                        Cancelar
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  /* ── View mode ─────────────────────────────────────── */
                  <Box sx={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    {/* ID badge */}
                    <Box sx={{
                      flexShrink: 0, minWidth: '2.2rem', textAlign: 'right',
                      fontFamily: 'monospace', fontSize: '0.68rem',
                      color: CY.textDim, pt: '2px',
                    }}>
                      #{item.id}
                    </Box>

                    {/* Message */}
                    <Typography
                      component="div"
                      sx={{
                        flex: 1, fontFamily: 'monospace', fontSize: '0.8rem',
                        color: CY.text, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      <MessageWithLinks text={item.message} />
                    </Typography>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', flexShrink: 0, gap: '0.25rem' }}>
                      <IconButton
                        size="small"
                        onClick={() => startEdit(item)}
                        title="Editar"
                        sx={{ color: CY.cyanDim, '&:hover': { color: CY.cyan } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        title="Borrar"
                        sx={{ color: 'rgba(255,0,204,0.5)', '&:hover': { color: CY.magenta } }}
                      >
                        {deleting === item.id
                          ? <CircularProgress size={16} sx={{ color: CY.magenta }} />
                          : <DeleteIcon fontSize="small" />
                        }
                      </IconButton>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.75rem', py: '0.75rem',
          borderTop: `1px solid ${CY.border}`,
          backgroundColor: CY.bgPanel, flexShrink: 0,
        }}>
          <IconButton
            size="small"
            disabled={page <= 1 || loading}
            onClick={() => goToPage(page - 1)}
            sx={{ color: CY.cyanDim, '&:not(:disabled):hover': { color: CY.cyan } }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: CY.cyanDim }}>
            {page} / {totalPages}
          </Typography>

          <IconButton
            size="small"
            disabled={page >= totalPages || loading}
            onClick={() => goToPage(page + 1)}
            sx={{ color: CY.cyanDim, '&:not(:disabled):hover': { color: CY.cyan } }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
