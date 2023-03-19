import { Box, SxProps, TextField, Theme, Typography } from "@mui/material";
import React from "react";
import { ConfigurationActions } from "../../../core/actions/configuration";
import { ConfigurationDataModel } from "../../../data-model/configuration";
import { LabelAndTextField } from "../../molecules/LabelAndTextField/LabelAndTextField";
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

const TitleAndList = ({title, list, deleteAction}: {title: string; list: { id: string, item: string | JSX.Element }[]; deleteAction?: (id: string) => void;}) => <>
  <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
    {title}
  </Typography>
  <ListComponent {...{list, deleteAction}} />
</>

export const ConfigurationComponent = () => {
  const [config, setConfig] = React.useState<ConfigurationDataModel>();
  React.useEffect(() => { ConfigurationActions.getConfiguration().then(data => setConfig(data)) }, []);

  const deleteActionList = (keyList: string, equals: (item: any, idToDelete: string) => boolean) => (id: string) => {
    if (!config) return;
    const cloneList = [...(config as any)[keyList]];
    const index = cloneList.findIndex(item => equals(item, id));
    cloneList.splice(index, 1);
    setConfig({
      ...config,
      [keyList]: cloneList,
    });
  };

  return <>
    {config && <Box sx={formStyle}>
        <TitleAndList
          title='Nitter Instances'
          deleteAction={deleteActionList('nitterInstancesList', (item: any, idToDelete: string) => item === idToDelete)}
          list={config.nitterInstancesList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} />}))}
        />
        <TitleAndList
          title='Twitter Users'
          deleteAction={deleteActionList('nitterRssUsersList', (item: any, idToDelete: string) => item === idToDelete)}
          list={config.nitterRssUsersList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} />}))}
        />
        <TitleAndList
          title='Mastodon Users'
          deleteAction={deleteActionList('mastodonRssUsersList', ({user, instance}: any, idToDelete: string) =>  `@${user}@${instance}` === idToDelete)}
          list={config.mastodonRssUsersList.map(({instance, user}) => ({
            id: `@${user}@${instance}`,
            item: <>@<LabelAndTextField text={user} />@<LabelAndTextField text={instance} /></>
          }))}
        />
        <TitleAndList
          title='Blog RSS'
          deleteAction={deleteActionList('blogRssList', (item: any, idToDelete: string) => item === idToDelete)}
          list={config.blogRssList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} />}))}
        />
        <TitleAndList
          title='Telegram commands'
          list={Object.keys(config.listBotCommands).map((commandName, index) => ({
              id:`${index}`,
              item: <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignContent: 'space-between', alignItems: 'center', justifyContent: 'center', width:'100%'}}>
                <Box>{commandName}</Box>
                <Box sx={{ marginLeft: {xs: 'none', sm:'auto'}}}><LabelAndTextField text={config.listBotCommands[commandName]} /></Box>
              </Box>
          })
        )} />
        <Box sx={footerStyle}>
          <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'center'}}>
            <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
              Number of workers
            </Typography>
            <TextField
              label="Workers"
              variant="outlined"
              value={config.numberOfWorkers}
              type='number'
              sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
              onChange={evt => {
                setConfig({
                  ...config,
                  numberOfWorkers: +evt.target.value,
                });
              }}
            />
          </Box>
          <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'center'}}>
            <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
              API Port:
            </Typography>
            <TextField
              label="Port"
              variant="outlined"
              type='number'
              value={config.apiPort}
              sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
              onChange={evt => {
                setConfig({
                  ...config,
                  apiPort: +evt.target.value,
                });
              }}
            />
          </Box>
        </Box>
      </Box>
    }
  </>;
};
