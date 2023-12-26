export interface ConfigurationDataModel {
  nitterInstancesList: string[],
  nitterRssUsersList: string[],
  mastodonRssUsersList: { instance: string; user: string; }[],
  blogRssList: string[],
  youtubeRssList: string[],
  listBotCommands: {[key: string]: string},
  quoteList: {quote: string; author: string}[],
  backupUrls: string,
  numberOfWorkers: number,
  apiPort: number,
}
