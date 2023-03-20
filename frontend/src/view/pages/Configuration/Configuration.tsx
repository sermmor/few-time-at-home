import React from "react";
import { Box, Button, SxProps, TextField, Theme, Typography } from "@mui/material";
import { ConfigurationActions } from "../../../core/actions/configuration";
import { ConfigurationDataModel } from "../../../data-model/configuration";
import { LabelAndTextField } from "../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../organism/TitleAndList/TitleAndList";

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

const SaveConfigurationComponent = ({config}: {config: ConfigurationDataModel}) => {
  const [isSave, setSave] = React.useState<boolean>(false);
  const setConfiguration = () => {
    ConfigurationActions.sendConfiguration(config);
    setSave(true);
    setTimeout(() => setSave(false), 500);
  }
  return <Box
    sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingRight: { xs: '0rem', sm: '3rem'}, paddingBottom: '3rem'}}
    >
      <Button
        variant='contained'
        sx={{minWidth: '15.5rem'}}
        onClick={() => setConfiguration()}
        >
        Save
        </Button>
        {isSave && <Box sx={{paddingLeft: '1rem'}}>Saved!</Box>}
    </Box>
};

let indexNewItemAdded = 0;

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

  const addActionList = (keyList: string, itemToAdd: any) => {
    if (!config) return;
    const cloneList = [...(config as any)[keyList]];
    cloneList.push(itemToAdd);
    indexNewItemAdded++;
    setConfig({
      ...config,
      [keyList]: cloneList,
    });
  };
  
  const editActionList = (
      keyList: string,
      id: string,
      equals: (item: any, idToEdit: string) => boolean,
      editConfig?: (newConfig: any[], index: number, newData: string) => void
    ) => (newText: string) => {
    if (!config) return;
    const cloneList = [...(config as any)[keyList]];
    const index = cloneList.findIndex(item => equals(item, id));
    if (!editConfig) {
      cloneList[index] = newText;
    } else {
      editConfig(cloneList, index, newText);
    }
    setConfig({
      ...config,
      [keyList]: cloneList,
    });
  };

  return <>
    {config && <Box sx={formStyle}>
        <TitleAndList
          title='Citas'
          deleteAction={deleteActionList('quoteList', ({author, quote}: any, idToDelete: string) => `@${author}@${quote}` === idToDelete)}
          addAction={() => addActionList('quoteList', {author: `new author ${indexNewItemAdded}`, quote: `new quote ${indexNewItemAdded}`}) }
          list={config.quoteList.map(({author, quote}) => ({
            id: `@${author}@${quote}`,
            item: <><LabelAndTextField
              text={author}
              onChange={
                editActionList(
                  'quoteList',
                  `@${author}@${quote}`,
                  ({author: authorToEdit, quote: quoteToEdit}: any, idToEdit: string) => `@${authorToEdit}@${quoteToEdit}` === idToEdit,
                  (newConfig, index, newText) => ({...newConfig[index], author: newText,})
                )
              }
              /><LabelAndTextField
              text={quote}
              onChange={
                editActionList(
                  'quoteList',
                  `@${author}@${quote}`,
                  ({author: authorToEdit, quote: quoteToEdit}: any, idToEdit: string) => `@${authorToEdit}@${quoteToEdit}` === idToEdit,
                  (newConfig, index, newText) => ({...newConfig[index], quote: newText,})
                )
              }
              />
            </>
          }))}
        />
        <TitleAndList
          title='Nitter Instances'
          deleteAction={deleteActionList('nitterInstancesList', (item: any, idToDelete: string) => item === idToDelete)}
          addAction={() => addActionList('nitterInstancesList', `new Instance ${indexNewItemAdded}`) }
          list={config.nitterInstancesList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={
            editActionList('nitterInstancesList', `${item}`, (item: any, idToEdit: string) => item === idToEdit)
          }/>}))}
        />
        <TitleAndList
          title='Twitter Users'
          deleteAction={deleteActionList('nitterRssUsersList', (item: any, idToDelete: string) => item === idToDelete)}
          addAction={() => addActionList('nitterRssUsersList', `new User ${indexNewItemAdded}`) }
          list={config.nitterRssUsersList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={
            editActionList('nitterRssUsersList', `${item}`, (item: any, idToEdit: string) => item === idToEdit)
          }/>}))}
        />
        <TitleAndList
          title='Mastodon Users'
          deleteAction={deleteActionList('mastodonRssUsersList', ({user, instance}: any, idToDelete: string) => `@${user}@${instance}` === idToDelete)}
          addAction={() => addActionList('mastodonRssUsersList', {user: `new User ${indexNewItemAdded}`, instance: `new Instance ${indexNewItemAdded}`}) }
          list={config.mastodonRssUsersList.map(({instance, user}) => ({
            id: `@${user}@${instance}`,
            item: <>@<LabelAndTextField
              text={user}
              onChange={
                editActionList(
                  'mastodonRssUsersList',
                  `@${user}@${instance}`,
                  ({user: userToEdit, instance: instanceToEdit}: any, idToEdit: string) => `@${userToEdit}@${instanceToEdit}` === idToEdit,
                  (newConfig, index, newText) => ({...newConfig[index], user: newText,})
                )
              }
              />@<LabelAndTextField
              text={instance}
              onChange={
                editActionList(
                  'mastodonRssUsersList',
                  `@${user}@${instance}`,
                  ({user: userToEdit, instance: instanceToEdit}: any, idToEdit: string) => `@${userToEdit}@${instanceToEdit}` === idToEdit,
                  (newConfig, index, newText) => ({...newConfig[index], instance: newText,})
                )
              }
              />
            </>
          }))}
        />
        <TitleAndList
          title='Blog RSS'
          deleteAction={deleteActionList('blogRssList', (item: any, idToDelete: string) => item === idToDelete)}
          addAction={() => addActionList('blogRssList', `new Blog ${indexNewItemAdded}`) }
          list={config.blogRssList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={
            editActionList('blogRssList', `${item}`, (item: any, idToEdit: string) => item === idToEdit)
          }/>}))}
        />
        <TitleAndList
          title='Telegram commands'
          list={Object.keys(config.listBotCommands).map((commandName, index) => ({
              id:`${index}`,
              item: <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignContent: 'space-between', alignItems: 'center', justifyContent: 'center', width:'100%'}}>
                <Box>{commandName}</Box>
                <Box sx={{ marginLeft: {xs: 'none', sm:'auto'}}}>
                  <LabelAndTextField
                    text={config.listBotCommands[commandName]}
                    onChange={(newText: string) => {
                      const cloneList = {...config.listBotCommands};
                      (cloneList as any)[commandName] = newText;
                      setConfig({
                        ...config,
                        listBotCommands: cloneList,
                      });
                    }          
                    }
                  />
                </Box>
              </Box>
          })
        )} />
        <Box sx={footerStyle}>
          <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
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
          <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
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
        <SaveConfigurationComponent config={config}/>
      </Box>
    }
  </>;
};
