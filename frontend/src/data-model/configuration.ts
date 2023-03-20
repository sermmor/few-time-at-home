export interface ConfigurationDataModel {
  nitterInstancesList: string[],
  nitterRssUsersList: string[],
  mastodonRssUsersList: { instance: string; user: string; }[],
  blogRssList: string[],
  listBotCommands: {[key: string]: string},
  quoteList: {quote: string; author: string}[],
  numberOfWorkers: number,
  apiPort: number,
}
