type ConfigurationList = string[];
type YoutubeConfigurationList = {
  url: string;
  show_not_publised_videos: boolean;
  not_filter_shorts: boolean;
  words_to_filter: string;
  mandatory_words: string;
  tag: string;
  favorite?: boolean;
}[];
type MastodonConfigurationList = { instance: string; user: string; }[];
type QuoteList = {quote: string; author: string}[];
interface ConfigurationGeneral {
  listBotCommands: {[key: string]: string};
  windowsFFMPEGPath: string;
  backupUrls: string;
  cloudRootPath: string;
  showNitterRSSInAll: boolean;
  numberOfWorkers: number;
  apiPort: number;
  webSocketPort: number;
}

export interface ConfigurationDataModel {
  type: string;
  content: ConfigurationList | MastodonConfigurationList | QuoteList | ConfigurationGeneral | YoutubeConfigurationList;
}

export interface ConfigurationDataZipped {
  nitterInstancesList: string[];
  nitterRssUsersList: string[];
  mastodonRssUsersList: MastodonConfigurationList;
  blogRssList: string[];
  youtubeRssList: YoutubeConfigurationList;
  quoteList: QuoteList;
  listBotCommands: {[key: string]: string};
  windowsFFMPEGPath: string;
  backupUrls: string;
  cloudRootPath: string;
  showNitterRSSInAll: boolean;
  numberOfWorkers: number;
  apiPort: number;
  webSocketPort: number;
}

export const parseToZippedConfig = (configList: ConfigurationDataModel[]): ConfigurationDataZipped => {
  const {listBotCommands, windowsFFMPEGPath, backupUrls, cloudRootPath, showNitterRSSInAll, numberOfWorkers, apiPort, webSocketPort} = getContentConfigurationByType(configList, 'configuration') as ConfigurationGeneral;
  return ({
    nitterInstancesList: getContentConfigurationByType(configList, 'nitterInstancesList') as string[],
    nitterRssUsersList: getContentConfigurationByType(configList, 'nitterRssUsersList') as string[],
    mastodonRssUsersList: getContentConfigurationByType(configList, 'mastodonRssUsersList') as { instance: string; user: string; }[],
    blogRssList: getContentConfigurationByType(configList, 'blogRssList') as string[],
    youtubeRssList: getContentConfigurationByType(configList, 'youtubeRssList') as YoutubeConfigurationList,
    quoteList: getContentConfigurationByType(configList, 'quoteList') as {quote: string; author: string}[],
    listBotCommands,
    windowsFFMPEGPath,
    backupUrls,
    cloudRootPath,
    showNitterRSSInAll,
    numberOfWorkers,
    apiPort,
    webSocketPort,
  });
}

export const parseToConfigDataModel = (configZipped: ConfigurationDataZipped): ConfigurationDataModel[] => {
  const configList: ConfigurationDataModel[] = [];
  const {listBotCommands, windowsFFMPEGPath, backupUrls, cloudRootPath, showNitterRSSInAll, numberOfWorkers, apiPort, webSocketPort} = configZipped;
  configList.push({
    type: 'configuration',
    content: { listBotCommands,windowsFFMPEGPath, backupUrls, cloudRootPath, showNitterRSSInAll, numberOfWorkers, apiPort, webSocketPort },
  });

  ['nitterInstancesList', 'nitterRssUsersList', 'mastodonRssUsersList', 'blogRssList', 'youtubeRssList', 'quoteList'].forEach(type => {
    configList.push({
      type,
      content: (configZipped as any)[type],
    });  
  });
  return configList;
}

export const getContentConfigurationByType = (configList: ConfigurationDataModel[], type: string): ConfigurationList | MastodonConfigurationList | QuoteList | ConfigurationGeneral | YoutubeConfigurationList => {
  const index = configList.findIndex(config => config.type === type);
  return configList[index].content;
}

export const getContentConfigurationZippedByType = (configZipped: ConfigurationDataZipped, type: string): ConfigurationList | MastodonConfigurationList | QuoteList | ConfigurationGeneral | YoutubeConfigurationList => {
  if (type === 'configuration') {
    const {listBotCommands, windowsFFMPEGPath, backupUrls, cloudRootPath, showNitterRSSInAll, numberOfWorkers, apiPort, webSocketPort} = configZipped;
    return {listBotCommands, windowsFFMPEGPath, backupUrls, cloudRootPath, showNitterRSSInAll, numberOfWorkers, apiPort, webSocketPort};
  } else { 
    return (configZipped as any)[type];
  }
}

export interface ConfigurationTypeDataModel {
  data: string[];
}

export interface ComandLineRequest {
  commandLine: string;
}

export interface ComandLineResponse {
  stdout: string;
  stderr: string;
}
