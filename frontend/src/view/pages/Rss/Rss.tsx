import { Box, Button, CircularProgress, MenuItem, Select, SxProps, TextField, Theme } from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import DeleteIcon from '@mui/icons-material/Delete';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import * as React from 'react';
import { RSSActions } from '../../../core/actions/rss';
import { optionsTagsYoutube, RssDataModel } from '../../../data-model/rss';
import { RssMessage } from './component/RssMessage';
import { ReadLaterRSSActions } from '../../../core/actions/readLaterRss';
import { ReadLaterMessage } from '../../../data-model/readLaterRss';
import { NewMessage } from './component/NewMessage';

type RSSType = 'all' | 'mastodon' | 'twitter' | 'blog' | 'youtube' | 'saved';

enum StateItemList { EMPTY, LOADING, CHARGED };

const formFieldStyle = (): SxProps<Theme> => ({
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',  
});

const formSizeFields = (): SxProps<Theme> => ({
  minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'},
});

const buttonCardStyles = (): SxProps<Theme> => ({
  backgroundColor: '#b3ffb3',
  margin: '0rem 1rem 0rem 1rem',
});
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const LoadingComponent = () => <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: '20rem'}}>
  <CircularProgress />
</Box>;

export const Rss = () => {
  const [rssType, setRssType] = React.useState<RSSType>('all');
  const [tagType, setTagType] = React.useState<string>('null');
  const [amount, setAmount] = React.useState<number>(20);
  const [readLaterData, setReadLaterData] = React.useState<ReadLaterMessage[]>();
  const [rssData, setRssData] = React.useState<RssDataModel>();
  const [listState, setListState] = React.useState<StateItemList>(StateItemList.EMPTY);
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [isErrorSnackbar, setErrorSnackbar] = React.useState(false);
  const [snackBarMessage, setSnackBarMessage] = React.useState<string>('This is fine.');
  const onCloseSnackBar = (event?: React.SyntheticEvent | Event, reason?: string) => reason === 'clickaway' || setOpenSnackbar(false);

  return <>
    <Box sx={{display: 'flex', flexDirection: 'row', gap: '1rem', flexFlow: 'row wrap', alignItems: 'center', justifyContent: 'center', ...formFieldStyle()}}>
      <Select
        value={rssType}
        onChange={evt => setRssType(evt.target.value as RSSType)}
        sx={{minWidth: '15.5rem'}}
      >
        {
          ['ALL', 'MASTODON', 'TWITTER', 'YOUTUBE', 'BLOG', 'SAVED'].map(type => <MenuItem value={type.toLowerCase()} key={type} sx={{textTransform: 'uppercase'}}>{type}</MenuItem>)
        }
      </Select>
      <TextField label="Amount" variant="outlined" type='number' value={amount} sx={formSizeFields()} onChange={evt => setAmount(+evt.target.value)} />
      {
      rssType === 'youtube' && <Select value={tagType} onChange={evt => setTagType(evt.target.value)}>{
        optionsTagsYoutube.map(type => <MenuItem value={type} key={type}>{type}</MenuItem>)
      }</Select>
      }
      <Button
        variant='contained'
        sx={formSizeFields()}
        onClick={() => {
          setListState(StateItemList.LOADING);
          if (rssType === 'youtube') {
            // tagType
            RSSActions.getRSSYoutube(tagType, amount).then(data => {
              setListState(StateItemList.CHARGED);
              setReadLaterData(undefined);
              setRssData(data);
            });
          } else if (rssType !== 'saved') {
            RSSActions.getRSS(rssType, amount).then(data => {
              setListState(StateItemList.CHARGED);
              setReadLaterData(undefined);
              setRssData(data);
            });
          } else {
            ReadLaterRSSActions.getMessage({ amount }).then(({ data }) => {
              setListState(StateItemList.CHARGED);
              setReadLaterData(data);
              setRssData(undefined);
            });
          }
        }}
      >
        GO
      </Button>
    </Box>
    <Box sx={{display: 'flex', flexDirection: 'row', gap: '1rem', flexFlow: 'row wrap', alignItems: 'center', justifyContent: 'center', ...formFieldStyle()}}>
      {
        rssType === 'saved' && <NewMessage onNewMessage={(title, url, date) => new Promise<void>(resolve => {
          ReadLaterRSSActions.add({
            message:`${title}
Automatico - ${date}

${url}` }).then(({data}) => {
            console.log("Bookmark saved!");
            setSnackBarMessage("Bookmark saved!");
            setErrorSnackbar(false);
            setOpenSnackbar(true);
            const newData = [{id: data.id, message: data.message}, ...(readLaterData || [])];
            setReadLaterData(newData);
            resolve();
          })
        })} />
      }
    </Box>
    <Box sx={{display: 'flex', flexDirection: 'column'}}>
    { listState === StateItemList.LOADING && <LoadingComponent /> }
    {
      rssType !== 'saved' ?
      listState !== StateItemList.LOADING && rssData && rssData.messages.map((msg: string, index: number) => <Box key={`card_${index}`}>
          <RssMessage key={index} message={msg} />
          <Box sx={buttonCardStyles()}>
            <Button onClick={() => ReadLaterRSSActions.add({ message: msg }).then(() => {
              console.log("Bookmark saved!");
              setSnackBarMessage("Bookmark saved!");
              setErrorSnackbar(false);
              setOpenSnackbar(true);
            })}><BookmarkIcon /></Button>
          </Box>
        </Box>) 
      : listState !== StateItemList.LOADING && readLaterData && readLaterData.map((msg: ReadLaterMessage, index: number) => <Box key={`card_${index}`}>
          <RssMessage key={index} message={msg.message} />
          <Box sx={buttonCardStyles()}>
            <Button onClick={() => ReadLaterRSSActions.remove({id: msg.id}).then(() => {
              console.log("Bookmark removed!");
              setSnackBarMessage("Bookmark removed!");
              setErrorSnackbar(false);
              setOpenSnackbar(true);
              const newData = readLaterData.filter(rss => rss.id !== msg.id);
              setReadLaterData(newData);
            })}><DeleteIcon /></Button>
          </Box>
      </Box>) 
    }
    </Box>
    <Snackbar anchorOrigin={{ vertical: 'top', horizontal: 'center' }} open={openSnackbar} autoHideDuration={3000} onClose={onCloseSnackBar} key={'topcenter'}>
      <Alert onClose={onCloseSnackBar} severity={isErrorSnackbar ? 'error' : 'success'} sx={{ width: '100%' }}>
        {snackBarMessage}
      </Alert>
    </Snackbar>
  </>;
}