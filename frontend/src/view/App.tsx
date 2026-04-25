import React from 'react';
import { Box, CssBaseline, SxProps, Theme } from '@mui/material';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppMenubar } from './molecules/AppMenubar/AppMenubar';
import { routesFTAH } from './Routes';
import { ConfigurationService } from '../service/configuration/configuration.service';
import { WebSocketClientService } from '../service/webSocketService/webSocketClient.service';
import { NotificationsActions } from '../core/actions/notifications';
import { BackgroundActions } from '../core/actions/background';
import { CyberpunkLoadingScreen } from './CyberpunkLoadingScreen';
import { SetupWizard } from './pages/Setup/SetupWizard';
import { SetupActions } from '../core/actions/setup';
import { LoginPage } from './pages/Login/LoginPage';
import { AuthActions } from '../core/actions/auth';
import ConfigData from '../configuration.json';

// ── Cyberpunk ServerInfoBar ────────────────────────────────────────────────
const CY_BAR = {
  bg:       '#020c18',
  cyan:     '#00ffe7',
  cyanDim:  'rgba(0,255,231,0.55)',
  magenta:  '#ff00cc',
  border:   'rgba(0,255,231,0.28)',
};

const barTextSx = {
  fontFamily:    '"Courier New", Courier, monospace',
  fontSize:      '0.7rem',
  letterSpacing: '0.04rem',
  color:         CY_BAR.cyanDim,
  lineHeight:    1,
};

const styleMarqueeBar = (hasContent: boolean): SxProps<Theme> => ({
  display:       'inline-flex',
  flexDirection: 'row',
  gap:           '0.5rem',
  whiteSpace:    'nowrap',
  animation:     hasContent ? 'cy-marquee 35s linear infinite' : 'none',
  // Start fully off-screen to the right, end fully off-screen to the left
  '@keyframes cy-marquee': {
    '0%':   { transform: 'translateX(100vw)' },
    '100%': { transform: 'translateX(-100%)' },
  },
  ...barTextSx,
});

const styleStaticBar = (): SxProps<Theme> => ({
  display:      'flex',
  flexDirection: 'row',
  gap:          '0.5rem',
  paddingLeft:  '0.75rem',
  overflowX:    'auto',
  overflowY:    'hidden',
  scrollbarWidth: 'none',
  ...barTextSx,
});

const ServerInfoBar = () => {
  const [message, setMessage]                   = React.useState<JSX.Element | undefined>();
  const [notificationInfo, setNotificationInfo] = React.useState<JSX.Element | undefined>();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState<boolean>(false);
  const [isShowStaticBar, setIsShowStaticBar]   = React.useState<boolean>(false);

  React.useEffect(() => {
    NotificationsActions.getAreNotificationsEnabled().then(ok => setIsNotificationsEnabled(ok));
    setNotificationInfo(
      isNotificationsEnabled
        ? undefined
        : <span style={{ color: CY_BAR.magenta, textShadow: `0 0 6px ${CY_BAR.magenta}` }}>
            !! NO TELEGRAM CTX
          </span>
    );
  }, [isNotificationsEnabled]);

  React.useEffect(() => {
    WebSocketClientService.Instance.subscribeToUpdates(data => {
      setMessage(
        <>
          <span style={{ color: CY_BAR.cyan }}>SYS&gt;</span>
          <span>{data.rssAutoUpdateMessage}</span>
          <span style={{ color: CY_BAR.border }}>|</span>
          <span>{data.rssSaveMessage}</span>
        </>
      );
    });
  }, []);

  const content = (
    <>
      {message}
      {notificationInfo && (
        <>
          <span style={{ color: CY_BAR.border, margin: '0 0.3rem' }}>|</span>
          {notificationInfo}
        </>
      )}
    </>
  );

  return (
    <Box
      onClick={() => setIsShowStaticBar(s => !s)}
      sx={{
        width:           '100%',
        backgroundColor: CY_BAR.bg,
        borderTop:       `1px solid ${CY_BAR.border}`,
        borderBottom:    `1px solid ${CY_BAR.border}`,
        padding:         '3px 0',
        overflow:        'hidden',
        whiteSpace:      'nowrap',
        cursor:          'pointer',
        userSelect:      'none',
        position:        'relative',
        '&:hover': { borderColor: 'rgba(0,255,231,0.5)' },
      }}
    >
      {isShowStaticBar
        ? <Box component="span" sx={styleStaticBar()}>{content}</Box>
        : <Box component="span" sx={styleMarqueeBar(!!message)}>{content}</Box>
      }
    </Box>
  );
};

const EnvelopComponent = ({element}: {element: JSX.Element}) => {
  const { pathname } = useLocation();
  const isConfigPage = pathname === '/configuration';

  return <>
    <Box sx={{position: 'fixed', width:'100%', zIndex: 100}}>
      <AppMenubar />
      {isConfigPage && <ServerInfoBar />}
    </Box>
    <Box sx={{
      paddingLeft: '1rem',
      paddingRight: '1rem',
      paddingTop: isConfigPage ? '7rem' : '5.5rem',
      position: 'relative',
      zIndex: 1,
    }}>
      {element}
    </Box>
  </>;
};

const AllRoutes = () => {
  // Re-create ConfigurationService on each render to pick up any config changes.
  new ConfigurationService(ConfigData.ip, ConfigData.port, ConfigData.webSocketPort, ConfigData.isUsingMocks);

  // WebSocketClientService must only be created ONCE — each call opens a new
  // browser WebSocket connection.  If AllRoutes re-renders (e.g. because App
  // sets backgroundImage state) a second connection was previously opened and
  // the server switched to broadcasting on it, leaving VideoPlayerBar's
  // subscription stranded on the original (now-silent) connection.
  if (!WebSocketClientService.Instance) {
    new WebSocketClientService(`ws://${ConfigData.ip}:${ConfigData.webSocketPort}/ws`, () => undefined);
  }

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

// Initialise the singleton at module level so ConfigurationService.Instance
// is always available before any action (auth, background, etc.) is called.
new ConfigurationService(ConfigData.ip, ConfigData.port, ConfigData.webSocketPort, ConfigData.isUsingMocks);

const READY_URL = `http://${ConfigData.ip}:${ConfigData.port}/ready`;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS  = 3000;

export const App = () => {
    const [needsSetup, setNeedsSetup]       = React.useState<boolean | null>(null); // null = checking
    const [doPoll, setDoPoll]               = React.useState<boolean>(false);
    const [backgroundImage, setBackgroundImage] = React.useState<string | null>(null);
    const [backendReady, setBackendReady]   = React.useState<boolean>(false);
    const [authState, setAuthState]         = React.useState<'checking' | 'login' | 'ok'>('checking');

    // Step 1: check whether this is a fresh install that needs the wizard
    React.useEffect(() => {
      SetupActions.checkStatus().then(({ needsSetup: ns }) => {
        setNeedsSetup(ns);
        if (!ns) setDoPoll(true); // skip wizard → start polling immediately
      });
    }, []);

    // Step 2: poll /ready — only starts once doPoll is true
    React.useEffect(() => {
      if (!doPoll) return;

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
    }, [doPoll]);

    React.useEffect(() => {
      if (!backendReady) return;
      BackgroundActions.getBackgroundImage().then(imageUrl => {
        if (imageUrl) setBackgroundImage(imageUrl);
      });
      AuthActions.getStatus().then(({ loginEnabled, authenticated }) => {
        setAuthState(!loginEnabled || authenticated ? 'ok' : 'login');
      }).catch(() => setAuthState('ok'));
    }, [backendReady]);

    const appContainerStyle: SxProps<Theme> = {
      minHeight: '100vh',
      backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
    };

    // Still checking setup status
    if (needsSetup === null) {
      return <CyberpunkLoadingScreen />;
    }

    // Fresh install: show the installation wizard
    if (needsSetup === true) {
      return (
        <SetupWizard
          onComplete={() => {
            setNeedsSetup(false);
            setDoPoll(true); // begin polling for the real backend
          }}
        />
      );
    }

    // Backend not yet ready: cyberpunk loading screen
    if (!backendReady) {
      return <CyberpunkLoadingScreen />;
    }

    // Auth check in progress
    if (authState === 'checking') {
      return <CyberpunkLoadingScreen />;
    }

    // Login required
    if (authState === 'login') {
      return <LoginPage onLoginSuccess={() => setAuthState('ok')} />;
    }

    return (<>
        <CssBaseline/>
        <Box sx={appContainerStyle}>
          <AllRoutes />
        </Box>
    </>);
}
