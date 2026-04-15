import React from "react";
import { Alert, Box, Button, Snackbar, SxProps, TextField, Theme, Typography } from "@mui/material";
import { TemporalData } from "../../../service/temporalData.service";
import { CloudActions } from "../../../core/actions/cloud";
import { useConfiguredDialogAlphas } from "../../../core/context/DialogAlphasContext";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const titleStyle = () => ({
  textTransform: 'uppercase',
  color: "white",
  textShadow: `
    -1px -1px 0 black,
    1px -1px 0 black,
    -1px 1px 0 black,
    1px 1px 0 black,
    -1px 0 0 black,
    1px 0 0 black,
    0 -1px 0 black,
    0 1px 0 black
  `,
});

const getTextAreaStyle = (alpha: number): SxProps<Theme> => ({
  width: {xs: '15.5rem', sm: '27rem', md: '50rem', lg: '80%'},
  backgroundColor: `rgba(245, 245, 245, ${alpha})`
})

const saveTextInCloud = (
  textContent: string,
  filePath: string,
  setOpenSnackbar: React.Dispatch<React.SetStateAction<boolean>>,
  setSnackBarMessage: React.Dispatch<React.SetStateAction<string>>,
  setErrorSnackbar: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (filePath === '') return;
  CloudActions.saveFile({ filePath, textContent }).then(({isUpdated}) => {
    if (isUpdated) {
      console.log(`Saved file in ${filePath}`);
      setSnackBarMessage(`Saved file in ${filePath}`);
      setErrorSnackbar(false);
      setOpenSnackbar(true);
    } else {
      console.log(`Error saving file in ${filePath}`);
      setSnackBarMessage(`Error saving file in ${filePath}`);
      setErrorSnackbar(true);
      setOpenSnackbar(true);
    }
  });
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

const ViewBox = ({ textData, alpha }: {textData: string; alpha: number}) => (
  <Box
    style={{width: '80%', height: '28rem', overflow: "hidden", overflowY: "scroll", backgroundColor: `rgba(245, 245, 245, ${alpha})`}}
    dangerouslySetInnerHTML={{ __html: textData }}
  />
);

export const TextEditor = () => {
  const alphas = useConfiguredDialogAlphas();
  const [pathData, setPathData] = React.useState<string>(TemporalData.LastPathInTextEditor);
  const [textData, setTextData] = React.useState<string>(TemporalData.EditorTextData);
  const [isInViewMode, setInViewMode] = React.useState<boolean>(false);
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [isErrorSnackbar, setErrorSnackbar] = React.useState(false);
  const [snackBarMessage, setSnackBarMessage] = React.useState<string>('This is fine.');
  const onCloseSnackBar = (event?: React.SyntheticEvent | Event, reason?: string) => reason === 'clickaway' || setOpenSnackbar(false);

  const setTextEditor = (text: string) => {
    TemporalData.EditorTextData = text;
    setTextData(text);
  }

  const applyEOFToText = (text: string): string => text.split('\n').join('<br />');

  return <Box sx={formStyle}>
    <Typography variant='h6' sx={titleStyle()}>
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
      isInViewMode && <ViewBox textData={applyEOFToText(textData)} alpha={alphas.general} />
    }
    {
      !isInViewMode && <TextField
        id="outlined-multiline-static"
        label="Mi Editor"
        multiline
        autoFocus
        rows={19}
        sx={getTextAreaStyle(alphas.general)}
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
        onClick={() => setTextEditor('')}
        >
        Clear All
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
        onClick={() => navigator.clipboard.writeText(textData)}
        >
        Copy
      </Button>
      <Button
        variant='outlined'
        sx={{minWidth: '15.5rem'}}
        onClick={() => saveTextInCloud(textData, pathData, setOpenSnackbar, setSnackBarMessage, setErrorSnackbar)}
        >
        Save In Cloud
      </Button>
    </Box>
    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} open={openSnackbar} autoHideDuration={3000} onClose={onCloseSnackBar} key={'topcenter'} sx={{ zIndex: 9999 }}>
      <Alert onClose={onCloseSnackBar} severity={isErrorSnackbar ? 'error' : 'success'} sx={{ width: '100%' }}>
        {snackBarMessage}
      </Alert>
    </Snackbar>
  </Box>;
}
