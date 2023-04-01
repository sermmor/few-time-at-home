import { Box, Button, SxProps, TextareaAutosize, TextField, Theme, Typography } from "@mui/material";
import React from "react";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const textAreaStyle: SxProps<Theme> = {
  width: {xs: '15.5rem', sm: '27rem', md: '50rem', lg: '80%'},
}

const downloadText = (text: string) => {
  const blob = new Blob([text], { type: "text/plain"});
  const anchor = document.createElement("a");
  anchor.download = "MyNotes.txt";
  anchor.href = window.URL.createObjectURL(blob);
  anchor.target ="_blank";
  anchor.style.display = "none"; 
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export const Notepad = () => {
  const [textData, setTextData] = React.useState<string>('');

  return <Box sx={formStyle}>
    <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
      Notepad
    </Typography>
    <TextField
      id="outlined-multiline-static"
      label="Mi bloc de notas"
      multiline
      rows={30}
      sx={textAreaStyle}
      placeholder="Escribe lo que quieras aquí"
      value={textData}
      onChange={evt => setTextData(evt.target.value)}
      onKeyDown={(evt) => {
        if (evt.key === 'Tab') {
          evt.preventDefault();
          setTextData(`${textData}\t`)
          console.log("tab pushed");
        }
      }}
    />
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => navigator.clipboard.writeText(textData)}
        >
        Copiar
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => setTextData('')}
        >
        Borrar
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => downloadText(textData)}
        >
        Descargar
      </Button>
    </Box>
  </Box>;
}
