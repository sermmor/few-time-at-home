import React from 'react';
import styled from "styled-components";
import { Box, Card, CardContent, Link, useMediaQuery, useTheme } from '@mui/material';
import Typography from '@mui/material/Typography';
import { UnfurlActions } from '../../../../core/actions/unfurl';
import { UnfurlDataModel, UnfurlYoutubeImageModel } from '../../../../data-model/unfurl';

interface Props {
  message: string;
  index: number;
  unfurlData?: UnfurlDataModel;
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
};

const DivWithLinkFixed = styled.div`
  font-family: "Roboto", "Helvetica", "Arial", sans-serif;
  font-weight: 400;
  font-size: 0.875rem;
  line-height: 1.43;
  letter-spacing: 0.01071em;
  
  a {
    text-decoration: none;
    color: #A7D2FE;
  }
`;

const isYoutubeUrl = (url: string) => url.toLowerCase().indexOf("youtube") > -1 || url.toLowerCase().indexOf("youtu.be") > -1;

export const RssMessage = ({message, unfurlData, index}: Props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [dataToShowInCard, setDataToShowInCard] = React.useState<UnfurlDataModel>();
  const [header, setHeader] = React.useState<string>("");
  const [foot, setFoot] = React.useState<string>("");
  const [msg, setMsg] = React.useState<string>("");
  const [link, setLink] = React.useState<string>("");
  const [imageUrl, setImageUrl] = React.useState<string>("");
  
  React.useEffect(() => {
    const [headerAux, ...rest] = message.split('\n');
    const footAux = rest[rest.length - 1];
    const msgAux = rest.slice(0, rest.length - 1).join('\n');
    let linkAux = getFirstUrl(msgAux);
    linkAux = linkAux ? linkAux : footAux;
    
    setHeader(headerAux);
    setFoot(footAux);
    setMsg(msgAux);
    setLink(linkAux);
  }, [message]);

  React.useEffect(() => {
    setImageUrl("");
    setDataToShowInCard(unfurlData);
  }, [unfurlData]);

  React.useEffect(() => {
    if (dataToShowInCard && dataToShowInCard.url && isYoutubeUrl(dataToShowInCard.url)) {
      setImageUrl("");
      UnfurlActions.getUnfurlYoutubeImage({ youtubeUrl: dataToShowInCard.url, indexItem: index }).then(data => setImageUrl(data.imageUrl));
    } else if (dataToShowInCard && dataToShowInCard.url) {
      setImageUrl(dataToShowInCard.urlImage);
    }
  }, [dataToShowInCard, index]);


  return <><Card sx={cardStyle}>
    <CardContent>
      <Typography variant='h5'>
        {header}
      </Typography>
      <DivWithLinkFixed dangerouslySetInnerHTML={{__html: msg}}></DivWithLinkFixed>
      <Link href={foot} target='_blank' rel='noreferrer'>
        {foot}
      </Link>
      {dataToShowInCard && dataToShowInCard.title && <Box sx={unfurlStyle}>
        <Link href={link} target='_blank' rel='noreferrer'>
          {
            <img width={isMobile ? '240rem' : '320rem'} src={imageUrl} alt={dataToShowInCard.title} loading="lazy"/>
          }
          <Typography variant='h6' dangerouslySetInnerHTML={{__html: dataToShowInCard.title}} />
          <Typography sx={{fontSize: '10pt'}}>{dataToShowInCard.description}</Typography>
        </Link>
        </Box>}
    </CardContent>
  </Card>
  </>
};
