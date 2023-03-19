import * as React from 'react';
import { Box, CssBaseline } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppMenubar } from './molecules/AppMenubar/AppMenubar';
import { routesFTAH } from './Routes';

// TODO: Create Configuration form.
// TODO: Create Home (TASK LIST!!! AND A INSPIRATIONAL QUOTE).

const AllRoutes = () => <BrowserRouter>
  <Routes>
    {
      routesFTAH.map(({name: nameRoute, path, element}) =>
        <Route
          key={nameRoute}
          path={path}
          element={
            <>
              <Box sx={{position: 'fixed', width:'100%', zIndex:'1'}}>
                <AppMenubar />
              </Box>
              <Box sx={{padding: '1rem', paddingTop: '7rem'}}>{
                element
                }
              </Box>
            </>
          }
        />
      )
    }
  </Routes>
</BrowserRouter>

export const App = () => {
    return (<>
        <CssBaseline/>
        <AllRoutes />
    </>);
}
