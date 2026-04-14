import React from "react";
import { ConfigurationDataZipped } from "../../../../data-model/configuration";
import { ConfigurationSaveButton } from "./ConfigurationSaveButton";
import { Box, Checkbox, SxProps, TextField, Theme, Typography } from "@mui/material";

const footerStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
  alignItems: 'left',
  justifyContent: 'initial',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  background: "rgba(255, 255, 255, .6)",
  padding: '1.5rem',
};

interface OthersSectionProps {
  config: ConfigurationDataZipped;
  setConfig: (config: ConfigurationDataZipped) => void;
}

export const OthersSection: React.FC<OthersSectionProps> = ({
  config,
  setConfig,
}) => {
  return (
    <>
    <Box sx={footerStyle}>
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
    </Box>
    <ConfigurationSaveButton config={config} type={'configuration'} />
    </>
  );
};
