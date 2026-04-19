import React from "react";
import { Box, Button, Collapse, IconButton, InputAdornment, TextField, Tooltip } from "@mui/material";
import AddLinkIcon from '@mui/icons-material/AddLink';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import { UnfurlActions } from "../../../../core/actions/unfurl";

const getCurrentDate = () => new Date().toString();

interface Props {
  onNewMessage: (title: string, url: string, date: string) => Promise<void>;
}

export const NewMessage = ({ onNewMessage }: Props) => {
  const [open, setOpen]       = React.useState(false);
  const [url, setUrl]         = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleAdd = () => {
    if (!url.trim()) return;
    setLoading(true);
    UnfurlActions.getUnfurl({ urlList: [url], loadTime: 5000 })
      .then(allData => {
        const data = allData?.length ? allData[0] : { title: '' };
        return onNewMessage(data.title, url, getCurrentDate());
      })
      .then(() => {
        setUrl('');
        setOpen(false);
      })
      .finally(() => setLoading(false));
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>

      {/* Toggle button */}
      <Tooltip title={open ? 'Cancelar' : 'Añadir enlace a Saved'} placement="left">
        <IconButton
          onClick={() => { setOpen(o => !o); setUrl(''); }}
          size="small"
          color={open ? 'default' : 'primary'}
          sx={{
            border: '1px solid',
            borderColor: open ? 'divider' : 'primary.main',
            borderRadius: '8px',
            px: 1.5,
            gap: 0.5,
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          {open ? <CloseIcon fontSize="small" /> : <><AddLinkIcon fontSize="small" /><span style={{ marginLeft: 4 }}>Añadir enlace</span></>}
        </IconButton>
      </Tooltip>

      {/* Collapsible form */}
      <Collapse in={open} sx={{ width: '100%' }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: '0.75rem',
          p: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'rgba(245,245,245,0.6)',
        }}>
          <TextField
            label="URL"
            variant="outlined"
            size="small"
            fullWidth
            value={url}
            onChange={evt => setUrl(evt.target.value)}
            onKeyDown={evt => evt.key === 'Enter' && handleAdd()}
            placeholder="https://..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            autoFocus
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={loading || !url.trim()}
            sx={{ whiteSpace: 'nowrap', minWidth: '90px', textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </Button>
        </Box>
      </Collapse>

    </Box>
  );
};
