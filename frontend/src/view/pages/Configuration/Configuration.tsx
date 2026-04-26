import React from "react";
import { Box, SxProps, Theme, Snackbar, GlobalStyles } from "@mui/material";
import { ThemeProvider } from '@mui/material/styles';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { cyberpunkConfigTheme } from './cyberpunk-config-theme';
import { ConfigurationActions } from "../../../core/actions/configuration";
import { ConfigurationDataZipped, parseToZippedConfig } from "../../../data-model/configuration";
import { PomodoroActions } from "../../../core/actions/pomodoro";
import { SynchronizeSection } from "./Components/SynchronizeSection";
import { MastodonUsersSection } from "./Components/MastodonUsersSection";
import { BlogRSSSection } from "./Components/BlogRSSSection";
import { NewsRSSSection } from "./Components/NewsRSSSection";
import { YoutubeRSSSection } from "./Components/YoutubeRSSSection";
import { CitasSection } from "./Components/CitasSection";
import { PomodoroSection } from "./Components/PomodoroSection";
import { RSSConfigurationSection } from "./Components/RSSConfigurationSection";
import { OthersSection } from "./Components/OthersSection";
import { CommandLineSection } from "./Components/CommandLineSection";
import { APIsSection } from "./Components/APIsSection";
import { LoginSection } from "./Components/LoginSection";
import { ConfigurationSnackbarProvider } from "./Components/ConfigurationSnackbarContext";
import { AuthActions } from "../../../core/actions/auth";

const formStyle: SxProps<Theme> = {
  display:        'flex',
  flexDirection:  'column',
  gap:            '0.75rem',
  alignItems:     'center',
  justifyContent: 'center',
  width:          '100%',
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

  const handleLogout = () => {
    AuthActions.logout().then(() => window.location.reload());
  };
  
  React.useEffect(() => {
    ConfigurationActions.getConfigurationType()
      .then(types => ConfigurationActions.getConfiguration(types.data)
        .then(data => setConfig(parseToZippedConfig(data)))
      )
      .catch(() => {
        setSnackBarMessage('Error al cargar la configuración.');
        setErrorSnackbar(true);
        setOpenSnackbar(true);
      });
    PomodoroActions.getTimeModeList()
      .then(({data}: any) => setPomodoroTimeMode(JSON.stringify(data, null, 2)))
      .catch(() => {
        setSnackBarMessage('Error al cargar los modos Pomodoro.');
        setErrorSnackbar(true);
        setOpenSnackbar(true);
      });
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

  const showSaveNotification = () => {
    setSnackBarMessage('Cambios guardados correctamente');
    setErrorSnackbar(false);
    setOpenSnackbar(true);
  };

  return (
    <ThemeProvider theme={cyberpunkConfigTheme}>
      {/* Override all light/grey backgrounds inside accordion sections */}
      <GlobalStyles styles={{
        /* All nested Box, Card, Paper get the dark background */
        '#cyberpunk-config .MuiAccordionDetails-root .MuiBox-root,\
         #cyberpunk-config .MuiAccordionDetails-root .MuiCard-root,\
         #cyberpunk-config .MuiAccordionDetails-root .MuiPaper-root': {
          background:      '#020c18 !important',
          backgroundColor: '#020c18 !important',
        },
        /* All text nodes inside sections → cyan */
        '#cyberpunk-config .MuiAccordionDetails-root .MuiTypography-root,\
         #cyberpunk-config .MuiAccordionDetails-root li,\
         #cyberpunk-config .MuiAccordionDetails-root span:not(.MuiSwitch-track):not(.MuiSwitch-thumb)': {
          color: '#00ffe7 !important',
        },
        /* Dividers and list separators */
        '#cyberpunk-config .MuiAccordionDetails-root .MuiDivider-root': {
          borderColor: 'rgba(0,255,231,0.18) !important',
        },
        /* List item borders */
        '#cyberpunk-config .MuiAccordionDetails-root .MuiListItem-root,\
         #cyberpunk-config .MuiAccordionDetails-root [class*="itemList"]': {
          borderColor:  'rgba(0,255,231,0.15) !important',
          borderBottom: '1px solid rgba(0,255,231,0.12) !important',
        },
      }} />

      <Box
        id="cyberpunk-config"
        sx={{
          backgroundColor: '#020c18',
          minHeight:        '100%',
          width:            '100%',
          paddingBottom:    '3rem',
        }}
      >
        <ConfigurationSnackbarProvider onSave={showSaveNotification}>
          {config && <Box sx={formStyle}>
            <SynchronizeSection synchronizeUrl={synchronizeUrl} setSynchronizeUrl={setSynchronizeUrl} />
            <MastodonUsersSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
            <BlogRSSSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
            <NewsRSSSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
            <YoutubeRSSSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
            <CitasSection config={config} deleteActionList={deleteActionList} addActionList={addActionList} editActionList={editActionList} indexNewItemAdded={indexNewItemAdded} />
            <PomodoroSection pomodoroTimeMode={pomodoroTimeMode} setPomodoroTimeMode={setPomodoroTimeMode} onShowSnackbar={(message, isError) => { setSnackBarMessage(message); setErrorSnackbar(isError); setOpenSnackbar(true); }} />
            <RSSConfigurationSection config={config} setConfig={setConfig} />
            <OthersSection config={config} setConfig={setConfig} />
            <APIsSection />
            <LoginSection config={config} setConfig={setConfig} onLogout={handleLogout} />
            <CommandLineSection lineToSend={lineToSend} setLineToSend={setLineToSend} lineToSendResult={lineToSendResult} setLineToSendResult={setLineToSendResult} />
          </Box>}
        </ConfigurationSnackbarProvider>
      </Box>

      <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} open={openSnackbar} autoHideDuration={3000} onClose={onCloseSnackBar} sx={{ zIndex: 9999 }}>
        <Alert onClose={onCloseSnackBar} severity={isErrorSnackbar ? 'error' : 'success'} sx={{ width: '100%' }}>
          {snackBarMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};
