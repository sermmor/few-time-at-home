import { Box, Button, SxProps, TextField, Theme, Typography } from "@mui/material";
import React from "react";
import { NotepadActions } from "../../../core/actions/notepad";
import { NotificationsActions } from "../../../core/actions/notifications";
import { TemporalData } from "../../../service/temporalData.service";

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
  const [textData, setTextData] = React.useState<string>(TemporalData.NotepadTextData);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState<boolean>(false);
  React.useEffect(() => {
    NotificationsActions.getAreNotificationsEnabled().then(isAlertReady => setIsNotificationsEnabled(isAlertReady));
  }, []);

  const setTextNotepad = (text: string) => {
    TemporalData.NotepadTextData = text;
    setTextData(text);
  }

  return <Box sx={formStyle}>
    <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
      Notepad {isNotificationsEnabled ? undefined : <span>(<span style={{color: 'red'}}>No context in Telegram</span>)</span>}
    </Typography>
    <TextField
      id="outlined-multiline-static"
      label="Mi bloc de notas"
      multiline
      autoFocus
      rows={30}
      sx={textAreaStyle}
      placeholder="Write what you want"
      value={textData}
      onChange={evt => setTextNotepad(evt.target.value)}
      onKeyDown={(evt) => {
        if (evt.key === 'Tab') {
          evt.preventDefault();
          setTextNotepad(`${textData}\t`)
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
        Copy
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => setTextNotepad('')}
        >
        Remove
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => downloadText(textData)}
        >
        Download
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => NotepadActions.sendTextToTelegram(textData)}
        >
        Send to Telegram
      </Button>
    </Box>
  </Box>;
}
