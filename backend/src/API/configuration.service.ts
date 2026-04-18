import { readFile, writeFileSync } from 'fs';
import { ExecException, exec } from 'child_process';
import { Quote } from "../quote/quoteList";
import { saveInAFile } from "../utils";
import { ChannelMediaRSSCollection, ChannelMediaRSSCollectionExport } from "./messagesRSS.service";

const pathConfigFile = 'configuration.json';
const pathAdditionalConfigFiles: {[key: string]: string} = {
  blogRssList: 'data/config/blogRssList.json',
  newsRSSList: 'data/config/newsRSSList.json',
  mastodonRssUsersList: 'data/config/mastodonRssUsersList.json',
  quoteList: 'data/config/quoteList.json',
  youtubeRssList: 'data/config/youtubeRssList.json',
  listBotCommands: 'data/config/listBotCommands.json',
  rssConfig: 'data/config/rssConfig.json',
};
const listNamesAdditionalConfigFiles = Object.keys(pathAdditionalConfigFiles);

const readAdditionalConfigFile = (
  listNameFiles: string[],
  configToAdd: any,
  index = 0,
): Promise<any> => new Promise<any>(resolve => {
  const nameFile = listNameFiles[index];
  readFile(pathAdditionalConfigFiles[nameFile], (err, data) => { 
    if (err) {
      // For new config types like listBotCommands and rssConfig, skip if file doesn't exist yet
      // They will remain in configuration.json until first saved separately
      if (!['listBotCommands', 'rssConfig'].includes(nameFile)) {
        throw err;
      }
    } else {
      const configData = JSON.parse(<string> <any> data);
      configToAdd[nameFile] = configData;
    }
    if (index + 1 < listNameFiles.length) {
      readAdditionalConfigFile(listNameFiles, configToAdd, index + 1).then(completeConfig => resolve(completeConfig));
    } else {
      resolve(configToAdd);
    }
  });
});

export const readAllConfigurationsFiles = (): Promise<any> => new Promise<any>(resolve => {
  readFile(pathConfigFile, (err, data) => { 
    if (err) throw err;
    const config = JSON.parse(<string> <any> data);
    readAdditionalConfigFile(listNamesAdditionalConfigFiles, config).then(completeConfig => resolve(completeConfig))
  });
});

export interface YoutubeData {
  url: string;
  show_not_publised_videos: boolean;
  not_filter_shorts: boolean;
  words_to_filter: string;
  mandatory_words: string;
  tag: string;
  favorite?: boolean;
}

export class ConfigurationService {
  static Instance: ConfigurationService;

  mastodonRssUsersList:
  {
    instance: string;
    user: string;
  }[];
  blogRssList: string[];
  newsRSSList: string[];
  youtubeRssList: YoutubeData[];
  listBotCommands: {
      bot_login: string;
      bot_all_command: string;
      bot_masto_command: string;
      bot_nitter_command: string;
      bot_blog_command: string;
      bot_youtube_command: string;
      bot_notes_command: string;
      bot_add_notes_command: string;
      bot_add_bookmark_command: string;
      bot_to_save_list_command: string;
      bot_get_save_list_command: string;
      bot_search_bookmark_command: string;
      bot_add_alert: string;
      bot_search_file: string;
      bot_give_file_from_search: string;
      bot_cloud_cd_path: string,
      bot_cloud_ls_path: string,
      bot_cloud_return_path: string
      bot_cloud_upload_to_current_path: string;
      bot_cloud_get_current_path: string;
      bot_cloud_download_folder: string;
  };
  rssConfig: {
    updateAtStartApp: boolean;
    optionTagsYoutube: string[];
    autoUpdateTimeInSeconds: number;
    numMaxMessagesToSave: number;
    initialWebNumberOfMessagesWithLinks: number;
    normalWebNumberOfMessagesWithLinks: number;
  };
  quoteList: Quote[];
  windowsFFMPEGPath: string;
  backupUrls: string;
  cloudRootPath: string;
  numberOfWorkers: number;
  apiPort: number;
  webSocketPort: number;
  dialogAlphas: {
    general: number;
    rssCard: number;
    pomodoroEditorConfig: number;
    configurationCards: number;
  };

  private configTypes;
  
  constructor(configurationData: any) {
    this.configTypes = ['configuration', ...listNamesAdditionalConfigFiles];
    this.mastodonRssUsersList = configurationData.mastodonRssUsersList;
    this.blogRssList = configurationData.blogRssList;
    this.newsRSSList = configurationData.newsRSSList;
    this.youtubeRssList = configurationData.youtubeRssList;
    this.listBotCommands = configurationData.listBotCommands;
    this.numberOfWorkers = configurationData.numberOfWorkers;
    this.backupUrls = configurationData.backupUrls;
    this.cloudRootPath = configurationData.cloudRootPath;
    this.apiPort = configurationData.apiPort;
    this.webSocketPort = configurationData.webSocketPort;
    this.quoteList = configurationData.quoteList;
    this.rssConfig = configurationData.rssConfig;
    this.windowsFFMPEGPath = configurationData.windowsFFMPEGPath;
    this.dialogAlphas = {
      general: 0.7,
      rssCard: 0.7,
      pomodoroEditorConfig: 0.5,
      configurationCards: 0.5,
      ...(configurationData.dialogAlphas || {}),
    };

    ConfigurationService.Instance = this;
  }

  getConfigTypes = (): string[] => this.configTypes;

  getConfigurationByType = (typeConfig: string) => {
    if (typeConfig === 'configuration') {
      return {
        listBotCommands: this.listBotCommands,
        windowsFFMPEGPath: this.windowsFFMPEGPath,
        backupUrls: this.backupUrls,
        cloudRootPath: this.cloudRootPath,
        numberOfWorkers: this.numberOfWorkers,
        apiPort: this.apiPort,
        webSocketPort: this.webSocketPort,
        rssConfig: this.rssConfig,
        dialogAlphas: this.dialogAlphas,
      }
    }
    return (<any> this)[typeConfig];
  }

  updateConfigurationByType = (channelMediaCollection: ChannelMediaRSSCollection, typeConfig: string, content: any): Promise<void> => new Promise<void>(resolve => {
    if (typeConfig === 'configuration') {
      Object.keys(content).forEach(keyConfig => (<any> this)[keyConfig] = content[keyConfig]);
    } else {
      (<any> this)[typeConfig] = content;
    }

    this.saveConfigurationByType(typeConfig);

    channelMediaCollection.blogRSS.refleshChannelMediaConfiguration();
    channelMediaCollection.mastodonRSS.refleshChannelMediaConfiguration();
    channelMediaCollection.newsRSS.refleshChannelMediaConfiguration();
    if (typeConfig === 'youtubeRssList') {
      channelMediaCollection.youtubeRSS.refleshChannelMediaConfiguration().then(() => {
        console.log("> Configuration changed!");
        resolve();
      });
    } else {
      resolve();
    }
  });

  private saveConfigurationByType = (typeConfig: string) => {
    const path = typeConfig === 'configuration' ? pathConfigFile : pathAdditionalConfigFiles[typeConfig];
    saveInAFile(JSON.stringify(this.getConfigurationByType(typeConfig), null, 2), path);
  }

  launchCommandLine = (cmd: string): Promise<ExecException | { stdout: string, stderr: string }>=> {
    return new Promise((resolve, reject) => {
      try{
        exec(cmd, (err, stdout, stderr) => {
          if (err) {
            console.log(err);
            resolve({ stdout: '', stderr: `${err}` });
          } else {
            resolve({ stdout, stderr });
          }
        });
      } catch (e) {
        resolve({ stdout: '', stderr: `${e}` });
      }
    });
  }

  fileContent = (): any => ({
    mastodonRssUsersList: this.mastodonRssUsersList,
    blogRssList: this.blogRssList,
    newsRSSList: this.newsRSSList,
    youtubeRssList: this.youtubeRssList,
    listBotCommands: this.listBotCommands,
    numberOfWorkers: this.numberOfWorkers,
    apiPort: this.apiPort,
    webSocketPort: this.webSocketPort,
    quoteList: this.quoteList,
    rssConfig: this.rssConfig,
    dialogAlphas: this.dialogAlphas,
  });

  setFileContent = (data: any): Promise<void> => new Promise<void>(resolve => {
    this.mastodonRssUsersList = data.mastodonRssUsersList;
    this.blogRssList = data.blogRssList;
    this.newsRSSList = data.newsRSSList;
    this.youtubeRssList = data.youtubeRssList;
    this.listBotCommands = data.listBotCommands;
    this.numberOfWorkers = data.numberOfWorkers;
    this.apiPort = data.apiPort;
    this.webSocketPort = data.webSocketPort;
    this.quoteList = data.quoteList;
    this.rssConfig = data.rssConfig;
    this.dialogAlphas = data.dialogAlphas || this.dialogAlphas;

    this.configTypes.forEach(typeConfig => this.saveConfigurationByType(typeConfig));

    const channelMediaCollection = ChannelMediaRSSCollectionExport.Instance.channelMediaCollection;

    channelMediaCollection.blogRSS.refleshChannelMediaConfiguration();
    channelMediaCollection.mastodonRSS.refleshChannelMediaConfiguration();
    channelMediaCollection.youtubeRSS.refleshChannelMediaConfiguration().then(() => {
      console.log("> Configuration changed!");
      resolve();
    });
  });
}