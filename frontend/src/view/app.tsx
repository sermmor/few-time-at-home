import * as React from 'react';
import { Box, CssBaseline } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppMenubar } from './molecules/AppMenubar/AppMenubar';
import { Configuration } from './pages/Configuration/Configuration';
import { Home } from './pages/Home/Home';
import { Rss } from './pages/Rss/Rss';
import { RouteStatus } from './Routes';
import { NotFound } from './pages/NotFound/NotFound';

export const App = () => {
    const [webStatus, setWebStatus] = React.useState(RouteStatus.Rss); // TODO: It's should be HOME the first page.

    // TODO: FIX ROUTES, ADD NAVIGATION AND FIX THIS IN AppMenubar.
    // TODO: Create form (choose amount and type - all, blog, twitter, and mastodon) and improve interface RSS (RssMessage can be a card and reuse the HTML).
    // TODO: Create Home (TASK LIST!!! AND A INSPIRATIONAL QUOTE).
    // TODO: Create Configuration form.

    return (<>
        <CssBaseline/>
        <AppMenubar />
        <Box sx={{padding: '1rem'}}>
          <BrowserRouter>
            <Routes>
              <Route path='/' element={<Home/>}/>
              <Route path='/rss' element={<Rss/>}/>
              <Route path='/configuration' element={<Configuration/>}/>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          {/* <Box style={({display: (webStatus === RouteStatus.Home? 'inline' : 'none')})}>
              <Home/>
          </Box>
          <Box style={({display: (webStatus === RouteStatus.Rss? 'inline' : 'none')})}>
              <Rss/>
          </Box>
          <Box style={({display: (webStatus === RouteStatus.Configuration? 'inline' : 'none')})}>
              <Configuration/>
          </Box> */}
        </Box>
    </>);
}
