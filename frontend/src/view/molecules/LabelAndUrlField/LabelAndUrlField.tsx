import { Box, Button, Link, TextField } from "@mui/material";
import React from "react";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { UnfurlActions } from "../../../core/actions/unfurl";

export const LabelAndUrlField = ({textToShow, textUrl, onChange}: {
  textToShow: string,
  textUrl: string,
  onChange: (newTextToShow: string, newtextUrl: string) => void
}) => {
  const [isInEditMode, setEditMode] = React.useState<boolean>(false);
  const [isTextToShowChanged, setIsTextToShowChanged] = React.useState<boolean>(false);
  const [isUrlChanged, setIsUrlChanged] = React.useState<boolean>(false);
  const [textToShowEditing, setTextToShowEditing] = React.useState<string>(textToShow);
  const [textUrlEditing, setTextUrlEditing] = React.useState<string>(textUrl);

  const setText = (newTextToShow: string, newUrl: string) => {
    if (!isTextToShowChanged && isUrlChanged) {
      UnfurlActions.getUnfurl({url: newUrl}).then(data => {
        setTextToShowEditing(data.title);
        setEditMode(false);
        onChange(data.title, newUrl);
      });
    } else {
      setEditMode(false);
      onChange(newTextToShow, newUrl);
    }
  }

  return <> {
    isInEditMode ?
      <Box sx={{width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '0.25rem', alignItems: 'center'}}>
        <TextField
          variant="standard"
          value={textUrlEditing}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, width:'100%'}}
          onChange={evt => { setTextUrlEditing(evt.target.value); setIsUrlChanged(true); }}
          onKeyDown={(evt) => evt.key === 'Escape' ? setText(textToShowEditing, textUrlEditing)
            : (evt.key === 'Enter') ? setText(textToShowEditing, textUrlEditing) : undefined }
          autoFocus={isInEditMode}
        />
        <TextField
          variant="standard"
          value={textToShowEditing}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, width:'100%'}}
          onChange={evt => { setTextToShowEditing(evt.target.value); setIsTextToShowChanged(true); }}
          onKeyDown={(evt) => evt.key === 'Escape' ? setText(textToShowEditing, textUrlEditing)
          : (evt.key === 'Enter') ? setText(textToShowEditing, textUrlEditing) : undefined }
        />
        <Button onClick={() => setText(textToShowEditing, textUrlEditing)}>Ok</Button>
      </Box>
    :
    <Box sx={{width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, alignItems: 'center'}}>
      <Box sx={{cursor: 'pointer', color: '#1976d2'}} onClick={() => setEditMode(true)}>
        {textToShowEditing ? textToShowEditing : '<No title>'}
      </Box>
      <Link href={textUrlEditing} target='_blank' rel='noreferrer' sx={{ marginLeft: {xs: 'none', sm:'auto'}}}>
        <OpenInNewIcon />
      </Link>
    </Box>
  }</>;
}