import React from "react";
import { Box, Button, SxProps, Theme, Typography } from "@mui/material";
import { PomodoroActions } from "../../../../core/actions/pomodoro";
import { PomodoroTimeModesEditor } from "./PomodoroTimeModesEditor/PomodoroTimeModesEditor";

const commandLineStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'left',
  justifyContent: 'initial',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  marginBottom: '2rem',
  padding: '1rem',
  color: 'rgb(30, 30, 30)',
  backgroundColor: 'rgba(245, 245, 245, .7)',
};

interface PomodoroSectionProps {
  pomodoroTimeMode: string;
  setPomodoroTimeMode: (value: string) => void;
  onShowSnackbar: (message: string, isError: boolean) => void;
}

export const PomodoroSection: React.FC<PomodoroSectionProps> = ({
  pomodoroTimeMode,
  setPomodoroTimeMode,
  onShowSnackbar,
}) => {
  return (
    <Box sx={commandLineStyle}>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'space-between', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}, marginBottom: '1.5rem'}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>Pomodoro Time Modes:</Typography>
        <Button
          variant='contained'
          sx={{minWidth: '15.5rem'}}
          onClick={() => {
            try {
              const allTimeMode = JSON.parse(pomodoroTimeMode);
              PomodoroActions.sendNewTimeMode(allTimeMode).then(() => {
                onShowSnackbar('Pomodoro configuration saved successfully!', false);
              }).catch((error) => {
                onShowSnackbar('Error saving Pomodoro configuration', true);
                console.error('Error saving Pomodoro configuration:', error);
              });
            } catch (error) {
              onShowSnackbar('Invalid JSON format', true);
              console.error('Invalid JSON format:', error);
            }
          }}
          >
          Send Configuration
        </Button>
      </Box>
      <PomodoroTimeModesEditor 
        value={pomodoroTimeMode}
        onChange={setPomodoroTimeMode}
      />
    </Box>
  );
};
