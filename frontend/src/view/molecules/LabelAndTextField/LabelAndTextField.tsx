import { Box, Button, TextField } from "@mui/material";
import React from "react";

export const LabelAndTextField = ({text}: {text: string}) => {
  const [isInEditMode, setEditMode] = React.useState<boolean>(false);
  const [textEditing, setTextEditing] = React.useState<string>(text);

  return <> {
    isInEditMode ?
      <Box sx={{width:'100%', display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '0.25rem', alignItems: 'center'}}>
        <TextField
          variant="outlined"
          value={textEditing}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, color: 'whitesmoke', backgroundColor: '#1976d2'}}
          onChange={evt => setTextEditing(evt.target.value)}
          onBlur={() => setEditMode(false)} 
          onKeyDown={(evt) => evt.key === 'Enter' ? setEditMode(false) : undefined}
          autoFocus={isInEditMode}
        />
        <Button
          variant='contained'
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}, marginLeft: { sm: '1rem'}, marginTop: { xs: '1rem', sm: '0rem' }}}
          onClick={() => setEditMode(false)}
        >
          OK
        </Button>
      </Box>
    :
      <Box sx={{width:'100%', cursor: 'pointer', color: '#1976d2'}} onClick={() => setEditMode(true)}>
        {textEditing}
      </Box>
  }</>;
}