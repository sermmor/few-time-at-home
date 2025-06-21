import React from 'react';
import { Box, CssBaseline } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppMenubar } from './molecules/AppMenubar/AppMenubar';
import { routesFTAH } from './Routes';
import { ConfigurationService } from '../service/configuration/configuration.service';
import { WebSocketClientService } from '../service/webSocketService/webSocketClient.service';

const ConfigData = require('../configuration.json');

const ServerInfoBar = () => {
  const [message, setMessage] = React.useState<string>('');

  React.useEffect(() => { 
    WebSocketClientService.Instance.subscribeToUpdates((webSocketData) => {
      setMessage(webSocketData.rssAutoUpdateMessage);
    });
   }, []);

   // TODO: Mejorar diseño barra. Debe poder moverse como en los telepronters de últimas noticias de la tele.
   return <Box
    sx={{
      width: '100%',
      backgroundColor: '#f0f0f0',
      padding: '0.5rem',
      textAlign: 'center',
    }}>{message}</Box>
}

const EnvelopComponent = ({element}: {element: JSX.Element}) => <>
<Box sx={{position: 'fixed', width:'100%', zIndex:'1'}}>
  <AppMenubar />
  <ServerInfoBar />
</Box>
<Box sx={{paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '7rem'}}>{
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

export const App = () => {
    return (<>
        <CssBaseline/>
        <AllRoutes />
    </>);
}
