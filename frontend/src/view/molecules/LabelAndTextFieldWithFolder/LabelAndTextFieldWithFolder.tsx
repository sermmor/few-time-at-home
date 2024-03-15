import React from "react";
import { Box, SxProps, TextField, Theme } from "@mui/material";
import FolderIcon from '@mui/icons-material/Folder';
import FolderZipIcon from '@mui/icons-material/FolderZip';

export const LabelAndTextFieldWithFolder = ({text, nameFolder, path, backgroundColor, onChange, setOpenFolder, zipInFolder}: {
  text: string,
  nameFolder: string,
  path: string,
  backgroundColor?: string,
  onChange: (newText: string) => void,
  setOpenFolder: (label: string) => void,
  zipInFolder?: (label: string) => void,
}) => {
  const colorRow: SxProps<Theme> = backgroundColor ? { backgroundColor } : {};
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
      <Box sx={{...colorRow, width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '0.25rem', alignItems: 'center'}}>
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
      <Box sx={{...colorRow, width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, alignItems: 'center'}}>
        <Box sx={{ cursor: 'pointer', color: '#1976d2' }} onClick={() => setEditMode(true)}>
          {text}
        </Box>
        <Box sx={{ cursor: 'pointer', marginLeft: {xs: 'none', sm:'auto'}, display: 'flex', flexDirection: 'row', gap: '.5rem'}}>
          {zipInFolder && <Box sx={{ cursor: 'pointer',}} onClick={() => zipInFolder(text)}>
            <FolderZipIcon />
          </Box>
          }
          <Box sx={{ cursor: 'pointer',}} onClick={() => setOpenFolder(text)}>
            <FolderIcon />
          </Box>
        </Box>
      </Box>
  }</>;
}