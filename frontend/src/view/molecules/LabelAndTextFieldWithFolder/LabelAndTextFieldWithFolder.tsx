import React from "react";
import { Box, TextField } from "@mui/material";
import FolderIcon from '@mui/icons-material/Folder';

export const LabelAndTextFieldWithFolder = ({text, onChange, setOpenFolder}: {
  text: string,
  onChange: (newText: string) => void,
  setOpenFolder: (label: string) => void}
) => {
  const textSplited = text.split('/');
  const path = textSplited.slice(0, textSplited.length - 1).join('/');
  const [isInEditMode, setEditMode] = React.useState<boolean>(false);
  const [textToShow, setTextToShow] = React.useState<string>(text);
  const [textToEdit, setTextToEdit] = React.useState<string>(textSplited[textSplited.length - 1]);

  const setText = (newText: string) => {
    const textOnChange = `/${path}/${newText}`.split('//').join('/');
    setTextToShow(textOnChange);
    setEditMode(false);
    if (onChange) onChange(textOnChange);
  }

  return <> {
    isInEditMode ?
      <Box sx={{width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '0.25rem', alignItems: 'center'}}>
        <TextField
          variant="standard"
          value={textToEdit}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, width:'100%'}}
          onChange={evt => setTextToEdit(evt.target.value)}
          onBlur={() => setText(textToEdit)} 
          onKeyDown={(evt) => evt.key === 'Enter' || evt.key === 'Escape' ? setText(textToEdit) : undefined}
          autoFocus={isInEditMode}
        />
      </Box>
    :
      <Box sx={{width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, alignItems: 'center'}}>
        <Box sx={{ cursor: 'pointer', color: '#1976d2' }} onClick={() => setEditMode(true)}>
          {textToShow}
        </Box>
        <Box sx={{ cursor: 'pointer', marginLeft: {xs: 'none', sm:'auto'}}} onClick={() => setOpenFolder(textToShow)}>
          <FolderIcon />
        </Box>
      </Box>
  }</>;
}