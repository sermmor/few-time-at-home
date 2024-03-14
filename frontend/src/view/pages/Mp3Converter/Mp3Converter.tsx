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

  return <Box sx={formStyle}>
    <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
      Video/Audio To Mp3 
    </Typography>
    <Box sx={{ display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '1rem' }}>
      
    </Box>
  </Box>;
}
