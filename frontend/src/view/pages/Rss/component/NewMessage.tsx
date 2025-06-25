import React from "react";
import { Box, Button, TextField } from "@mui/material";
import { UnfurlActions } from "../../../../core/actions/unfurl";

const getCurrentDate = () => {
  const d = new Date();
  return d.toString();
}

export const NewMessage = ({onNewMessage}: {onNewMessage: (title: string, url: string, date: string) => Promise<void>}) => {
  const [, setTitle] = React.useState<string>('');
  const [url, setUrl] = React.useState<string>('');

  return (
    <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: '1rem', gap: '1rem'}}>
      <Box sx={{display: 'flex', flexDirection: 'row', flexFlow: 'row wrap', alignItems: 'center', justifyContent: 'center', gap: '.5rem'}}>
        Url: <TextField variant="standard" value={url} onChange={evt => setUrl(evt.target.value)}/>
      </Box>
      <Button 
        variant='outlined'
        onClick={() => 
          UnfurlActions.getUnfurl({url})
          .then(data => 
            onNewMessage(data.title, url, getCurrentDate()).then(() => {setTitle(''); setUrl('');})
          )
          }>Add</Button>
    </Box>
  );
};