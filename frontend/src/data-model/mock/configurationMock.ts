import { ConfigurationDataModel, ConfigurationTypeDataModel } from '../configuration';

export const configurationTypeDataModelMock = (): ConfigurationTypeDataModel => ({
  data: [
    'configuration',
    'nitterInstancesList',
    'nitterRssUsersList',
    'mastodonRssUsersList',
    'blogRssList',
    'youtubeRssList',
    'quoteList',
  ]
});

export const configurationDataModelMock = (type: string): ConfigurationDataModel => {
  switch (type) {
    case 'nitterInstancesList':
      return {
        type,
        content: [
          'https://nitter1.com',
          'https://nitter2.com',
          'https://nitter3.com',
          'https://nitter4.com',
        ],
      };
    case 'nitterRssUsersList':
      return {
        type,
        content: [
          'nitterUser1',
          'nitterUser2',
          'nitterUser3',
          'nitterUser4',
        ],
      };
    case 'mastodonRssUsersList':
      return {
        type,
        content: [
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
      };
    case 'blogRssList':
      return {
        type,
        content: [
          "https://blog1/feed/",
          "https://blog2/feed/",
          "https://blog3/feed/",
        ],
      };
    case 'youtubeRssList':
      return {
        type,
        content: [
          {
            url: "https://youtube1/feed/",
            show_not_publised_videos: false,
            not_filter_shorts: false,
            words_to_filter: 'word1 word2 word3',
            mandatory_words: 'null',
          },
          {
            url: "https://youtube2/feed/",
            show_not_publised_videos: false,
            not_filter_shorts: false,
            words_to_filter: 'word1 word2 word3',
            mandatory_words: 'mandatory1',
          },
          {
            url: "https://youtube3/feed/",
            show_not_publised_videos: false,
            not_filter_shorts: false,
            words_to_filter: 'word1 word2 word3',
            mandatory_words: 'mandatory2',
          },
        ],
      };
    case 'quoteList':
      return {
        type,
        content: [
          {
            "quote": "Es muy duro olvidar el dolor, pero es más duro todavía recordar la dulzura. La felicidad no nos deja cicatrices. Apenas aprendemos nada de la paz.",
            "author": "Chuck Palahniuk",
          },
          {
            "quote": "Para justificar cualquier crimen, tienes que convertir a la víctima en tu enemigo. Al cabo de bastante tiempo, el mundo entero acaba siendo tu enemigo. Con cada crimen, estás más y más alineado del mundo. Te imaginas más y más que el mundo entero está en contra de ti.",
            "author": "Chuck Palahniuk",
          },
          {
            "quote": "Sé gentil. No dejes que el mundo te endurezca. No dejes que el dolor te haga odiar. No dejes que la amargura te robe la dulzura. Siéntete orgulloso de que aunque el resto del mundo esté en desacuerdo, todavía crees que es un lugar hermoso.",
            "author": "Kurt Vonnegut",
          },
        ]
      };
  }
  return {
    type,
    content: {
      listBotCommands: {
        bot_all_command: 'allThings',
        bot_masto_command: 'mastoThings',
        bot_nitter_command: 'nitterThings',
        bot_blog_command: 'blogThings',
      },
      backupUrls: "C:\\Workspace\\few-time-at-home\\backups",
      cloudRootPath: "C:\\Workspace\\few-time-at-home\\rootCloud",
      showNitterRSSInAll: true,
      numberOfWorkers: 4,
      apiPort: 8080,
    }
  };
}

export const comandLineResponseMock = () => ({
  stdout: 'ok',
  stderr: 'undefined',
});
