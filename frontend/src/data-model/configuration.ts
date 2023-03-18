export interface ConfigurationDataModel {
  nitterInstancesList: string[],
  nitterRssUsersList: string[],
  mastodonRssUsersList: { instance: string; user: string; }[],
  blogRssList: string[],
  listBotCommands: {[key: string]: string},
  // {
  //   'bot_all_command': string;
  //   'bot_masto_command': string;
  //   'bot_nitter_command': string;
  //   'bot_blog_command': string;
  // },
  numberOfWorkers: number,
  apiPort: number,
}
