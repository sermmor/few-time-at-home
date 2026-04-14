import React from "react";
import { Box, SxProps, Theme, Snackbar, Accordion, AccordionSummary, AccordionDetails, Typography } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { ConfigurationActions } from "../../../core/actions/configuration";
import { ConfigurationDataZipped, parseToZippedConfig } from "../../../data-model/configuration";
import { PomodoroActions } from "../../../core/actions/pomodoro";
import { SynchronizeSection } from "./Components/SynchronizeSection";
import { NitterInstancesSection } from "./Components/NitterInstancesSection";
import { TwitterUsersSection } from "./Components/TwitterUsersSection";
import { MastodonUsersSection } from "./Components/MastodonUsersSection";
import { BlogRSSSection } from "./Components/BlogRSSSection";
import { NewsRSSSection } from "./Components/NewsRSSSection";
import { YoutubeRSSSection } from "./Components/YoutubeRSSSection";
import { CitasSection } from "./Components/CitasSection";
import { PomodoroSection } from "./Components/PomodoroSection";
import { TelegramCommandsSection } from "./Components/TelegramCommandsSection";
import { RSSConfigurationSection } from "./Components/RSSConfigurationSection";
import { OthersSection } from "./Components/OthersSection";
import { CommandLineSection } from "./Components/CommandLineSection";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  // width: '90%',
  // maxWidth: '1000px',
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

let indexNewItemAdded = 0;

export const ConfigurationComponent = () => {
  const [config, setConfig] = React.useState<ConfigurationDataZipped>();
  const [lineToSend, setLineToSend] = React.useState<string>('');
  const [synchronizeUrl, setSynchronizeUrl] = React.useState<string>(`http://[host_IP]:3001`);
  const [lineToSendResult, setLineToSendResult] = React.useState<string>('');
  const [pomodoroTimeMode, setPomodoroTimeMode] = React.useState<string>('');
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [isErrorSnackbar, setErrorSnackbar] = React.useState(false);
  const [snackBarMessage, setSnackBarMessage] = React.useState<string>('');
  
  const onCloseSnackBar = (event?: React.SyntheticEvent | Event, reason?: string) => reason === 'clickaway' || setOpenSnackbar(false);
  
  React.useEffect(() => {
    ConfigurationActions.getConfigurationType().then(types => ConfigurationActions.getConfiguration(types.data).then(data => setConfig(parseToZippedConfig(data))));
    PomodoroActions.getTimeModeList().then(({data}: any) => setPomodoroTimeMode(JSON.stringify(data, null, 2)));
  }, []);

  const deleteActionList = (keyList: string, equals: (item: any, idToDelete: string) => boolean) => (id: string) => {
    if (!config) return;
    const cloneList = [...(config as any)[keyList]];
    const index = cloneList.findIndex(item => equals(item, id));
    cloneList.splice(index, 1);
    setConfig({
      ...config,
      [keyList]: cloneList,
    });
  };

  const addActionList = (keyList: string, itemToAdd: any) => {
    if (!config) return;
    const cloneList = [...(config as any)[keyList]];
    cloneList.push(itemToAdd);
    indexNewItemAdded++;
    setConfig({
      ...config,
      [keyList]: cloneList,
    });
  };
  
  const editActionList = (
      keyList: string,
      id: string,
      equals: (item: any, idToEdit: string) => boolean,
      editConfig?: (newConfig: any[], index: number, newData: string | boolean) => any[]
    ) => (newText: string | boolean) => {
    if (!config) return;
    let cloneList = [...(config as any)[keyList]];
    const index = cloneList.findIndex(item => equals(item, id));
    if (!editConfig) {
      cloneList[index] = newText;
    } else {
      cloneList[index] = editConfig(cloneList, index, newText);
    }
    setConfig({
      ...config,
      [keyList]: cloneList,
    });
  };

  return <>
    {config && <Box sx={formStyle}>
      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Sincronizar</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <SynchronizeSection synchronizeUrl={synchronizeUrl} setSynchronizeUrl={setSynchronizeUrl} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Instancias Nitter</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <NitterInstancesSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Usuarios Twitter</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TwitterUsersSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Usuarios Mastodon</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <MastodonUsersSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Blog RSS</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <BlogRSSSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>RSS de Noticias</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <NewsRSSSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>YouTube RSS</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <YoutubeRSSSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Citas</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <CitasSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Pomodoro</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <PomodoroSection pomodoroTimeMode={pomodoroTimeMode} setPomodoroTimeMode={setPomodoroTimeMode} onShowSnackbar={(message, isError) => { setSnackBarMessage(message); setErrorSnackbar(isError); setOpenSnackbar(true); }} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Comandos Telegram</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TelegramCommandsSection config={config} setConfig={setConfig} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Configuración RSS</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <RSSConfigurationSection config={config} setConfig={setConfig} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Otros</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <OthersSection config={config} setConfig={setConfig} />
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ opacity: 0.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Línea de Comandos</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <CommandLineSection lineToSend={lineToSend} setLineToSend={setLineToSend} lineToSendResult={lineToSendResult} setLineToSendResult={setLineToSendResult} />
        </AccordionDetails>
      </Accordion>
    </Box>}
    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} open={openSnackbar} autoHideDuration={3000} onClose={onCloseSnackBar} sx={{ zIndex: 9999 }}>
      <Alert onClose={onCloseSnackBar} severity={isErrorSnackbar ? 'error' : 'success'} sx={{ width: '100%' }}>
        {snackBarMessage}
      </Alert>
    </Snackbar>
  </>;
};
