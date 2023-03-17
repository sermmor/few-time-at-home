import * as React from 'react';
import { Configuration } from './pages/configuration/Configuration';
import { Home } from './pages/home/Home';
import { Rss } from './pages/rss/Rss';

export const enum WebStatus { Home, Rss, Configuration };

const styleTitle = (): React.CSSProperties => ({
    textAlign: "center",
    textTransform: "uppercase",
    color: "rgba(0, 0, 0, 0.54)",
    fontFamily: "Helvetica",
    letterSpacing: "0.00938em",
});

export const App = () => {
    const [webStatus, setWebStatus] = React.useState(WebStatus.Rss);

    // TODO: Create form (choose amount and type - all, blog, twitter, and mastodon) and improve interface RSS (RssMessage can be a card and reuse the HTML).
    // TODO: Create Home.
    // TODO: Create Configuration form.

    return (<>
        <h1>FEW TIME @HOME</h1>
        <div style={({display: (webStatus === WebStatus.Rss? 'inline' : 'none')})}>
            <Rss/>
        </div>
        <div style={({display: (webStatus === WebStatus.Home? 'inline' : 'none')})}>
            <Home/>
        </div>
        <div style={({display: (webStatus === WebStatus.Configuration? 'inline' : 'none')})}>
            <Configuration/>
        </div>
    </>);
}
