import React from "react";
import { Box, Button, Checkbox, SxProps, TextField, Theme, Typography } from "@mui/material";
import { ConfigurationActions } from "../../../core/actions/configuration";
import { ConfigurationDataZipped, getContentConfigurationZippedByType, parseToZippedConfig } from "../../../data-model/configuration";
import { LabelAndTextField } from "../../molecules/LabelAndTextField/LabelAndTextField";
import { TitleAndList } from "../../organism/TitleAndList/TitleAndList";
import { PomodoroActions } from "../../../core/actions/pomodoro";

const formStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const commandLineStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  alignItems: 'left',
  justifyContent: 'initial',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  marginBottom: '2rem',
  padding: '1rem',
  color: 'rgb(30, 30, 30)',
  backgroundColor: 'whitesmoke',
};

const footerStyle: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
  alignItems: 'left',
  justifyContent: 'initial',
  fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
};

const SaveConfigurationComponent = ({config: allConfig, type}: {config: ConfigurationDataZipped, type: string}) => {
  const [isSave, setSave] = React.useState<boolean>(false);
  const setConfiguration = () => {
    ConfigurationActions.sendConfiguration({ type, content: getContentConfigurationZippedByType(allConfig, type) });
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
  const [config, setConfig] = React.useState<ConfigurationDataZipped>();
  const [lineToSend, setLineToSend] = React.useState<string>('');
  const [lineToSendResult, setLineToSendResult] = React.useState<string>('');
  const [pomodoroTimeMode, setPomodoroTimeMode] = React.useState<string>('');
  React.useEffect(() => {
    ConfigurationActions.getConfigurationType().then(types => ConfigurationActions.getConfiguration(types.data).then(data => setConfig(parseToZippedConfig(data))));
    PomodoroActions.getTimeModeList().then(({data}: any) => setPomodoroTimeMode(JSON.stringify(data, null, 2)));
  }, []);

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
      editConfig?: (newConfig: any[], index: number, newData: string | boolean) => any[]
    ) => (newText: string | boolean) => {
    if (!config) return;
    let cloneList = [...(config as any)[keyList]];
    const index = cloneList.findIndex(item => equals(item, id));
    if (!editConfig) {
      cloneList[index] = newText;
    } else {
      cloneList[index] = editConfig(cloneList, index, newText);
    }
    setConfig({
      ...config,
      [keyList]: cloneList,
    });
  };

  return <>
    {config && <Box sx={formStyle}>
        <>
          <TitleAndList
            title='Nitter Instances'
            deleteAction={deleteActionList('nitterInstancesList', (item: any, idToDelete: string) => item === idToDelete)}
            addAction={() => addActionList('nitterInstancesList', `new Instance ${indexNewItemAdded}`) }
            list={config.nitterInstancesList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={
              editActionList('nitterInstancesList', `${item}`, (item: any, idToEdit: string) => item === idToEdit)
            }/>}))}
          />
          <SaveConfigurationComponent config={config} type={'nitterInstancesList'}/>
        </>
        <>
          <TitleAndList
            title='Twitter Users'
            deleteAction={deleteActionList('nitterRssUsersList', (item: any, idToDelete: string) => item === idToDelete)}
            addAction={() => addActionList('nitterRssUsersList', `new User ${indexNewItemAdded}`) }
            list={config.nitterRssUsersList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={
              editActionList('nitterRssUsersList', `${item}`, (item: any, idToEdit: string) => item === idToEdit)
            }/>}))}
          />
          <SaveConfigurationComponent config={config} type={'nitterRssUsersList'}/>
        </>
        <>
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
          <SaveConfigurationComponent config={config} type={'mastodonRssUsersList'}/>
        </>
        <>
          <TitleAndList
            title='Blog RSS'
            deleteAction={deleteActionList('blogRssList', (item: any, idToDelete: string) => item === idToDelete)}
            addAction={() => addActionList('blogRssList', `new Blog ${indexNewItemAdded}`) }
            list={config.blogRssList.map((item) => ({id:`${item}`, item: <LabelAndTextField text={item} onChange={
              editActionList('blogRssList', `${item}`, (item: any, idToEdit: string) => item === idToEdit)
            }/>}))}
          />
          <SaveConfigurationComponent config={config} type={'blogRssList'}/>
        </>
        <>
          <TitleAndList
            title='Youtube RSS'
            showRowLine={true}
            deleteAction={deleteActionList('youtubeRssList', (item: any, idToDelete: string) => item.url === idToDelete)}
            addAction={() => addActionList('youtubeRssList', {
              url: `new channel ${indexNewItemAdded}`,
              show_not_publised_videos: true,
              not_filter_shorts: false,
              words_to_filter: 'defaultToIgnore',
              mandatory_words: 'null',
            })}
            list={config.youtubeRssList.map((item) =>  ({id:`${item.url}`, item: <>
                <Box sx={{ display: 'flex' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <ul>
                      <li style={{ width: '30rem' }}>
                        Url: <LabelAndTextField text={item.url} onChange={
                          editActionList(
                            'youtubeRssList',
                            `${item.url}`,
                            (item: any, idToEdit: string) => item.url === idToEdit,
                            (newConfig, index, newText) => ({...newConfig[index], url: newText,})
                          )
                        }/>
                      </li>
                      <li>
                        Words to filter:<LabelAndTextField text={item.words_to_filter || ''} onChange={
                          editActionList(
                            'youtubeRssList',
                            `${item.url}`,
                            (item: any, idToEdit: string) => item.url === idToEdit,
                            (newConfig, index, newText) => ({...newConfig[index], words_to_filter: newText,})
                          )
                        }/>
                      </li>
                      <li>
                        Mandatory words: <LabelAndTextField text={item.mandatory_words || ''} onChange={
                          editActionList(
                            'youtubeRssList',
                            `${item.url}`,
                            (item: any, idToEdit: string) => item.url === idToEdit,
                            (newConfig, index, newText) => ({...newConfig[index], mandatory_words: newText,})
                          )
                        }/>
                      </li>
                    </ul>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', marginRight: '1rem' }}>
                    <Checkbox
                      checked={item.not_filter_shorts}
                      onChange={evt => {
                        editActionList(
                          'youtubeRssList',
                          `${item.url}`,
                          (item: any, idToEdit: string) => item.url === idToEdit,
                          (newConfig, index, newText) => ({...newConfig[index], not_filter_shorts: newText,})
                        )(evt.target.checked)
                      }}
                    />
                    <Typography variant='subtitle2' sx={{textTransform: 'uppercase'}}>
                      Not filter youtube shorts
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={item.show_not_publised_videos}
                      onChange={evt => {
                        editActionList(
                          'youtubeRssList',
                          `${item.url}`,
                          (item: any, idToEdit: string) => item.url === idToEdit,
                          (newConfig, index, newText) => ({...newConfig[index], show_not_publised_videos: newText,})
                        )(evt.target.checked)
                      }}
                    />
                    <Typography variant='subtitle2' sx={{textTransform: 'uppercase'}}>
                      Show "Proximamente" videos
                    </Typography>
                  </Box>
                </Box>
              </>})
            )} // TODO: SÓLO LABEL AND TEXT FIELD DE URL, FALTAN DEL RESTO DE ELEMENTOS.
          />
          <SaveConfigurationComponent config={config} type={'youtubeRssList'}/>
        </>
        <>
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
          <SaveConfigurationComponent config={config} type={'quoteList'}/>
        </>
        { /* TODO POMODORO */ }
        <Box sx={commandLineStyle}>
          <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
            <Typography variant='h6' sx={{textTransform: 'uppercase'}}>Pomodoro Time Mode:</Typography>
            <Button
              variant='outlined'
              sx={{minWidth: '15.5rem'}}
              onClick={() => {
                const allTimeMode = JSON.parse(pomodoroTimeMode);
                PomodoroActions.sendNewTimeMode(allTimeMode);
              }}
              >
              Send new pomodoro configuration
            </Button>
          </Box>
          <TextField
            id="outlined-multiline"
            label="Resultado"
            multiline
            rows={15}
            sx={{width: '100%'}}
            value={pomodoroTimeMode}
            onChange={evt => {
              setPomodoroTimeMode(evt.target.value);
            }}
          />
        </Box>
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
            <Checkbox
              checked={config.showNitterRSSInAll}
              onChange={evt => {
                setConfig({
                  ...config,
                  showNitterRSSInAll: evt.target.checked,
                });
              }}
            />
            <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
              Show Twitter in 'all' rss option?
            </Typography>
          </Box>
          <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
            <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
              Backup path
            </Typography>
            <TextField
              label="Backup path"
              variant="standard"
              value={config.backupUrls}
              sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
              onChange={evt => {
                setConfig({
                  ...config,
                  backupUrls: evt.target.value,
                });
              }}
            />
          </Box>
          <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
            <Typography variant='h6' sx={{textTransform: 'uppercase'}}>
              Cloud path
            </Typography>
            <TextField
              label="Cloud path"
              variant="standard"
              value={config.cloudRootPath}
              sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '5rem'}}}
              onChange={evt => {
                setConfig({
                  ...config,
                  cloudRootPath: evt.target.value,
                });
              }}
            />
          </Box>
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
        <SaveConfigurationComponent config={config} type={'configuration'}/>
        <Box sx={commandLineStyle}>
          <Box sx={{display: 'flex', flexDirection: {xs: 'column', sm:'row'}, gap: '2rem', alignItems: 'center', justifyContent: 'left', minWidth: {xs: '15.5rem', sm: '27rem', md: '50rem'}}}>
            <Typography variant='h6' sx={{textTransform: 'uppercase'}}>Command line to send:</Typography>
            <TextField
              label="line to send"
              variant="standard"
              value={lineToSend}
              sx={{minWidth: {xs: '15.5rem', sm: '5rem', md: '30rem'}}}
              onChange={evt => {
                setLineToSend(evt.target.value);
              }}
            />
            <Button
              variant='outlined'
              sx={{minWidth: '15.5rem'}}
              onClick={() => ConfigurationActions.sendCommandLine({commandLine: lineToSend}).then(result => {
                if (result.stdout) {
                  setLineToSendResult(result.stdout);
                } else if (result.stderr) {
                  setLineToSendResult(result.stderr);
                } else if (result.stdout === '' && result.stderr === '') {
                  setLineToSendResult('FINISHED');
                } else {
                  console.log(result);
                }
              })}
              >
              Send command line
            </Button>
          </Box>
          <TextField
            id="outlined-multiline-static"
            label="Resultado"
            multiline
            rows={5}
            sx={{width: '100%'}}
            value={lineToSendResult}
          />
        </Box>
      </Box>
    }
  </>;
};
