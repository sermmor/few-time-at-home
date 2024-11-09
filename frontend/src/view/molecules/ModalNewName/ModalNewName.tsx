import React from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle, TextField } from "@mui/material";

interface Props {
  isOpenDialog: boolean;
  handleCloseDialog: () => void;
  title: string;
  description: string;
  defaultName: string;
  onAcceptNewName: (newName: string) => void;
}

export const ModalNewName = ({title, defaultName, description, handleCloseDialog, isOpenDialog, onAcceptNewName}: Props): JSX.Element => {
  const [currentName, setCurrentName] = React.useState<string>(defaultName);

  const onAccept = () => {
    onAcceptNewName(currentName);
    handleCloseDialog();
  };

  return <Dialog
    onClose={handleCloseDialog}
    aria-labelledby="customized-dialog-new-name"
    open={isOpenDialog}
    onKeyUp={(key) => {
      if (key.code === 'Enter') {
        onAccept();
      }
    }}
    maxWidth={'md'}>
      <DialogTitle>
        {title}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '1rem', paddingBottom: '1.5rem' }}><TextField
          required
          id="outlined-required"
          label={description}
          defaultValue={defaultName}
          onChange={(evt) => setCurrentName(evt.target.value)}
        /></Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '1rem', paddingBottom: '0.5rem' }}>
          <Button
            disabled={currentName === ''}
            variant='outlined'
            onClick={onAccept}>Ok</Button>
        </Box>
      </DialogContent>
  </Dialog>
};