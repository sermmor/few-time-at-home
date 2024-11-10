import { Box, TextField } from "@mui/material";
import React from "react";

const parseShortDateToLongDate = (date: string): string => {
  // From '2023-03-22T11:02' to '2023-03-22T11:02:02.070Z'
  return `${date}:00.000Z`;
}

const parseLongDateToShortDate = (date: string): string => {
  // From '2023-03-22T11:02:02.070Z' to '2023-03-22T11:02'
  return date.split(':').slice(0, 2).join(':');
}

export const LabelAndDateTimeTextField = ({text, onChange}: {text: string, onChange: (newText: string) => void}) => {
  const [isInEditMode, setEditMode] = React.useState<boolean>(false);
  const [textEditing, setTextEditing] = React.useState<string>(text);

  const setText = (newText: string) => {
    setTextEditing(newText);
    setEditMode(false);
    if (onChange) onChange(newText);
  }

  return <> {
    isInEditMode ?
      <Box sx={{width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '0.25rem', alignItems: 'center'}}>
        <TextField
          variant="standard"
          type='datetime-local'
          value={parseLongDateToShortDate(textEditing)}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, width:'100%'}}
          onChange={evt => setTextEditing(evt.target.value)}
          onBlur={() => setText(parseShortDateToLongDate(textEditing))} 
          onKeyDown={(evt) => evt.key === 'Enter' || evt.key === 'Escape' ? setText(parseShortDateToLongDate(textEditing)) : undefined}
          autoFocus={isInEditMode}
        />
      </Box>
    :
      <Box sx={{width:'100%', cursor: 'pointer', color: '#1976d2'}} onClick={() => setEditMode(true)}>
        {parseLongDateToShortDate(textEditing)}
      </Box>
  }</>;
}