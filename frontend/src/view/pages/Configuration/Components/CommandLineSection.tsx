import React from "react";
import { Box, Button, SxProps, TextField, Theme, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ConfigurationActions } from "../../../../core/actions/configuration";
import { useConfiguredDialogAlphas } from "../../../../core/context/DialogAlphasContext";

const getCommandLineStyle = (alpha: number): SxProps<Theme> => ({
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

interface CommandLineSectionProps {
  lineToSend: string;
  setLineToSend: (line: string) => void;
  lineToSendResult: string;
  setLineToSendResult: (result: string) => void;
}

export const CommandLineSection: React.FC<CommandLineSectionProps> = ({
  lineToSend,
  setLineToSend,
  lineToSendResult,
  setLineToSendResult,
}) => {
  const alphas = useConfiguredDialogAlphas();
  return (
    <Accordion sx={{ opacity: alphas.configurationCards }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Línea de Comandos</Typography>
      </AccordionSummary>
      <AccordionDetails>
    <Box sx={getCommandLineStyle(alphas.general)}>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>Command line to send:</Typography>
        <TextField
          label="line to send"
          variant="standard"
          value={lineToSend}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '30rem'}}}
          onChange={evt => {
            setLineToSend(evt.target.value);
          }}
        />
        <Button
          variant='outlined'
          sx={{minWidth: '15.5rem'}}
          onClick={() => ConfigurationActions.sendCommandLine({commandLine: lineToSend}).then(result => {
            if (result.stdout) {
              setLineToSendResult(result.stdout);
            } else if (result.stderr) {
              setLineToSendResult(result.stderr);
            } else if (result.stdout === '' && result.stderr === '') {
              setLineToSendResult('FINISHED');
            } else {
              console.log(result);
            }
          })}
          >
          Send command line
        </Button>
      </Box>
      <TextField
        id="outlined-multiline-static"
        label="Resultado"
        multiline
        rows={5}
        sx={{width: '100%'}}
        value={lineToSendResult}
      />
    </Box>
      </AccordionDetails>
    </Accordion>
  );
};
