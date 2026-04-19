import React from 'react';
import { Box, CssBaseline, SxProps, Theme } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppMenubar } from './molecules/AppMenubar/AppMenubar';
import { routesFTAH } from './Routes';
import { ConfigurationService } from '../service/configuration/configuration.service';
import { WebSocketClientService } from '../service/webSocketService/webSocketClient.service';
import { NotificationsActions } from '../core/actions/notifications';
import { BackgroundActions } from '../core/actions/background';
import { CyberpunkLoadingScreen } from './CyberpunkLoadingScreen';
import ConfigData from '../configuration.json';

const styleDinamicBar = (message: JSX.Element) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: '.25rem',
  whiteSpace: 'nowrap',
  animation: message
    ? 'marquee 30s linear infinite'
    : 'none',
  '@keyframes marquee': {
    '0%': {
      transform: 'translateX(100%)',
    },
    '100%': {
      transform: 'translateX(-50%)',
    },
  },
});

const styleStaticBar = (): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'row',
  gap: '.25rem',
  paddingLeft: '1rem',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
});

const ServerInfoBar = () => {
  const [message, setMessage] = React.useState<JSX.Element | undefined>();
  const [notificationInfo, setNotificationInfo] = React.useState<JSX.Element | undefined>();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState<boolean>(false);
  const [isShowStaticBar, setIsShowStaticBar] = React.useState<boolean>(false);
  
  React.useEffect(() => {
    NotificationsActions.getAreNotificationsEnabled().then(isAlertReady => setIsNotificationsEnabled(isAlertReady));
    setNotificationInfo(isNotificationsEnabled ? undefined : <span style={{color: 'red'}}>No context in Telegram</span>);
  }, [isNotificationsEnabled]);

  React.useEffect(() => { 
    WebSocketClientService.Instance.subscribeToUpdates((webSocketData) => {
      setMessage(
      <>
        <div>{webSocketData.rssAutoUpdateMessage}</div>
        <div>{` | ${webSocketData.rssSaveMessage}`}</div>
        </>
      );
    });
   }, []);

   return <Box
    sx={{
      width: '100%',
      backgroundColor: '#c7ddff',
      color: '#393939',
      padding: '0rem',
      textAlign: 'left',
      marginTop: '0rem',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      position: 'relative',
    }}>
      {
        isShowStaticBar ? <Box
          component="span"
          sx={styleStaticBar()}
          onClick={() => setIsShowStaticBar(!isShowStaticBar)}
        >
          {message}{notificationInfo ? <div>{" | "}{notificationInfo}</div> : undefined}
      </Box> : <Box
          component="span"
          sx={styleDinamicBar(<>{message}{notificationInfo ? <div>{" | "}{notificationInfo}</div> : undefined}</>)}
          onClick={() => setIsShowStaticBar(!isShowStaticBar)}
        >
          {message}{notificationInfo ? <div>{" | "}{notificationInfo}</div> : undefined}
        </Box>
      }
    </Box>
}

const EnvelopComponent = ({element}: {element: JSX.Element}) => <>
<Box sx={{position: 'fixed', width:'100%', zIndex: 100}}>
  <AppMenubar />
  <ServerInfoBar />
</Box>
<Box sx={{paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '7rem', position: 'relative', zIndex: 1}}>
  {
  element
  }
</Box>
</>;

const AllRoutes = () => {
  const config = new ConfigurationService(ConfigData.ip, ConfigData.port, ConfigData.webSocketPort, ConfigData.isUsingMocks);
  const webSocket = new WebSocketClientService(`ws://${ConfigData.ip}:${ConfigData.webSocketPort}/ws`, () => undefined);

  return <BrowserRouter>
    <Routes>
      {
        routesFTAH.map(({name: nameRoute, path, element, includeSubroutes}) =>
          <Route
            key={nameRoute}
            path={path}
            element={<EnvelopComponent element={element} />}
          >
            {includeSubroutes && <Route path="*" element={<EnvelopComponent element={element} />}/>}
          </Route>
        )
      }
    </Routes>
  </BrowserRouter>;
}

const READY_URL = `http://${ConfigData.ip}:${ConfigData.port}/ready`;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS  = 3000;

export const App = () => {
    const [backgroundImage, setBackgroundImage] = React.useState<string | null>(null);
    const [backendReady, setBackendReady]         = React.useState<boolean>(false);

    // Poll /ready until the backend responds
    React.useEffect(() => {
      let cancelled = false;
      let timerId: ReturnType<typeof setTimeout>;

      const poll = () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);
        fetch(READY_URL, { signal: controller.signal })
          .then(r => r.ok ? r.json() : Promise.reject())
          .then((data: { ready?: boolean }) => {
            clearTimeout(timeout);
            if (!cancelled && data?.ready) {
              setBackendReady(true);
            } else if (!cancelled) {
              timerId = setTimeout(poll, POLL_INTERVAL_MS);
            }
          })
          .catch(() => {
            clearTimeout(timeout);
            if (!cancelled) timerId = setTimeout(poll, POLL_INTERVAL_MS);
          });
      };

      poll();
      return () => { cancelled = true; clearTimeout(timerId); };
    }, []);

    React.useEffect(() => {
      if (!backendReady) return;
      BackgroundActions.getBackgroundImage().then(imageUrl => {
        if (imageUrl) {
          setBackgroundImage(imageUrl);
        }
      });
    }, [backendReady]);

    const appContainerStyle: SxProps<Theme> = {
      minHeight: '100vh',
      backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
    };

    if (!backendReady) {
      return <CyberpunkLoadingScreen />;
    }

    return (<>
        <CssBaseline/>
        <Box sx={appContainerStyle}>
          <AllRoutes />
        </Box>
    </>);
}
