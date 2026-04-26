import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import {
  Box, FormControl, InputLabel, MenuItem, Select, SxProps, SelectChangeEvent,
  TextField, Theme, Typography, Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useConfiguredDialogAlphas } from "../../../../core/context/DialogAlphasContext";
import { useTranslation } from 'react-i18next';
import i18n from '../../../../i18n';

const STORAGE_KEY = 'app-language';

const getFooterStyle = (alpha: number): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
  alignItems: 'left',
  justifyContent: 'initial',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  background: `rgba(255, 255, 255, ${alpha})`,
  padding: '1.5rem',
});

const rowSx = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' } as const,
  gap: '2rem',
  alignItems: 'center',
  justifyContent: 'left',
  minWidth: { xs: '15.5rem', sm: '27rem', md: '50rem' },
};

const fieldSx = { minWidth: { xs: '15.5rem', sm: '5rem', md: '5rem' } };

interface OthersSectionProps {
  config: ConfigurationDataZipped;
  setConfig: (config: ConfigurationDataZipped) => void;
}

export const OthersSection: React.FC<OthersSectionProps> = ({ config, setConfig }) => {
  const alphas = useConfiguredDialogAlphas();
  const { t } = useTranslation();
  const [language, setLanguage] = React.useState(i18n.language);

  const handleLangChange = (evt: SelectChangeEvent<string>) => {
    const lang = evt.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguage(lang);
  };

  return (
    <Accordion sx={{ opacity: alphas.configurationCards }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{t('others.sectionTitle')}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={getFooterStyle(alphas.general)}>

          {/* ── Language ──────────────────────────────────────────────────── */}
          <Box sx={rowSx}>
            <Typography variant="h6" sx={{ textTransform: 'uppercase' }}>
              {t('others.language')}
            </Typography>
            <FormControl variant="standard" sx={fieldSx}>
              <InputLabel>{t('others.language')}</InputLabel>
              <Select value={language} onChange={handleLangChange}>
                <MenuItem value="en">{t('others.languageEnglish')}</MenuItem>
                <MenuItem value="es">{t('others.languageSpanish')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* ── FFMPEG ───────────────────────────────────────────────────── */}
          <Box sx={rowSx}>
            <Typography variant="h6" sx={{ textTransform: 'uppercase' }}>
              {t('others.ffmpegPath')}
            </Typography>
            <TextField
              label={t('others.ffmpegPathLabel')}
              variant="standard"
              value={config.windowsFFMPEGPath}
              sx={fieldSx}
              onChange={evt => setConfig({ ...config, windowsFFMPEGPath: evt.target.value })}
            />
          </Box>

          {/* ── Backup path ──────────────────────────────────────────────── */}
          <Box sx={rowSx}>
            <Typography variant="h6" sx={{ textTransform: 'uppercase' }}>
              {t('others.backupPath')}
            </Typography>
            <TextField
              label={t('others.backupPath')}
              variant="standard"
              value={config.backupUrls}
              sx={fieldSx}
              onChange={evt => setConfig({ ...config, backupUrls: evt.target.value })}
            />
          </Box>

          {/* ── Cloud path ───────────────────────────────────────────────── */}
          <Box sx={rowSx}>
            <Typography variant="h6" sx={{ textTransform: 'uppercase' }}>
              {t('others.cloudPath')}
            </Typography>
            <TextField
              label={t('others.cloudPath')}
              variant="standard"
              value={config.cloudRootPath}
              sx={fieldSx}
              onChange={evt => setConfig({ ...config, cloudRootPath: evt.target.value })}
            />
          </Box>

          {/* ── Workers ──────────────────────────────────────────────────── */}
          <Box sx={rowSx}>
            <Typography variant="h6" sx={{ textTransform: 'uppercase' }}>
              {t('others.numberOfWorkers')}
            </Typography>
            <TextField
              label={t('common.workers')}
              variant="outlined"
              value={config.numberOfWorkers}
              type="number"
              sx={fieldSx}
              onChange={evt => setConfig({ ...config, numberOfWorkers: +evt.target.value })}
            />
          </Box>

          {/* ── API Port ─────────────────────────────────────────────────── */}
          <Box sx={rowSx}>
            <Typography variant="h6" sx={{ textTransform: 'uppercase' }}>
              {t('others.apiPort')}
            </Typography>
            <TextField
              label={t('common.port')}
              variant="outlined"
              type="number"
              value={config.apiPort}
              sx={fieldSx}
              onChange={evt => setConfig({ ...config, apiPort: +evt.target.value })}
            />
          </Box>

          {/* ── WebSocket Port ───────────────────────────────────────────── */}
          <Box sx={rowSx}>
            <Typography variant="h6" sx={{ textTransform: 'uppercase' }}>
              {t('others.wsPort')}
            </Typography>
            <TextField
              label={t('common.port')}
              variant="outlined"
              type="number"
              value={config.webSocketPort}
              sx={fieldSx}
              onChange={evt => setConfig({ ...config, webSocketPort: +evt.target.value })}
            />
          </Box>

          {/* ── Dialog Background Alphas ─────────────────────────────────── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: { xs: '15.5rem', sm: '27rem', md: '50rem' } }}>
            <Typography variant="h6" sx={{ textTransform: 'uppercase', marginTop: '1rem' }}>
              {t('others.dialogAlphas')}
            </Typography>

            <Box sx={rowSx}>
              <Typography variant="body1">{t('others.alphaGeneral')}</Typography>
              <TextField
                label={t('others.alphaGeneralLabel')}
                variant="standard"
                type="number"
                inputProps={{ step: '0.1', min: '0', max: '1' }}
                value={config.dialogAlphas.general}
                sx={fieldSx}
                onChange={evt => setConfig({
                  ...config,
                  dialogAlphas: { ...config.dialogAlphas, general: Math.min(1, Math.max(0, +evt.target.value)) },
                })}
              />
            </Box>

            <Box sx={rowSx}>
              <Typography variant="body1">{t('others.alphaRssCard')}</Typography>
              <TextField
                label={t('others.alphaRssCardLabel')}
                variant="standard"
                type="number"
                inputProps={{ step: '0.1', min: '0', max: '1' }}
                value={config.dialogAlphas.rssCard}
                sx={fieldSx}
                onChange={evt => setConfig({
                  ...config,
                  dialogAlphas: { ...config.dialogAlphas, rssCard: Math.min(1, Math.max(0, +evt.target.value)) },
                })}
              />
            </Box>

            <Box sx={rowSx}>
              <Typography variant="body1">{t('others.alphaPomodoroEditor')}</Typography>
              <TextField
                label={t('others.alphaPomodoroEditorLabel')}
                variant="standard"
                type="number"
                inputProps={{ step: '0.1', min: '0', max: '1' }}
                value={config.dialogAlphas.pomodoroEditorConfig}
                sx={fieldSx}
                onChange={evt => setConfig({
                  ...config,
                  dialogAlphas: { ...config.dialogAlphas, pomodoroEditorConfig: Math.min(1, Math.max(0, +evt.target.value)) },
                })}
              />
            </Box>

            <Box sx={rowSx}>
              <Typography variant="body1">{t('others.alphaConfigCards')}</Typography>
              <TextField
                label={t('others.alphaConfigCardsLabel')}
                variant="standard"
                type="number"
                inputProps={{ step: '0.1', min: '0', max: '1' }}
                value={config.dialogAlphas.configurationCards}
                sx={fieldSx}
                onChange={evt => setConfig({
                  ...config,
                  dialogAlphas: { ...config.dialogAlphas, configurationCards: Math.min(1, Math.max(0, +evt.target.value)) },
                })}
              />
            </Box>
          </Box>

        </Box>
        <ConfigurationSaveButton config={config} type={'configuration'} />
      </AccordionDetails>
    </Accordion>
  );
};
