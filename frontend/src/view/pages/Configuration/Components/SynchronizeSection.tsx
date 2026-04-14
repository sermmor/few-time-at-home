import React from "react";
import { Box, Button, TextField, Typography, SxProps, Theme } from "@mui/material";
import { synchronizeActions } from "../../../../core/actions/synchronize";

const commandLineStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'left',
  justifyContent: 'initial',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  marginBottom: '2rem',
  padding: '1rem',
  color: 'rgb(30, 30, 30)',
  backgroundColor: 'rgba(245, 245, 245, .7)',
};

interface SynchronizeSectionProps {
  synchronizeUrl: string;
  setSynchronizeUrl: (url: string) => void;
}

export const SynchronizeSection: React.FC<SynchronizeSectionProps> = ({
  synchronizeUrl,
  setSynchronizeUrl,
}) => {
  return (
    <Box sx={commandLineStyle}>
      <Typography variant='h6' sx={{textTransform: 'uppercase'}}>Synchronize all data:</Typography>
      <TextField
        label="Url backend to Synchronize:"
        variant="standard"
        value={synchronizeUrl}
        sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '30rem'}}}
        onChange={evt => {
          setSynchronizeUrl(evt.target.value);
        }}
      />
      <Button
        variant='contained'
        sx={{minWidth: '15.5rem'}}
        onClick={() => synchronizeActions.downloadData(synchronizeUrl)}
      >
        Download
      </Button>
    </Box>
  );
};
