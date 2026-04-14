import { Box, Button, CircularProgress, MenuItem, Select, SxProps, TextField, Theme } from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import DeleteIcon from '@mui/icons-material/Delete';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import * as React from 'react';
import { RSSActions } from '../../../core/actions/rss';
import { RssDataModel } from '../../../data-model/rss';
import { RssMessage } from './component/RssMessage';
import { ReadLaterRSSActions } from '../../../core/actions/readLaterRss';
import { ReadLaterMessage } from '../../../data-model/readLaterRss';
import { NewMessage } from './component/NewMessage';
import { ConfigurationActions } from '../../../core/actions/configuration';
import { UnfurlActions } from '../../../core/actions/unfurl';
import { UnfurlDataModel } from '../../../data-model/unfurl';

const LOADING_CARD_TIME = 5000;

type RSSType = 'mastodon' | 'twitter' | 'blog' | 'news' | 'youtube' | 'saved' | 'favorites' | 'random';

enum StateItemList { EMPTY, LOADING, CHARGED };

const formFieldStyle = (): SxProps<Theme> => ({
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',  
  backgroundColor: 'rgba(245, 245, 245, .7)',
  paddingBottom: '.5rem',
  paddingTop: '1.5rem',
});

const formSizeFields = (): SxProps<Theme> => ({
  minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'},
});

const buttonCardStyles = (): SxProps<Theme> => ({
  backgroundColor: 'rgba(179, 255, 179, .7)',
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

const getFirstUrl = (text: string): string => {
  const splitText = text.split(`<a href=`);
  if (splitText && splitText.length > 1) {
    const urlSplited = splitText[1].split('>');
    const urlWithParams = urlSplited[0].replace('\'', '').replace('\'', '').replace('\"', '').replace('\"', '');
    return urlWithParams.split(' ')[0];
  }
  return '';
};

const getUrlMessage = (message: string): string => {
  const [, ...rest] = message.split('\n');
  const foot = rest[rest.length - 1];
  const msg = rest.slice(0, rest.length - 1).join('\n');
  let link = getFirstUrl(msg);
  link = link ? link : foot;
  return link;
};

export const Rss = () => {
  const [rssType, setRssType] = React.useState<RSSType>('favorites');
  const [tagType, setTagType] = React.useState<string>('null');
  const [optionsTagsYoutube, setOptionsTagsYoutube] = React.useState<string[]>([]);
  const [amount, setAmount] = React.useState<number>(20);
  const [readLaterData, setReadLaterData] = React.useState<ReadLaterMessage[]>();
  const [unfurlData, setUnfurlData] = React.useState<UnfurlDataModel[]>();
  const [rssMessages, setRssMessages] = React.useState<string[]>([]);
  const [listState, setListState] = React.useState<StateItemList>(StateItemList.EMPTY);
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [isErrorSnackbar, setErrorSnackbar] = React.useState(false);
  const [snackBarMessage, setSnackBarMessage] = React.useState<string>('This is fine.');
  const onCloseSnackBar = (event?: React.SyntheticEvent | Event, reason?: string) => reason === 'clickaway' || setOpenSnackbar(false);

  React.useEffect(() => {
    ConfigurationActions.getConfiguration(['configuration']).then(data => {
      setOptionsTagsYoutube((data[0].content as any).rssConfig.optionTagsYoutube);
    });
  }, []);

  return <>
    <Box sx={{display: 'flex', flexDirection: 'row', gap: '1rem', flexFlow: 'row wrap', alignItems: 'center', justifyContent: 'center', ...formFieldStyle()}}>
      <Select
        value={rssType}
        onChange={evt => setRssType(evt.target.value as RSSType)}
        sx={{minWidth: '15.5rem'}}
      >
        {
          ['FAVORITES', 'MASTODON', 'TWITTER', 'YOUTUBE', 'BLOG', 'NEWS', 'SAVED', 'RANDOM'].map(type => <MenuItem value={type.toLowerCase()} key={type} sx={{textTransform: 'uppercase'}}>{type}</MenuItem>)
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
          setRssMessages([]);
          setUnfurlData([]);
          setListState(StateItemList.LOADING);
          if (rssType === 'youtube') {
            // tagType
            RSSActions.getRSSYoutube(tagType, amount).then(data => {
              setListState(StateItemList.CHARGED);
              setReadLaterData(undefined);
              setRssMessages(data ? data.messages : []);
              return data.messages.map(msg => getUrlMessage(msg));
            }).then(urls => {
              UnfurlActions.getUnfurl({urlList: urls, loadTime: LOADING_CARD_TIME}).then(data => {
                const sortedData = data.sort((a, b) => urls.indexOf(a.url ?? '0') - urls.indexOf(b.url ?? '0'));
                setUnfurlData(sortedData);
              });
            });
          } else if (rssType !== 'saved' && rssType !== 'random') {
            RSSActions.getRSS(rssType, amount).then(data => {
              setListState(StateItemList.CHARGED);
              setReadLaterData(undefined);
              setRssMessages(data ? data.messages : []);
              return data.messages.map(msg => getUrlMessage(msg));
            }).then(urls => {
              UnfurlActions.getUnfurl({urlList: urls, loadTime: rssType === 'favorites' ? LOADING_CARD_TIME : 10}).then(data => {
                const sortedData = data.sort((a, b) => urls.indexOf(a.url ?? '0') - urls.indexOf(b.url ?? '0'));
                setUnfurlData(sortedData);
              });
            });
          } else if (rssType === 'saved') {
            ReadLaterRSSActions.getMessage({ amount }).then(({ data }) => {
              setListState(StateItemList.CHARGED);
              setReadLaterData(data);
              setRssMessages([]);
              return data.map(({ message }) => getUrlMessage(message));
            }).then(urls => {
              UnfurlActions.getUnfurl({urlList: urls, loadTime: LOADING_CARD_TIME}).then(data => {
                const sortedData = data.sort((a, b) => urls.indexOf(a.url ?? '0') - urls.indexOf(b.url ?? '0'));
                setUnfurlData(sortedData);
              });
            });
          } else {
            ReadLaterRSSActions.getMessageRandom({ amount }).then(({ data }) => {
              setListState(StateItemList.CHARGED);
              setReadLaterData(data);
              setRssMessages([]);
              return data.map(({ message }) => getUrlMessage(message));
            }).then(urls => {
              UnfurlActions.getUnfurl({urlList: urls, loadTime: LOADING_CARD_TIME}).then(data => {
                const sortedData = data.sort((a, b) => urls.indexOf(a.url ?? '0') - urls.indexOf(b.url ?? '0'));
                setUnfurlData(sortedData);
              });
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
      rssType !== 'saved' && rssType !== 'random' ?
      listState !== StateItemList.LOADING && rssMessages.map((msg: string, index: number) => <Box key={`card_${index}`}>
          <RssMessage key={index} message={msg} unfurlData={unfurlData ? unfurlData[index] : unfurlData} index={index} />
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
          <RssMessage key={index} message={msg.message} unfurlData={unfurlData ? unfurlData[index] : unfurlData} index={index} />
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