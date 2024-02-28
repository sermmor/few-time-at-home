import { readFile, writeFileSync } from 'fs';
import { ExecException, exec } from 'child_process';
import { Quote } from "../quote/quoteList";
import { saveInAFile } from "../utils";
import { ChannelMediaRSSCollection } from "./messagesRSS.service";

const pathConfigFile = 'configuration.json';
const pathAdditionalConfigFiles: {[key: string]: string} = {
  blogRssList: 'data/config/blogRssList.json',
  mastodonRssUsersList: 'data/config/mastodonRssUsersList.json',
  nitterInstancesList: 'data/config/nitterInstancesList.json',
  nitterRssUsersList: 'data/config/nitterRssUsersList.json',
  quoteList: 'data/config/quoteList.json',
  youtubeRssList: 'data/config/youtubeRssList.json',
};
const listNamesAdditionalConfigFiles = Object.keys(pathAdditionalConfigFiles);

const readAdditionalConfigFile = (
  listNameFiles: string[],
  configToAdd: any,
  index = 0,
): Promise<any> => new Promise<any>(resolve => {
  const nameFile = listNameFiles[index];
  readFile(pathAdditionalConfigFiles[nameFile], (err, data) => { 
    if (err) throw err;
    const configData = JSON.parse(<string> <any> data);
    configToAdd[nameFile] = configData;
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

export class ConfigurationService {
    static Instance: ConfigurationService;

    nitterInstancesList: string[];
    nitterRssUsersList: string[];
    mastodonRssUsersList:
        {
        instance: string;
        user: string;
        }[];
    blogRssList: string[];
    youtubeRssList: string[];
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
    quoteList: Quote[];
    backupUrls: string;
    cloudRootPath: string;
    showNitterRSSInAll: boolean;
    numberOfWorkers: number;
    apiPort: number;

    private configTypes;
    
    constructor(configurationData: any) {
      this.configTypes = ['configuration', ...listNamesAdditionalConfigFiles];
      this.nitterInstancesList = configurationData.nitterInstancesList;
      this.nitterRssUsersList = configurationData.nitterRssUsersList;
      this.mastodonRssUsersList = configurationData.mastodonRssUsersList;
      this.blogRssList = configurationData.blogRssList;
      this.youtubeRssList = configurationData.youtubeRssList;
      this.listBotCommands = configurationData.listBotCommands;
      this.showNitterRSSInAll = configurationData.showNitterRSSInAll;
      this.numberOfWorkers = configurationData.numberOfWorkers;
      this.backupUrls = configurationData.backupUrls;
      this.cloudRootPath = configurationData.cloudRootPath;
      this.apiPort = configurationData.apiPort;
      this.quoteList = configurationData.quoteList;

      ConfigurationService.Instance = this;
    }

    getConfigTypes = (): string[] => this.configTypes;

    getConfigurationByType = (typeConfig: string) => {
      if (typeConfig === 'configuration') {
        return {
          listBotCommands: this.listBotCommands,
          backupUrls: this.backupUrls,
          cloudRootPath: this.cloudRootPath,
          showNitterRSSInAll: this.showNitterRSSInAll,
          numberOfWorkers: this.numberOfWorkers,
          apiPort: this.apiPort,
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
      channelMediaCollection.nitterRSS.refleshChannelMediaConfiguration();
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

    // updateConfiguration = (channelMediaCollection: ChannelMediaRSSCollection, body: any): Promise<void> => new Promise<void>(resolve => {
    //     if (body.nitterInstancesList) this.nitterInstancesList = body.nitterInstancesList;
    //     if (body.nitterRssUsersList) this.nitterRssUsersList = body.nitterRssUsersList;
    //     if (body.mastodonRssUsersList) this.mastodonRssUsersList = body.mastodonRssUsersList;
    //     if (body.blogRssList) this.blogRssList = body.blogRssList;
    //     if (body.youtubeRssList) this.youtubeRssList = body.youtubeRssList;
    //     if (body.listBotCommands) this.listBotCommands = body.listBotCommands;
    //     if (body.quoteList) this.quoteList = body.quoteList;
    //     if (body.backupUrls) this.backupUrls = body.backupUrls;
    //     if (body.cloudRootPath !== undefined) this.cloudRootPath = body.cloudRootPath;
    //     if (body.showNitterRSSInAll !== undefined) this.showNitterRSSInAll = body.showNitterRSSInAll;
    //     if (body.numberOfWorkers) this.numberOfWorkers = body.numberOfWorkers;
    //     if (body.apiPort) this.apiPort = body.apiPort;

    //     this.saveConfiguration();

    //     channelMediaCollection.blogRSS.refleshChannelMediaConfiguration();
    //     channelMediaCollection.mastodonRSS.refleshChannelMediaConfiguration();
    //     channelMediaCollection.nitterRSS.refleshChannelMediaConfiguration();
    //     channelMediaCollection.youtubeRSS.refleshChannelMediaConfiguration().then(() => {
    //       console.log("> Configuration changed!");
    //       resolve();
    //     });
    // });

    // private saveConfiguration = () => {
    //   saveInAFile(JSON.stringify(this.getConfigurationJson(), null, 2), pathConfigFile);
    // }

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
}