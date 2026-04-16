import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { Box, Checkbox, SxProps, TextField, Theme, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useConfiguredDialogAlphas } from "../../../../core/context/DialogAlphasContext";

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

interface OthersSectionProps {
  config: ConfigurationDataZipped;
  setConfig: (config: ConfigurationDataZipped) => void;
}

export const OthersSection: React.FC<OthersSectionProps> = ({
  config,
  setConfig,
}) => {
  const alphas = useConfiguredDialogAlphas();
  return (
    <Accordion sx={{ opacity: alphas.configurationCards }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Otros</Typography>
      </AccordionSummary>
      <AccordionDetails>
    <Box sx={getFooterStyle(alphas.general)}>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
        <Checkbox
          checked={config.showNitterRSSInAll}
          onChange={evt => {
            setConfig({
              ...config,
              showNitterRSSInAll: evt.target.checked,
            });
          }}
        />
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
          Show Twitter in 'all' rss option?
        </Typography>
      </Box>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
          Windows FFMPEG library path: 
        </Typography>
        <TextField
          label="Windows FFMPEG library path"
          variant="standard"
          value={config.windowsFFMPEGPath}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
          onChange={evt => {
            setConfig({
              ...config,
              windowsFFMPEGPath: evt.target.value,
            });
          }}
        />
      </Box>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
          Backup path
        </Typography>
        <TextField
          label="Backup path"
          variant="standard"
          value={config.backupUrls}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
          onChange={evt => {
            setConfig({
              ...config,
              backupUrls: evt.target.value,
            });
          }}
        />
      </Box>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
          Cloud path
        </Typography>
        <TextField
          label="Cloud path"
          variant="standard"
          value={config.cloudRootPath}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
          onChange={evt => {
            setConfig({
              ...config,
              cloudRootPath: evt.target.value,
            });
          }}
        />
      </Box>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
          Number of workers
        </Typography>
        <TextField
          label="Workers"
          variant="outlined"
          value={config.numberOfWorkers}
          type='number'
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
          onChange={evt => {
            setConfig({
              ...config,
              numberOfWorkers: +evt.target.value,
            });
          }}
        />
      </Box>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
          API Port:
        </Typography>
        <TextField
          label="Port"
          variant="outlined"
          type='number'
          value={config.apiPort}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
          onChange={evt => {
            setConfig({
              ...config,
              apiPort: +evt.target.value,
            });
          }}
        />
      </Box>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
          WebSocket Port:
        </Typography>
        <TextField
          label="Port"
          variant="outlined"
          type='number'
          value={config.webSocketPort}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
          onChange={evt => {
            setConfig({
              ...config,
              webSocketPort: +evt.target.value,
            });
          }}
        />
      </Box>
      <Box sx={{display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase', marginTop: '1rem'}}>
          Dialog Background Alphas
        </Typography>
        <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left'}}>
          <Typography variant='body1'>
            General (fondos de cards y paneles):
          </Typography>
          <TextField
            label="General Alpha"
            variant="standard"
            type='number'
            inputProps={{step: '0.1', min: '0', max: '1'}}
            value={config.dialogAlphas.general}
            sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
            onChange={evt => {
              setConfig({
                ...config,
                dialogAlphas: {
                  ...config.dialogAlphas,
                  general: Math.min(1, Math.max(0, +evt.target.value)),
                },
              });
            }}
          />
        </Box>
        <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left'}}>
          <Typography variant='body1'>
            RSS Card (fondo oscuro de mensajes RSS):
          </Typography>
          <TextField
            label="RSS Card Alpha"
            variant="standard"
            type='number'
            inputProps={{step: '0.1', min: '0', max: '1'}}
            value={config.dialogAlphas.rssCard}
            sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
            onChange={evt => {
              setConfig({
                ...config,
                dialogAlphas: {
                  ...config.dialogAlphas,
                  rssCard: Math.min(1, Math.max(0, +evt.target.value)),
                },
              });
            }}
          />
        </Box>
        <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left'}}>
          <Typography variant='body1'>
            Pomodoro Editor Config (editor de modos):
          </Typography>
          <TextField
            label="Pomodoro Editor Alpha"
            variant="standard"
            type='number'
            inputProps={{step: '0.1', min: '0', max: '1'}}
            value={config.dialogAlphas.pomodoroEditorConfig}
            sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
            onChange={evt => {
              setConfig({
                ...config,
                dialogAlphas: {
                  ...config.dialogAlphas,
                  pomodoroEditorConfig: Math.min(1, Math.max(0, +evt.target.value)),
                },
              });
            }}
          />
        </Box>
        <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left'}}>
          <Typography variant='body1'>
            Configuration cards (opacidad de secciones de configuración):
          </Typography>
          <TextField
            label="Configuration Cards Alpha"
            variant="standard"
            type='number'
            inputProps={{step: '0.1', min: '0', max: '1'}}
            value={config.dialogAlphas.configurationCards}
            sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
            onChange={evt => {
              setConfig({
                ...config,
                dialogAlphas: {
                  ...config.dialogAlphas,
                  configurationCards: Math.min(1, Math.max(0, +evt.target.value)),
                },
              });
            }}
          />
        </Box>
      </Box>
    </Box>
    <ConfigurationSaveButton config={config} type={'configuration'} />
      </AccordionDetails>
    </Accordion>
  );
};
