import * as React from 'react';
import { CssBaseline } from '@mui/material';
import { AppMenubar } from './molecules/AppMenubar/AppMenubar';
import { Configuration } from './pages/configuration/Configuration';
import { Home } from './pages/home/Home';
import { Rss } from './pages/rss/Rss';
import { RouteStatus } from './Routes';

const styleTitle = (): React.CSSProperties => ({
    textAlign: "center",
    textTransform: "uppercase",
    color: "rgba(0, 0, 0, 0.54)",
    fontFamily: "Helvetica",
    letterSpacing: "0.00938em",
});

export const App = () => {
    const [webStatus, setWebStatus] = React.useState(RouteStatus.Rss); // TODO: It's should be HOME the first page.

    // TODO: FIX ROUTES, ADD NAVIGATION AND FIX THIS IN AppMenubar.
    // TODO: Create form (choose amount and type - all, blog, twitter, and mastodon) and improve interface RSS (RssMessage can be a card and reuse the HTML).
    // TODO: Create Home.
    // TODO: Create Configuration form.

    return (<>
        <CssBaseline/>
        <AppMenubar />
        <div style={({display: (webStatus === RouteStatus.Rss? 'inline' : 'none')})}>
            <Rss/>
        </div>
        <div style={({display: (webStatus === RouteStatus.Home? 'inline' : 'none')})}>
            <Home/>
        </div>
        <div style={({display: (webStatus === RouteStatus.Configuration? 'inline' : 'none')})}>
            <Configuration/>
        </div>
    </>);
}
