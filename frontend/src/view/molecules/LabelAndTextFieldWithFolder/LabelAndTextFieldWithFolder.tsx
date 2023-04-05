import React from "react";
import { Box, TextField } from "@mui/material";
import FolderIcon from '@mui/icons-material/Folder';

export const LabelAndTextFieldWithFolder = ({text, nameFolder, path, onChange, setOpenFolder}: {
  text: string,
  nameFolder: string,
  path: string,
  onChange: (newText: string) => void,
  setOpenFolder: (label: string) => void}
) => {
  const [isInEditMode, setEditMode] = React.useState<boolean>(false);
  // const [textToShow, setTextToShow] = React.useState<string>(text);
  const [textToEdit, setTextToEdit] = React.useState<string>(nameFolder);

  const setText = (newText: string) => {
    const textOnChange = `/${path}/${newText}`.split('//').join('/');
    // setTextToShow(textOnChange);
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
          {text}
        </Box>
        <Box sx={{ cursor: 'pointer', marginLeft: {xs: 'none', sm:'auto'}}} onClick={() => setOpenFolder(text)}>
          <FolderIcon />
        </Box>
      </Box>
  }</>;
}