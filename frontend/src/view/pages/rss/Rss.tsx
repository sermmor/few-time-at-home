import { Box } from '@mui/material';
import * as React from 'react';
import { RSSActions } from '../../../core/actions/rss';
import { RssDataModel } from '../../../data-model/rss';
import { RssMessage } from './component/RssMessage';

export const Rss = () => {
  const [rssData, setRssData] = React.useState<RssDataModel>();
  React.useEffect(() => { RSSActions.getRSS('blog', 10).then(data => setRssData(data)) }, []);

  // console.log(rssData)

  return <Box>
    {
      rssData && rssData.messages.map((msg: string, index: number) => <RssMessage key={index} message={msg} />)
    }
  </Box>;
}