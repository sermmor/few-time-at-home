import { Box, CssBaseline } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppMenubar } from './molecules/AppMenubar/AppMenubar';
import { routesFTAH } from './Routes';
import { ConfigurationService } from '../service/configuration/configuration.service';

const ConfigData = require('../configuration.json');

const EnvelopComponent = ({element}: {element: JSX.Element}) => <>
<Box sx={{position: 'fixed', width:'100%', zIndex:'1'}}>
  <AppMenubar />
</Box>
<Box sx={{paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '7rem'}}>{
  element
  }
</Box>
</>;

const AllRoutes = () => {
  const config = new ConfigurationService(ConfigData.ip, ConfigData.port, ConfigData.isUsingMocks);

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
