import * as React from 'react';
import { Box, CssBaseline } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppMenubar } from './molecules/AppMenubar/AppMenubar';
import { routesFTAH } from './Routes';

// TODO: FIX ROUTES, ADD NAVIGATION AND FIX THIS IN AppMenubar.
// TODO: Create form (choose amount and type - all, blog, twitter, and mastodon) and improve interface RSS (RssMessage can be a card and reuse the HTML).
// TODO: Create Home (TASK LIST!!! AND A INSPIRATIONAL QUOTE).
// TODO: Create Configuration form.

const AllRoutes = () => <BrowserRouter>
  <Routes>
    {
      routesFTAH.map(({name: nameRoute, path, element}) => <Route key={nameRoute} path={path} element={element}/>)
    }
  </Routes>
</BrowserRouter>

export const App = () => {
    return (<>
        <CssBaseline/>
        <AppMenubar />
        <Box sx={{padding: '1rem'}}>
          <AllRoutes />
        </Box>
    </>);
}
