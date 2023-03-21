import { ConfigurationDataModel } from '../configuration';

export const configurationDataModelMock = (): ConfigurationDataModel => ({
  nitterInstancesList: [
    'https://nitter1.com',
    'https://nitter2.com',
    'https://nitter3.com',
    'https://nitter4.com',
  ],
  nitterRssUsersList: [
    'nitterUser1',
    'nitterUser2',
    'nitterUser3',
    'nitterUser4',
  ],
  mastodonRssUsersList: [
    {
      "instance": "instance1",
      "user": "mastoUser1"
    },
    {
      "instance": "instance2",
      "user": "mastoUser2"
    },
    {
      "instance": "instance3",
      "user": "mastoUser3"
    },
  ],
  blogRssList: [
    "https://blog1/feed/",
    "https://blog2/feed/",
    "https://blog3/feed/",
  ],
  youtubeRssList: [
    "https://youtube1/feed/",
    "https://youtube2/feed/",
    "https://youtube3/feed/",
  ],
  listBotCommands: {
    bot_all_command: 'allThings',
    bot_masto_command: 'mastoThings',
    bot_nitter_command: 'nitterThings',
    bot_blog_command: 'blogThings',
  },
  quoteList: [
    {
      quote: "Sólo sé que no sé nada.",
      author: "Sócrates"
    },
    {
      quote: "La virtud está en el término medio.",
      author: "Aristóteles"
    },
  ],
  numberOfWorkers: 4,
  apiPort: 8080,
});
