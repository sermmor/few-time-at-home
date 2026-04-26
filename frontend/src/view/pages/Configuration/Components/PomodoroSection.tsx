import React from "react";
import { Box, Button, SxProps, Theme, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PomodoroActions } from "../../../../core/actions/pomodoro";
import { PomodoroTimeModesEditor } from "./PomodoroTimeModesEditor/PomodoroTimeModesEditor";
import { useConfiguredDialogAlphas } from "../../../../core/context/DialogAlphasContext";
import { useTranslation } from 'react-i18next';

const getPomodoroSectionStyle = (alpha: number): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'left',
  justifyContent: 'initial',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  marginBottom: '2rem',
  padding: '1rem',
  color: 'rgb(30, 30, 30)',
  backgroundColor: `rgba(245, 245, 245, ${alpha})`,
});

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
  const alphas = useConfiguredDialogAlphas();
  const { t } = useTranslation();
  return (
    <Accordion sx={{ opacity: alphas.configurationCards }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{t('pomodoroConfig.sectionTitle')}</Typography>
      </AccordionSummary>
      <AccordionDetails>
    <Box sx={getPomodoroSectionStyle(alphas.general)}>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'space-between', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}, marginBottom: '1.5rem'}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>{t('pomodoroConfig.timeModes')}</Typography>
        <Button
          variant='contained'
          sx={{minWidth: '15.5rem'}}
          onClick={() => {
            try {
              const allTimeMode = JSON.parse(pomodoroTimeMode);
              PomodoroActions.sendNewTimeMode(allTimeMode).then(() => {
                onShowSnackbar(t('pomodoroConfig.savedOk'), false);
              }).catch((error) => {
                onShowSnackbar(t('pomodoroConfig.errorSave'), true);
                console.error('Error saving Pomodoro configuration:', error);
              });
            } catch (error) {
              onShowSnackbar(t('pomodoroConfig.invalidJson'), true);
              console.error('Invalid JSON format:', error);
            }
          }}
          >
          {t('pomodoroConfig.send')}
        </Button>
      </Box>
      <PomodoroTimeModesEditor 
        value={pomodoroTimeMode}
        onChange={setPomodoroTimeMode}
      />
    </Box>
      </AccordionDetails>
    </Accordion>
  );
};
