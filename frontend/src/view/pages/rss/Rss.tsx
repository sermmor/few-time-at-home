import { Box, Button, CircularProgress, MenuItem, Select, SxProps, TextField, Theme, Typography } from '@mui/material';
import * as React from 'react';
import { RSSActions } from '../../../core/actions/rss';
import { RssDataModel } from '../../../data-model/rss';
import { RssMessage } from './component/RssMessage';

type RSSType = 'all' | 'mastodon' | 'twitter' | 'blog';

enum StateItemList { EMPTY, LOADING, CHARGED };

const formFieldStyle = (): SxProps<Theme> => ({
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',  
});

const formSizeFields = (): SxProps<Theme> => ({
  minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'},
});

const LoadingComponent = () => <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: '20rem'}}>
  <CircularProgress />
</Box>;

export const Rss = () => {
  const [rssType, setRssType] = React.useState<RSSType>('all');
  const [amount, setAmount] = React.useState<number>(20);
  const [rssData, setRssData] = React.useState<RssDataModel>();
  const [listState, setListState] = React.useState<StateItemList>(StateItemList.EMPTY);

  return <>
    <Box sx={{display: 'flex', flexDirection: 'row', gap: '1rem', flexFlow: 'row wrap', alignItems: 'center', justifyContent: 'center', ...formFieldStyle()}}>
      <Select
        value={rssType}
        label="Rss"
        onChange={evt => setRssType(evt.target.value as RSSType)}
        sx={{minWidth: '15.5rem'}}
      >
        {
          ['ALL', 'MASTODON', 'TWITTER', 'BLOG'].map(type => <MenuItem value={type.toLowerCase()} key={type} sx={{textTransform: 'uppercase'}}>{type}</MenuItem>)
        }
      </Select>
      <TextField label="Amount" variant="outlined" type='number' value={amount} sx={formSizeFields()} onChange={evt => setAmount(+evt.target.value)} />
      <Button
        variant='contained'
        sx={formSizeFields()}
        onClick={() => {
          setListState(StateItemList.LOADING);
          RSSActions.getRSS(rssType, amount).then(data => {
            setListState(StateItemList.CHARGED);
            setRssData(data);
          });
        }}
      >
        GO
      </Button>
    </Box>
    <Box sx={{display: 'flex', flexDirection: 'column'}}>
    { listState === StateItemList.LOADING && <LoadingComponent /> }
    {
      listState !== StateItemList.LOADING && rssData && rssData.messages.map((msg: string, index: number) => <RssMessage key={index} message={msg} />) 
    }
    </Box>
  </>;
}