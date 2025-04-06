import { Box, SxProps, MenuItem, Select, Theme } from "@mui/material";
import React from "react";

interface Props {
  text: string;
  options: string[];
  backgroundColor?: string;
  onChange: (newText: string) => void;
}

export const LabelAndComboField = ({text, options, backgroundColor, onChange}: Props) => {
  const colorRow: SxProps<Theme> = backgroundColor ? { backgroundColor } : {};
  const [isInEditMode, setEditMode] = React.useState<boolean>(false);
  const [textEditing, setTextEditing] = React.useState<string>(text);

  const setText = (newText: string) => {
    setEditMode(false);
    if (onChange) onChange(newText);
  }

  return <> {
    isInEditMode ?
      <Box sx={{...colorRow, width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '0.25rem', alignItems: 'center'}}>
        <Select
          variant="standard"
          value={textEditing}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, width:'100%'}}
          onChange={evt => {setTextEditing(evt.target.value); setText(evt.target.value)}}
          onKeyDown={(evt) => evt.key === 'Enter' || evt.key === 'Escape' ? setText(textEditing) : undefined}
          autoFocus={isInEditMode}
        >
          {options.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </Select>
      </Box>
    :
      <Box sx={{...colorRow, width:'100%', cursor: 'pointer', color: '#1976d2'}} onClick={() => setEditMode(true)}>
        {textEditing}
      </Box>
  }</>;
}