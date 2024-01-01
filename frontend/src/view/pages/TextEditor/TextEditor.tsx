import { Box, Button, SxProps, TextField, Theme, Typography } from "@mui/material";
import React from "react";
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

const ViewBox = ({ textData }: {textData: string}) => {
  return <Box
    style={{width: '80%', height: '28rem', overflow: "hidden", overflowY: "scroll",}}
    dangerouslySetInnerHTML={{ __html: textData }}
  />;
}

export const TextEditor = () => {
  const [textData, setTextData] = React.useState<string>(TemporalData.EditorTextData);
  const [isInViewMode, setInViewMode] = React.useState<boolean>(false);

  const setTextEditor = (text: string) => {
    TemporalData.EditorTextData = text;
    setTextData(text);
  }

  const applyEOFToText = (text: string): string => text.split('\n').join('<br />');

  return <Box sx={formStyle}>
    <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
      Text Editor
    </Typography>
    <Box>
    {/* Button Bar */}
      <Button
        variant='text'
        sx={{minWidth: '15.5rem'}}
        onClick={() => setInViewMode(!isInViewMode)}
        >
        {isInViewMode ? 'Edit Mode' : 'View Mode'}
      </Button>
    </Box>
    {
      isInViewMode && <ViewBox textData={applyEOFToText(textData)} />
    }
    {
      !isInViewMode && <TextField
        id="outlined-multiline-static"
        label="Mi Editor"
        multiline
        autoFocus
        rows={19}
        sx={textAreaStyle}
        placeholder="Write what you want"
        value={textData}
        onChange={evt => setTextEditor(evt.target.value)}
        onKeyDown={(evt) => {
          if (evt.key === 'Tab') {
            evt.preventDefault();
            setTextEditor(`${textData}\t`)
            console.log("tab pushed");
          }
        }}
      />
    }
    <Box sx={{ display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '1rem' }}>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => navigator.clipboard.writeText(applyEOFToText(textData))}
        >
        Copy
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => setTextEditor('')}
        >
        Remove
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => downloadText(applyEOFToText(textData))}
        >
        Download
      </Button>
    </Box>
  </Box>;
}
