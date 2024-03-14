import { Box, Button, Checkbox, MenuItem, Select, SxProps, TextField, Theme, Typography } from "@mui/material";
import React from "react";
import { Bitrate, BitrateWithK, ConverterDataModel, bitrateList, bitrateWithKList } from "../../../data-model/mp3Converter";
import { Mp3ConverterActions } from "../../../core/actions/mp3Converter";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

let resultInfo = '';

const stillConvertingProcess = (data: ConverterDataModel, addResultLine: (line: string) => void) => {
  addResultLine(data.message);
  if (!data.isFinished) {
    setTimeout(() => Mp3ConverterActions.stillConverting().then(newData => stillConvertingProcess(newData, addResultLine)));
  }
}

export const Mp3Converter = () => {
  const [lineToSendResult, setLineToSendResult] = React.useState<string>('');
  const [folderFrom, setFolderFrom] = React.useState<string>('');
  const [folderTo, setFolderTo] = React.useState<string>('');
  const [isVideo, setIsVideo] = React.useState<boolean>(true);
  const [bitrate, setBitrate] = React.useState<Bitrate>(192);
  const [bitrateK, setBitrateK] = React.useState<BitrateWithK>('192k');

  const addResultLine = (line: string) => {
    resultInfo = `${resultInfo}${resultInfo ? '\n' : ''}${line}`;
    setLineToSendResult(resultInfo);
  };

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
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', }}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>Bitrate: </Typography>
        <Select
          value={bitrateK}
          onChange={evt => {
            const newBitrate = evt.target.value as BitrateWithK;
            setBitrateK(newBitrate);
            setBitrate(bitrateList[bitrateWithKList.indexOf(newBitrate)]);
          }}
          sx={{minWidth: '15.5rem'}}
        >
          {
            bitrateWithKList.map(br => <MenuItem value={br} key={br}>{br}</MenuItem>)
          }
        </Select>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', }}>
        <Checkbox
          checked={isVideo}
          onChange={evt => setIsVideo(evt.target.checked)}
        />
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
          Convert video to MP3
        </Typography>
      </Box>
      <Button
        variant='outlined'
        sx={{minWidth: '7rem'}}
        onClick={() => {
          if (!!folderFrom && !!folderTo) {
            resultInfo = '';
            if (isVideo) {
              Mp3ConverterActions.sendVideoToMp3({ folderFrom, folderTo, bitrate: bitrateK }).then(data => stillConvertingProcess(data, addResultLine));
            } else {
              Mp3ConverterActions.sendAudioToMp3({ folderFrom, folderTo, bitrateToConvertAudio: bitrate}).then(data => stillConvertingProcess(data, addResultLine));
            }
          } else {
            console.log("Fill folder from and folder to in converter!");
          }
        }}
        >
        Convert
      </Button>
      <TextField
            id="outlined-multiline-static"
            label="Result"
            multiline
            rows={6}
            sx={{width: '40rem'}}
            value={lineToSendResult}
          />
    </Box>
  </Box>
};

