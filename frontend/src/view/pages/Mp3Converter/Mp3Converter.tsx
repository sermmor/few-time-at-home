import { Box, Button, SxProps, TextField, Theme, Typography } from "@mui/material";
import React from "react";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

export const Mp3Converter = () => {
  const [folderFrom, setFolderFrom] = React.useState<string>('');
  const [folderTo, setFolderTo] = React.useState<string>('');

  return <Box sx={formStyle}>
    <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
      Video/Audio To Mp3 
    </Typography>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <TextField
        label="From convert path"
        variant="standard"
        value={folderFrom}
        sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
        onChange={evt => setFolderFrom(evt.target.value)}
      />
      <TextField
        label="To convert path"
        variant="standard"
        value={folderTo}
        sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
        onChange={evt => setFolderTo(evt.target.value)}
      />
    </Box>
  </Box>;
}
