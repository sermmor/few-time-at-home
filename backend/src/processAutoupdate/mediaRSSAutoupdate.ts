import { ConfigurationService, TelegramBotCommand } from "../API";
import { readJSONFile, saveInAFilePromise } from "../utils";
import { WebSocketsServerService } from "../webSockets/webSocketsServer.service";
import { YoutubeRSSUtils } from "../youtubeRSS/youtubeRSSUtils";

type FileMediaContentType = {messagesMasto: string[], messagesBlog: string[], messagesNewsFeed: string[], messagesYoutube: {tag: string; content: string[]}[]};

const mediaFilePath = 'data/config/media/mediaFilesContent.json';
const favoriteYoutubeFilePath = 'data/config/media/youtubeFavoritesArchive.json';

export type MediaType = 'youtube' | 'mastodon' | 'blog' | 'news';

const timeInHoursToSaveMediaDataInFiles = 24; // 1 time in a day

export class MediaRSSAutoupdate {
  public static instance: MediaRSSAutoupdate;

  private favoritesYoutubeMessages: string[] = [];
  private lastUpdateMilliseconds: number = 0;

  public currentCompleteData: FileMediaContentType = {messagesMasto: [], messagesBlog: [], messagesNewsFeed: [], messagesYoutube: []};
  public youtubeFavoriteCompleteData: string[] = []

  constructor(private commands: TelegramBotCommand) {
    MediaRSSAutoupdate.instance = this;
    this.lastUpdateMilliseconds = Date.now();
    if (ConfigurationService.Instance.rssConfig.updateAtStartApp) {
      setTimeout(() => this.update(), 0);
    } else {
      const nextUpdateMessage = `Media RSS Autoupdate loaded. Next update at ${
        new Date(this.lastUpdateMilliseconds + ConfigurationService.Instance.rssConfig.autoUpdateTimeInSeconds * 1000).toLocaleString()
      }`;
      WebSocketsServerService.Instance.updateData({
        ...WebSocketsServerService.Instance.webSocketData,
        rssAutoUpdateMessage: nextUpdateMessage,
      });
      this.loadFileData();
    }
    setInterval(() => {
      this.lastUpdateMilliseconds = Date.now();
      this.update();
    }, ConfigurationService.Instance.rssConfig.autoUpdateTimeInSeconds * 1000);
    setInterval(() => {
      this.saveFileData();
    }, timeInHoursToSaveMediaDataInFiles * 60 * 60 * 1000);
  }

  private loadFileData = async() => {
    const fileVoid = "{messagesMasto: [], messagesBlog: [], messagesNewsFeed: [], messagesYoutube: []}";
    const dataOrVoid: FileMediaContentType | string = await readJSONFile(
      mediaFilePath,
      "{messagesMasto: [], messagesBlog: [], messagesNewsFeed: [], messagesYoutube: []}"
    );
    this.currentCompleteData = dataOrVoid === fileVoid ?
     {messagesMasto: [], messagesBlog: [], messagesNewsFeed: [], messagesYoutube: []} : dataOrVoid as FileMediaContentType;

    const dataOrVoidYoutube: string[] | string = await readJSONFile(favoriteYoutubeFilePath, "[]");
    this.youtubeFavoriteCompleteData = dataOrVoidYoutube === "[]" ? [] : dataOrVoidYoutube as string[];
  }

  private saveFileData = async() => {
    await saveInAFilePromise(JSON.stringify(this.currentCompleteData, null, 2), mediaFilePath);
    await saveInAFilePromise(JSON.stringify(this.youtubeFavoriteCompleteData, null, 2), favoriteYoutubeFilePath);
    console.log(`Saved RSS file data at ${(new Date(Date.now())).toLocaleString()}`);
    WebSocketsServerService.Instance.updateData({
      ...WebSocketsServerService.Instance.webSocketData,
      rssSaveMessage: `Saved RSS file data at ${(new Date(Date.now())).toLocaleString()}`,
    });
  }

  update = (isForce = false): Promise<void> => new Promise<void>(resolve => {
    if (!this.currentCompleteData || this.currentCompleteData.messagesBlog.length === 0) {
      this.loadFileData();
    }
    console.log("Starting Media RSS Autoupdate...");
    if (!isForce) {
      WebSocketsServerService.Instance.updateData({
        ...WebSocketsServerService.Instance.webSocketData,
        rssAutoUpdateMessage: "Starting Media RSS Autoupdate...",
      });
    }
    this.doAllUpdates().then(() => {
      const nextUpdateMessage = `Media RSS Autoupdate completed successfully. Next update at ${
        new Date(this.lastUpdateMilliseconds + ConfigurationService.Instance.rssConfig.autoUpdateTimeInSeconds * 1000).toLocaleString()
      }`;
      console.log(nextUpdateMessage);
      if (!isForce) {
        WebSocketsServerService.Instance.updateData({
          ...WebSocketsServerService.Instance.webSocketData,
          rssAutoUpdateMessage: nextUpdateMessage,
        });
      }
      resolve();
    }).catch(err => {
      console.error("Error during Media RSS Autoupdate:", err);
      WebSocketsServerService.Instance.updateData({
        ...WebSocketsServerService.Instance.webSocketData,
        rssAutoUpdateMessage: "Error during Media RSS Autoupdate.",
      });
      resolve();
    });
  })

  private doAllUpdates = async() => {
    this.favoritesYoutubeMessages = [];
    let webNumberOfMessagesWithLinks = ConfigurationService.Instance.rssConfig.normalWebNumberOfMessagesWithLinks;
    if (!this.currentCompleteData || this.currentCompleteData.messagesBlog.length === 0) {
      webNumberOfMessagesWithLinks = ConfigurationService.Instance.rssConfig.initialWebNumberOfMessagesWithLinks;
    }

    let messages: string[];
    
    const messagesMasto = await this.updateMedia(this.commands.onCommandMasto, webNumberOfMessagesWithLinks);

    const messagesBlog = await this.updateMedia(this.commands.onCommandBlog, webNumberOfMessagesWithLinks);
    
    const messagesNews = await this.updateMedia(this.commands.onCommandNews, webNumberOfMessagesWithLinks);

    const messagesYoutube: {tag: string; content: string[]}[] = [];
    for (const tag of ConfigurationService.Instance.rssConfig.optionTagsYoutube) {
      messages = await this.updateMedia(this.commands.onCommandYoutube, webNumberOfMessagesWithLinks, tag, true);
      messagesYoutube.push({
        tag,
        content: messages,
      });
    }

    let waitMe = await this.saveYoutubeFavorites();

    waitMe = await this.saveMedia(messagesMasto, messagesBlog, messagesNews, messagesYoutube);
  };

  private filterDuplicateUrls = (messages: string[]): string[] => {
    if (messages.length === 0) {
      return messages;
    }
    
    const messagesFixed = messages.filter(message => message && message !== '' && message.split('\n').length >= 1);

    const messagesWithoutDuplicates: string[] = [];

    for (const message of messagesFixed) {
      const title = message.split('\n')[3];
      if (!messagesWithoutDuplicates.some(existingMessage => existingMessage.split('\n')[3] === title)) {
        messagesWithoutDuplicates.push(message);
      }
    }

    return messagesWithoutDuplicates;
  }

  private sortMessagesByDate = (messages: string[]): string[] =>  messages.slice().sort((a, b) => {
    const dateLineA = a.split('\n')[1] || '';
    const dateLineB = b.split('\n')[1] || '';

    const dateStrA = dateLineA.split(' - ').pop() || '';
    const dateStrB = dateLineB.split(' - ').pop() || '';

    const dateA = new Date(dateStrA);
    const dateB = new Date(dateStrB);

    return dateA.getTime() - dateB.getTime();
  });

  private saveYoutubeFavorites = async (): Promise<boolean> => {
    this.favoritesYoutubeMessages = this.youtubeFavoriteCompleteData.concat(this.favoritesYoutubeMessages);
    this.favoritesYoutubeMessages = this.filterDuplicateUrls(this.favoritesYoutubeMessages);
    this.favoritesYoutubeMessages = this.favoritesYoutubeMessages.filter(
      (item: any, index: number) => this.favoritesYoutubeMessages.indexOf(item) === index
    );

    if (this.favoritesYoutubeMessages.length > ConfigurationService.Instance.rssConfig.numMaxMessagesToSave) {
      this.favoritesYoutubeMessages = this.favoritesYoutubeMessages.slice(
        this.favoritesYoutubeMessages.length - ConfigurationService.Instance.rssConfig.numMaxMessagesToSave
      );
    }

    this.favoritesYoutubeMessages = this.sortMessagesByDate(this.favoritesYoutubeMessages);

    this.youtubeFavoriteCompleteData = this.favoritesYoutubeMessages;
    return true;
  };

  private saveMedia = async (messagesMasto: string[], messagesBlog: string[], messagesNewsFeed: string[],  messagesYoutube: {tag: string; content: string[]}[]): Promise<boolean> => {
    const data = this.currentCompleteData;
    data.messagesMasto = data.messagesMasto.concat(messagesMasto);
    // Remove duplicates from messagesMasto
    data.messagesMasto = data.messagesMasto.filter((item: any, index: number) => data.messagesMasto.indexOf(item) === index);
    // Limit the number of messages to save
    if (data.messagesMasto.length > ConfigurationService.Instance.rssConfig.numMaxMessagesToSave) {
      data.messagesMasto = data.messagesMasto.slice(data.messagesMasto.length - ConfigurationService.Instance.rssConfig.numMaxMessagesToSave);
    }
    
    data.messagesBlog = data.messagesBlog.concat(messagesBlog);
    data.messagesBlog = data.messagesBlog.filter((item: any, index: number) => data.messagesBlog.indexOf(item) === index);
    if (data.messagesBlog.length > ConfigurationService.Instance.rssConfig.numMaxMessagesToSave) {
      data.messagesBlog = data.messagesBlog.slice(data.messagesBlog.length - ConfigurationService.Instance.rssConfig.numMaxMessagesToSave);
    }

    if (!data.messagesNewsFeed || data.messagesNewsFeed.length === 0) {
      data.messagesNewsFeed = messagesNewsFeed;
    } else {
      data.messagesNewsFeed = data.messagesNewsFeed.concat(messagesNewsFeed);
      data.messagesNewsFeed = data.messagesNewsFeed.filter((item: any, index: number) => data.messagesNewsFeed.indexOf(item) === index);
      if (data.messagesNewsFeed.length > ConfigurationService.Instance.rssConfig.numMaxMessagesToSave) {
        data.messagesNewsFeed = data.messagesNewsFeed.slice(data.messagesNewsFeed.length - ConfigurationService.Instance.rssConfig.numMaxMessagesToSave);
      }
    }
    
    data.messagesYoutube = data.messagesYoutube || [];
    for (const youtube of messagesYoutube) {
      const tag = youtube.tag;
      let indexTag = data.messagesYoutube.findIndex((item: any) => item.tag === tag);
      if (indexTag === -1) {
        data.messagesYoutube.push({ 
          tag: tag,
          content: [],
        });
        indexTag = data.messagesYoutube.length - 1;
      }
      data.messagesYoutube[indexTag].content = data.messagesYoutube[indexTag].content.concat(youtube.content);
      data.messagesYoutube[indexTag].content = this.filterDuplicateUrls(data.messagesYoutube[indexTag].content);
      data.messagesYoutube[indexTag].content = data.messagesYoutube[indexTag].content.filter(
        (item: any, index: number) => data.messagesYoutube[indexTag].content.indexOf(item) === index
      );
      if (data.messagesYoutube[indexTag].content.length > ConfigurationService.Instance.rssConfig.numMaxMessagesToSave) {
        data.messagesYoutube[indexTag].content = data.messagesYoutube[indexTag].content.slice(
          data.messagesYoutube[indexTag].content.length - ConfigurationService.Instance.rssConfig.numMaxMessagesToSave
        );
      }
    }

    this.currentCompleteData = data;
    return true;
  };


  private updateMedia = (
    rssCommand: () => Promise<string[]>,
    webNumberOfMessagesWithLinks: number,
    youtubeTag = "null",
    isYoutubeRSS = false,
  ): Promise<string[]> => new Promise<string[]>(resolve => {
    ConfigurationService.Instance.twitterData.numberOfMessages = webNumberOfMessagesWithLinks;
    if (isYoutubeRSS) {
      YoutubeRSSUtils.setTag(youtubeTag);
    }

    rssCommand().then(messagesToSend => {
        if (isYoutubeRSS) {
          // Remove shorts videos.
          YoutubeRSSUtils.filterYoutubeShorts(webNumberOfMessagesWithLinks).then(messages => {
            this.favoritesYoutubeMessages = this.favoritesYoutubeMessages.concat(YoutubeRSSUtils.favoritesYoutubeMessages); 
            resolve(messages);
          });
        } else {
          // console.log("messagesToSend", messagesToSend)
          const messages = messagesToSend.slice(messagesToSend.length - webNumberOfMessagesWithLinks);
          resolve(messages);
        }
    });
  });

  
  static getMediaFileContent = async (type: MediaType, tag: string = ''): Promise<string[]> => {
    try {
      const data = MediaRSSAutoupdate.instance.currentCompleteData;
      if (type === 'youtube' && tag) {
        let indexTag = data.messagesYoutube.findIndex((item: any) => item.tag === tag);
        if (indexTag === -1) {
          return [];
        }
        return [...(data.messagesYoutube[indexTag].content || [])];
      }
      if (type === 'mastodon') {
        return [...(data.messagesMasto || [])];
      }
      if (type === 'blog') {
        return [...(data.messagesBlog || [])];
      }
      if (type === 'news') {
        return [...(data.messagesNewsFeed || [])];
      }
    } catch (error) {
      console.error(`Error reading media file ${mediaFilePath}:`, error);
      return [];
    }
    return [];
  };

  
  static getMastoFileContent = async (): Promise<string[]> => MediaRSSAutoupdate.getMediaFileContent('mastodon');
  static getYoutubeFileContent = (tag: string = '') => (): Promise<string[]> => MediaRSSAutoupdate.getMediaFileContent('youtube', tag);
  static getBlogFileContent = async (): Promise<string[]> => MediaRSSAutoupdate.getMediaFileContent('blog');
  static getNewsFileContent = async (): Promise<string[]> => MediaRSSAutoupdate.getMediaFileContent('news');
  
  static getFavoritesYoutubeFileContent = async (amount: number): Promise<string[]> => {
    try {
      let messages = [...MediaRSSAutoupdate.instance.youtubeFavoriteCompleteData];
      messages = messages.reverse();
      if (messages.length > amount) {
        messages = messages.slice(0, amount);
      }
      return messages;
    } catch (error) {
      return [];
    }
  };
}
