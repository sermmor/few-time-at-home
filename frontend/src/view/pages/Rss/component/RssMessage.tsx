import { Box, Card, CardContent, CardMedia, Link, useMediaQuery, useTheme } from '@mui/material';
import Typography from '@mui/material/Typography';
import React from 'react';
import { UnfurlActions } from '../../../../core/actions/unfurl';
import { UnfurlDataModel } from '../../../../data-model/unfurl';

interface Props {
  message: string;
}

const cardStyle = {
  margin: '1rem 1rem 0rem 1rem',
  color: 'whitesmoke',
  backgroundColor: 'rgb(30, 30, 30)',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif'
}

const unfurlStyle = {
  ...cardStyle,
  borderColor: 'white',
  border: {xs: '0rem', sm: '0.5rem'},
  margin: {xs: '0rem 0rem 0rem 0rem', sm: '1rem 1rem 0rem 1rem'},
  width: {xs: '15rem', sm: '20rem'},
  backgroundColor:'whitesmoke'
}

const getFirstUrl = (text: string): string => {
  const splitText = text.split(`<a href=`);
  if (splitText && splitText.length > 1) {
    const urlSplited = splitText[1].split('>');
    const urlWithParams = urlSplited[0].replace('\'', '').replace('\'', '').replace('\"', '').replace('\"', '');
    return urlWithParams.split(' ')[0];
  }
  return '';
}

export const RssMessage = ({message}: Props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  console.log(isMobile)

  const [header, ...rest] = message.split('\n');
  const foot = rest[rest.length - 1];
  const msg = rest.slice(0, rest.length - 1).join('\n');
  let link = getFirstUrl(msg);
  link = link ? link : foot;

  const [unfurlData, setUnfurlData] = React.useState<UnfurlDataModel>();
  React.useEffect(() => { UnfurlActions.getUnfurl({url: link}).then(data => setUnfurlData(data)) }, []);

  return <><Card sx={cardStyle}>
    <CardContent>
      <Typography variant='h5'>
        {header}
      </Typography>
      <Typography variant='body2' dangerouslySetInnerHTML={{__html: msg}} />
      <Link href={foot} target='_blank' rel='noreferrer'>
        {foot}
      </Link>
      {unfurlData && unfurlData.title && <Box sx={unfurlStyle}>
        <Link href={link} target='_blank' rel='noreferrer'>
          <img width={isMobile ? '240rem' : '320rem'} src={unfurlData.urlImage} alt={unfurlData.title} loading="lazy"/>
          <Typography variant='h6' dangerouslySetInnerHTML={{__html: unfurlData.title}} />
          <Typography sx={{fontSize: '10pt'}}>{unfurlData.description}</Typography>
        </Link>
        </Box>}
    </CardContent>
  </Card>
  </>
};
