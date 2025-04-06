import React from "react";
import { Box, Button, TextField } from "@mui/material";

const getCurrentDate = () => {
  const d = new Date();
  return d.toString();
}

export const NewMessage = ({onNewMessage}: {onNewMessage: (title: string, url: string, date: string) => Promise<void>}) => {
  const [title, setTitle] = React.useState<string>('');
  const [url, setUrl] = React.useState<string>('');

  return (
    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '1rem'}}>
      <Box sx={{display: 'flex', flexDirection: 'row', flexFlow: 'row wrap', alignItems: 'center', justifyContent: 'center', gap: '.5rem'}}>
        Title: <TextField variant="standard" value={title} onChange={evt => setTitle(evt.target.value)}/>
      </Box>
      <Box sx={{display: 'flex', flexDirection: 'row', flexFlow: 'row wrap', alignItems: 'center', justifyContent: 'center', gap: '.5rem'}}>
        Url: <TextField variant="standard" value={url} onChange={evt => setUrl(evt.target.value)}/>
      </Box>
      <Button onClick={() => onNewMessage(title, url, getCurrentDate()).then(() => {setTitle(''); setUrl('');})}>Add</Button>
    </Box>
  );
};