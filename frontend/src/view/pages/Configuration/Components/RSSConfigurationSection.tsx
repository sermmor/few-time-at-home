import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { RSSActions } from "../../../../core/actions/rss";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useConfiguredDialogAlphas } from "../../../../core/context/DialogAlphasContext";

const CYAN      = '#00ffe7';
const CYAN_DIM  = 'rgba(0,255,231,0.55)';
const CYAN_BORD = 'rgba(0,255,231,0.15)';
const BG        = '#020c18';
const MONO      = '"Courier New", Courier, monospace';

const sectionSx = {
  display:       'flex',
  flexDirection: 'column' as const,
  gap:           '1.5rem',
  padding:       '1.5rem',
  background:    BG,
  width:         '100%',
};

const rowSx = {
  display:       'flex',
  flexDirection: 'row' as const,
  flexWrap:      'wrap' as const,
  gap:           '2rem',
  alignItems:    'center',
};

const labelSx = {
  fontFamily:    MONO,
  fontSize:      '0.82rem',
  letterSpacing: '0.08rem',
  textTransform: 'uppercase' as const,
  color:         CYAN,
  minWidth:      '18rem',
};

const fieldSx = {
  minWidth: { xs: '15.5rem', sm: '10rem', md: '12rem' },
};

interface RSSConfigurationSectionProps {
  config: ConfigurationDataZipped;
  setConfig: (config: ConfigurationDataZipped) => void;
}

export const RSSConfigurationSection: React.FC<RSSConfigurationSectionProps> = ({
  config,
  setConfig,
}) => {
  const alphas = useConfiguredDialogAlphas();
  const [isUpdateRss, setIsUpdateRss] = React.useState<boolean>(false);

  const rss = config.rssConfig;

  const setField = (key: keyof typeof rss, value: any) =>
    setConfig({ ...config, rssConfig: { ...rss, [key]: value } });

  const setTag = (index: number, value: string) => {
    const next = [...rss.optionTagsYoutube];
    next[index] = value;
    setField('optionTagsYoutube', next);
  };

  const addTag = () => setField('optionTagsYoutube', [...rss.optionTagsYoutube, '']);

  const deleteTag = (index: number) => {
    const next = [...rss.optionTagsYoutube];
    next.splice(index, 1);
    setField('optionTagsYoutube', next);
  };

  return (
    <Accordion sx={{ opacity: alphas.configurationCards }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Configuración RSS</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={sectionSx}>

          {/* ── updateAtStartApp ── */}
          <Box sx={rowSx}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={rss.updateAtStartApp}
                  onChange={e => setField('updateAtStartApp', e.target.checked)}
                  sx={{
                    color: CYAN_DIM,
                    '&.Mui-checked': { color: CYAN },
                  }}
                />
              }
              label={
                <Typography sx={{ ...labelSx, minWidth: 'unset' }}>
                  Update at start app
                </Typography>
              }
            />
          </Box>

          {/* ── autoUpdateTimeInSeconds ── */}
          <Box sx={rowSx}>
            <Typography sx={labelSx}>Auto update time (seconds):</Typography>
            <TextField
              variant="standard"
              type="number"
              value={rss.autoUpdateTimeInSeconds}
              sx={fieldSx}
              onChange={e => setField('autoUpdateTimeInSeconds', +e.target.value)}
            />
          </Box>

          {/* ── numMaxMessagesToSave ── */}
          <Box sx={rowSx}>
            <Typography sx={labelSx}>Max messages to save:</Typography>
            <TextField
              variant="standard"
              type="number"
              value={rss.numMaxMessagesToSave}
              sx={fieldSx}
              onChange={e => setField('numMaxMessagesToSave', +e.target.value)}
            />
          </Box>

          {/* ── initialWebNumberOfMessagesWithLinks ── */}
          <Box sx={rowSx}>
            <Typography sx={labelSx}>Initial web messages with links:</Typography>
            <TextField
              variant="standard"
              type="number"
              value={rss.initialWebNumberOfMessagesWithLinks}
              sx={fieldSx}
              onChange={e => setField('initialWebNumberOfMessagesWithLinks', +e.target.value)}
            />
          </Box>

          {/* ── normalWebNumberOfMessagesWithLinks ── */}
          <Box sx={rowSx}>
            <Typography sx={labelSx}>Normal web messages with links:</Typography>
            <TextField
              variant="standard"
              type="number"
              value={rss.normalWebNumberOfMessagesWithLinks}
              sx={fieldSx}
              onChange={e => setField('normalWebNumberOfMessagesWithLinks', +e.target.value)}
            />
          </Box>

          {/* ── optionTagsYoutube ── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Typography sx={labelSx}>YouTube tags:</Typography>
              <IconButton size="small" onClick={addTag} sx={{ color: CYAN }}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>
            {rss.optionTagsYoutube.map((tag, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1rem', borderLeft: `2px solid ${CYAN_BORD}` }}>
                <TextField
                  variant="standard"
                  value={tag}
                  sx={{ minWidth: { xs: '12rem', sm: '18rem' } }}
                  onChange={e => setTag(i, e.target.value)}
                />
                <IconButton size="small" onClick={() => deleteTag(i)} sx={{ color: CYAN_DIM, '&:hover': { color: '#ff00cc' } }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>

          {/* ── Force Update ── */}
          <Box>
            <Button
              variant="outlined"
              disabled={isUpdateRss}
              onClick={() => {
                setIsUpdateRss(true);
                RSSActions.postForceUpdate().then(() => setIsUpdateRss(false));
              }}
              sx={{ minWidth: { xs: '15.5rem', sm: '10rem' } }}
            >
              Force Update
            </Button>
          </Box>

        </Box>
        <ConfigurationSaveButton config={config} type={'rssConfig'} />
      </AccordionDetails>
    </Accordion>
  );
};
