import * as React from 'react';
import { getRSS } from '../../../core/rss';
import { RssDataModel } from '../../../data-model/rss';
import { RssMessage } from './component/RssMessage';

export const Rss = () => {
    const [rssData, setRssData] = React.useState<RssDataModel>();
    React.useEffect(() => { getRSS('blog', 10).then(data => setRssData(data)) }, []);
    
    return <div>{rssData && rssData.messages.map(msg => <RssMessage message={msg} />)}</div>;
}