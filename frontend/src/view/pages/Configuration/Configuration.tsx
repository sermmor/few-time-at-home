import { Box, SxProps, Theme, Typography } from "@mui/material";
import React from "react";
import { ConfigurationActions } from "../../../core/actions/configuration";
import { ConfigurationDataModel } from "../../../data-model/configuration";
import { ListComponent } from "../../molecules/ListComponent/ListComponent";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const footerStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'left',
  justifyContent: 'initial',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const TitleAndList = ({title, list}: {title: string; list: string[] | JSX.Element[]}) => <>
  <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
    {title}
  </Typography>
  <ListComponent list={list}/>
</>

export const ConfigurationComponent = () => {
  const [config, setConfig] = React.useState<ConfigurationDataModel>();
  React.useEffect(() => { ConfigurationActions.getConfiguration().then(data => setConfig(data)) }, []);
  return <>
    {config && <Box sx={formStyle}>
        <TitleAndList title='Nitter Instances' list={config.nitterInstancesList} />
        <TitleAndList title='Twitter Users' list={config.nitterRssUsersList} />
        <TitleAndList title='Mastodon Users' list={config.mastodonRssUsersList.map(({instance, user}) =>`@${user}@${instance}`)} />
        <TitleAndList title='Blog RSS' list={config.blogRssList} />
        <TitleAndList title='Telegram commands' list={Object.keys(config.listBotCommands).map((commandName: string) =>
          <Box sx={{display: 'flex', flexDirection: 'row', gap: '2rem', alignContent: 'space-between'}}>
            <Box>{commandName}</Box>
            <Box sx={{ marginLeft: 'auto'}}>{`${config.listBotCommands[commandName]}`}</Box>
          </Box>
        )} />
        <Box sx={footerStyle}>
          <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
            Number of workers: {config.numberOfWorkers}
          </Typography>
          <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
            API Port: {config.apiPort}
          </Typography>
        </Box>
      </Box>
    }
  </>;
};
