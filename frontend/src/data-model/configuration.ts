export interface ConfigurationDataModel {
  nitterInstancesList: string[],
  nitterRssUsersList: string[],
  mastodonRssUsersList: { instance: string; user: string; }[],
  blogRssList: string[],
  youtubeRssList: string[],
  listBotCommands: {[key: string]: string},
  quoteList: {quote: string; author: string}[],
  backupUrls: string,
  showNitterRSSInAll: boolean,
  numberOfWorkers: number,
  apiPort: number,
}

export interface ComandLineRequest {
  commandLine: string;
}

export interface ComandLineResponse {
  stdout: string;
  stderr: string;
}
