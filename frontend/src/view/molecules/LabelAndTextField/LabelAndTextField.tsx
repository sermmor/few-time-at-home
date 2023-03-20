import { Box, TextField } from "@mui/material";
import React from "react";

export const LabelAndTextField = ({text, onChange}: {text: string, onChange: (newText: string) => void}) => {
  const [isInEditMode, setEditMode] = React.useState<boolean>(false);
  const [textEditing, setTextEditing] = React.useState<string>(text);

  const setText = (newText: string) => {
    setEditMode(false);
    if (onChange) onChange(newText);
  }

  return <> {
    isInEditMode ?
      <Box sx={{width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '0.25rem', alignItems: 'center'}}>
        <TextField
          variant="standard"
          value={textEditing}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, width:'100%'}}
          onChange={evt => setTextEditing(evt.target.value)}
          onBlur={() => setText(textEditing)} 
          onKeyDown={(evt) => evt.key === 'Enter' || evt.key === 'Escape' ? setText(textEditing) : undefined}
          autoFocus={isInEditMode}
        />
      </Box>
    :
      <Box sx={{width:'100%', cursor: 'pointer', color: '#1976d2'}} onClick={() => setEditMode(true)}>
        {textEditing}
      </Box>
  }</>;
}