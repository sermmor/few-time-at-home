import { Box, Button, CircularProgress, Fab, IconButton, InputAdornment, MenuItem, Select, SxProps, TextField, Theme, Zoom } from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import * as React from 'react';
import { RSSActions } from '../../../core/actions/rss';
import { RssMessage } from './component/RssMessage';
import { ReadLaterRSSActions } from '../../../core/actions/readLaterRss';
import { ReadLaterMessage } from '../../../data-model/readLaterRss';
import { NewMessage } from './component/NewMessage';
import { ConfigurationActions } from '../../../core/actions/configuration';
import { UnfurlActions } from '../../../core/actions/unfurl';
import { UnfurlDataModel } from '../../../data-model/unfurl';
import { useConfiguredDialogAlphas } from '../../../core/context/DialogAlphasContext';

const LOADING_CARD_TIME = 5000;

type RSSType = 'mastodon' | 'blog' | 'news' | 'youtube' | 'saved' | 'favorites' | 'random';

enum StateItemList { EMPTY, LOADING, CHARGED };

const getFormFieldStyle = (alpha: number): SxProps<Theme> => ({
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  backgroundColor: `rgba(245, 245, 245, ${alpha})`,
  paddingBottom: '.5rem',
  paddingTop: '1.5rem',
});

const formSizeFields = (): SxProps<Theme> => ({
  minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'},
});

const getButtonCardStyles = (alpha: number): SxProps<Theme> => ({
  backgroundColor: `rgba(179, 255, 179, ${alpha})`,
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
  const alphas = useConfiguredDialogAlphas();
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

  // ── Scroll buttons ──────────────────────────────────────────────────────────
  const [showScrollTop,    setShowScrollTop]    = React.useState(false);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => {
      const scrolled  = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setShowScrollBottom(maxScroll > 300 && scrolled < 50);
      setShowScrollTop(scrolled >= 50);
    };
    onScroll(); // check on mount
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── SAVED search ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const runSearch = () => {
    if (!searchQuery.trim()) return;
    setRssMessages([]);
    setUnfurlData([]);
    setListState(StateItemList.LOADING);
    ReadLaterRSSActions.search({ query: searchQuery.trim(), amount }).then(({ data }) => {
      setListState(StateItemList.CHARGED);
      setReadLaterData(data);
      return data.map(({ message }) => getUrlMessage(message));
    }).then(urls => {
      UnfurlActions.getUnfurl({ urlList: urls, loadTime: LOADING_CARD_TIME }).then(data => {
        const sorted = data.sort((a, b) => urls.indexOf(a.url ?? '0') - urls.indexOf(b.url ?? '0'));
        setUnfurlData(sorted);
      });
    });
  };

  React.useEffect(() => {
    ConfigurationActions.getConfiguration(['configuration']).then(data => {
      setOptionsTagsYoutube((data[0].content as any).rssConfig.optionTagsYoutube);
    });
  }, []);

  return <>
    <Box sx={{display: 'flex', flexDirection: 'row', gap: '1rem', flexFlow: 'row wrap', alignItems: 'center', justifyContent: 'center', ...getFormFieldStyle(alphas.general)}}>
      <Select
        value={rssType}
        onChange={evt => setRssType(evt.target.value as RSSType)}
        sx={{minWidth: '15.5rem'}}
      >
        {
          ['FAVORITES', 'MASTODON', 'YOUTUBE', 'BLOG', 'NEWS', 'SAVED', 'RANDOM'].map(type => <MenuItem value={type.toLowerCase()} key={type} sx={{textTransform: 'uppercase'}}>{type}</MenuItem>)
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
    {rssType === 'saved' && (
      <Box sx={{
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
        px: '1rem', pb: '0.75rem',
        ...getFormFieldStyle(alphas.general),
        paddingTop: '0.75rem',
      }}>
        {/* Search bar */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: '0.5rem', alignItems: 'center' }}>
          <TextField
            label="Buscar en Saved"
            variant="outlined"
            size="small"
            fullWidth
            value={searchQuery}
            onChange={evt => setSearchQuery(evt.target.value)}
            onKeyDown={evt => evt.key === 'Enter' && runSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Button
            variant="outlined"
            onClick={runSearch}
            disabled={!searchQuery.trim()}
            sx={{ whiteSpace: 'nowrap', textTransform: 'none', minWidth: '90px' }}
          >
            Buscar
          </Button>
        </Box>

        {/* Add link (collapsible) */}
        <NewMessage onNewMessage={(title, url, date) => new Promise<void>(resolve => {
          ReadLaterRSSActions.add({
            message: `${title}\nAutomatico - ${date}\n\n${url}`,
          }).then(({ data }) => {
            setSnackBarMessage("Bookmark saved!");
            setErrorSnackbar(false);
            setOpenSnackbar(true);
            const newData = [{ id: data.id, message: data.message }, ...(readLaterData || [])];
            setReadLaterData(newData);
            const newUrl = getUrlMessage(data.message);
            UnfurlActions.getUnfurl({ urlList: [newUrl], loadTime: LOADING_CARD_TIME }).then(newUnfurl => {
              setUnfurlData(prev => [newUnfurl[0], ...(prev || [])]);
              resolve();
            });
          });
        })} />
      </Box>
    )}
    <Box sx={{display: 'flex', flexDirection: 'column'}}>
    { listState === StateItemList.LOADING && <LoadingComponent /> }
    {
      rssType !== 'saved' && rssType !== 'random' ?
      listState !== StateItemList.LOADING && rssMessages.map((msg: string, index: number) => <Box key={`card_${index}`}>
          <RssMessage key={index} message={msg} unfurlData={unfurlData ? unfurlData[index] : unfurlData} index={rssType !== 'favorites' ? Math.max(rssMessages.length - 1 - index, 0) : index} />
          <Box sx={getButtonCardStyles(alphas.general)}>
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
          <Box sx={getButtonCardStyles(alphas.general)}>
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
    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} open={openSnackbar} autoHideDuration={3000} onClose={onCloseSnackBar} key={'topcenter'} sx={{ zIndex: 9999 }}>
      <Alert onClose={onCloseSnackBar} severity={isErrorSnackbar ? 'error' : 'success'} sx={{ width: '100%' }}>
        {snackBarMessage}
      </Alert>
    </Snackbar>

    <Zoom in={showScrollTop}>
      <Fab
        size="medium"
        color="primary"
        aria-label="Volver arriba"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        sx={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Zoom>

    <Zoom in={showScrollBottom}>
      <Fab
        size="medium"
        color="primary"
        aria-label="Ir abajo"
        onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
        sx={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}
      >
        <KeyboardArrowDownIcon />
      </Fab>
    </Zoom>
  </>;
}