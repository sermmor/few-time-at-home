export interface ConfigurationDataModel {
  nitterInstancesList: string[],
  nitterRssUsersList: string[],
  mastodonRssUsersList: { instance: string; user: string; }[],
  blogRssList: string[],
  listBotCommands: {[key: string]: string},
  numberOfWorkers: number,
  apiPort: number,
}
