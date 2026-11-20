import React, { useEffect, useState } from "react";
import {
  Box, Button, SxProps, TextField, Theme, Typography, Accordion, AccordionSummary, AccordionDetails,
  IconButton, List, ListItem, ListItemButton, ListItemText, Tooltip,
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DeleteIcon from '@mui/icons-material/Delete';
import { ConfigurationActions } from "../../../../core/actions/configuration";
import { useConfiguredDialogAlphas } from "../../../../core/context/DialogAlphasContext";
import { SavedCommand } from "../../../../data-model/configuration";
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  // Comandos guardados por el usuario
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([]);
  const [commandName, setCommandName] = useState<string>('');
  // Hora diaria opcional ("HH:MM"); vacía = sólo ejecución manual
  const [commandTime, setCommandTime] = useState<string>('');
  // id del comando que se está editando (null = crear uno nuevo)
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    ConfigurationActions.getSavedCommands().then(setSavedCommands);
  }, []);

  const runCommand = (commandLine: string) => {
    setLineToSendResult('');
    ConfigurationActions.sendCommandLine({ commandLine }).then(result => {
      if (result.stdout) {
        setLineToSendResult(result.stdout);
      } else if (result.stderr) {
        setLineToSendResult(result.stderr);
      } else if (result.stdout === '' && result.stderr === '') {
        setLineToSendResult(t('commandLine.finished'));
      } else {
        console.log(result);
      }
    });
  };

  const resetSaveForm = () => {
    setCommandName('');
    setCommandTime('');
    setEditingId(null);
  };

  const saveCommand = () => {
    if (!lineToSend.trim()) return;
    ConfigurationActions.saveSavedCommand({
      ...(editingId ? { id: editingId } : {}),
      name: commandName,
      command: lineToSend,
      time: commandTime,
    }).then(list => {
      setSavedCommands(list);
      resetSaveForm();
    });
  };

  const startEditing = (cmd: SavedCommand) => {
    setEditingId(cmd.id);
    setCommandName(cmd.name);
    setCommandTime(cmd.time ?? '');
    setLineToSend(cmd.command);
  };

  const removeCommand = (cmd: SavedCommand) => {
    if (!window.confirm(t('commandLine.confirmDelete', { name: cmd.name }))) return;
    ConfigurationActions.removeSavedCommand(cmd.id).then(list => {
      setSavedCommands(list);
      if (editingId === cmd.id) resetSaveForm();
    });
  };

  return (
    <Accordion sx={{ opacity: alphas.configurationCards }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{t('commandLine.sectionTitle')}</Typography>
      </AccordionSummary>
      <AccordionDetails>
    <Box sx={getCommandLineStyle(alphas.general)}>
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
        <Typography variant='h6' sx={{textTransform: 'uppercase'}}>{t('commandLine.commandLabel')}</Typography>
        <TextField
          label={t('commandLine.inputLabel')}
          variant="standard"
          value={lineToSend}
          sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '30rem'}}}
          onChange={evt => {
            setLineToSend(evt.target.value);
          }}
          onKeyDown={evt => {
            if (evt.key === 'Enter' && lineToSend.trim()) runCommand(lineToSend);
          }}
        />
        <Button
          variant='outlined'
          sx={{minWidth: '15.5rem'}}
          onClick={() => runCommand(lineToSend)}
          >
          {t('commandLine.sendButton')}
        </Button>
      </Box>

      {/* Guardar el comando actual para reutilizarlo más adelante */}
      <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '1rem', alignItems: 'center', justifyContent: 'left'}}>
        <TextField
          label={t('commandLine.nameLabel')}
          variant="standard"
          value={commandName}
          sx={{minWidth: {xs: '15.5rem', md: '20rem'}}}
          onChange={evt => setCommandName(evt.target.value)}
        />
        <Tooltip title={t('commandLine.timeHelp')}>
          <TextField
            label={t('commandLine.timeLabel')}
            type="time"
            variant="standard"
            value={commandTime}
            InputLabelProps={{ shrink: true }}
            sx={{minWidth: '11rem'}}
            onChange={evt => setCommandTime(evt.target.value)}
          />
        </Tooltip>
        <Button
          variant='contained'
          disabled={!lineToSend.trim()}
          onClick={saveCommand}
        >
          {editingId ? t('commandLine.updateButton') : t('commandLine.saveButton')}
        </Button>
        {editingId && (
          <Button variant='text' onClick={resetSaveForm}>
            {t('commandLine.cancelEdit')}
          </Button>
        )}
      </Box>

      <Box>
        <Typography variant='subtitle1' sx={{fontWeight: 'bold'}}>{t('commandLine.savedTitle')}</Typography>
        {savedCommands.length === 0 ? (
          <Typography variant='body2' sx={{fontStyle: 'italic', color: 'rgb(90, 90, 90)'}}>
            {t('commandLine.noSaved')}
          </Typography>
        ) : (
          <List dense disablePadding>
            {savedCommands.map(cmd => (
              <ListItem
                key={cmd.id}
                disablePadding
                secondaryAction={
                  <Box>
                    <Tooltip title={t('commandLine.runSaved')}>
                      <IconButton edge="end" onClick={() => { setLineToSend(cmd.command); runCommand(cmd.command); }}>
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('commandLine.editSaved')}>
                      <IconButton edge="end" onClick={() => startEditing(cmd)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('commandLine.deleteSaved')}>
                      <IconButton edge="end" onClick={() => removeCommand(cmd)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                {/* Clic en el comando: lo carga en el campo de texto sin ejecutarlo */}
                <Tooltip title={t('commandLine.loadSaved')} placement="bottom-start" enterDelay={800} enterNextDelay={800}>
                  <ListItemButton
                    selected={editingId === cmd.id}
                    onClick={() => setLineToSend(cmd.command)}
                    sx={{pr: '9rem'}}
                  >
                    <ListItemText
                      primary={cmd.time ? (
                        <Box component="span" sx={{display: 'inline-flex', alignItems: 'center', gap: '0.4rem'}}>
                          {cmd.name}
                          <Tooltip title={t('commandLine.scheduledAt', { time: cmd.time })}>
                            <Box component="span" sx={{display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', color: 'rgb(25, 118, 210)'}}>
                              <ScheduleIcon sx={{fontSize: '1rem'}} />
                              {cmd.time}
                            </Box>
                          </Tooltip>
                        </Box>
                      ) : cmd.name}
                      secondary={cmd.command}
                      secondaryTypographyProps={{sx: {fontFamily: 'monospace', wordBreak: 'break-all'}}}
                    />
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <TextField
        id="outlined-multiline-static"
        label={t('commandLine.result')}
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
