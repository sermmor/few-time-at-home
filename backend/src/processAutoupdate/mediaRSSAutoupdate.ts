import { ConfigurationService, TelegramBotCommand } from "../API";
import { readJSONFile, saveInAFilePromise } from "../utils";
import { WebSocketsServerService } from "../webSockets/webSocketsServer.service";
import { YoutubeRSSUtils } from "../youtubeRSS/youtubeRSSUtils";
import * as fs from "fs/promises";

type FileMediaContentType = {messagesMasto: string[], messagesBlog: string[], messagesYoutube: {tag: string; content: string[]}[]};

const mediaFilePath = 'data/config/media/mediaFilesContent.json';
const favoriteYoutubeFilePath = 'data/config/media/youtubeFavoritesArchive.json'; // TODO: LLEGA DESORDENADA POR FECHA, ORDENAR.

export type MediaType = 'youtube' | 'mastodon' | 'blog';

export class MediaRSSAutoupdate {
  public static instance: MediaRSSAutoupdate;

  private favoritesYoutubeMessages: string[] = [];
  private lastUpdateMilliseconds: number = 0;

  constructor(private commands: TelegramBotCommand) {
    MediaRSSAutoupdate.instance = this;
    this.lastUpdateMilliseconds = Date.now();
    if (ConfigurationService.Instance.rssConfig.updateAtStartApp) {
      setTimeout(() => this.update(), 0);
    }
    setInterval(() => {
      this.lastUpdateMilliseconds = Date.now();
      this.update();
    }, ConfigurationService.Instance.rssConfig.autoUpdateTimeInSeconds * 1000);
  }

  update = (): Promise<void> => new Promise<void>(resolve => {
    console.log("Starting Media RSS Autoupdate...");
    WebSocketsServerService.Instance.updateData({
      rssAutoUpdateMessage: "Starting Media RSS Autoupdate...",
    });
    this.doAllUpdates().then(() => {
      const nextUpdateMessage = `Media RSS Autoupdate completed successfully. Next update at ${
        new Date(this.lastUpdateMilliseconds + ConfigurationService.Instance.rssConfig.autoUpdateTimeInSeconds * 1000).toLocaleString()
      }`
      console.log(nextUpdateMessage);
      WebSocketsServerService.Instance.updateData({
        rssAutoUpdateMessage: nextUpdateMessage,
      });
      resolve();
    }).catch(err => {
      console.error("Error during Media RSS Autoupdate:", err);
      WebSocketsServerService.Instance.updateData({
        rssAutoUpdateMessage: "Error during Media RSS Autoupdate.",
      });
      resolve();
    });
  })

  private doAllUpdates = async() => {
    this.favoritesYoutubeMessages = [];
    let webNumberOfMessagesWithLinks = ConfigurationService.Instance.rssConfig.initialWebNumberOfMessagesWithLinks;
    try {
      await fs.access(mediaFilePath);
      webNumberOfMessagesWithLinks = ConfigurationService.Instance.rssConfig.normalWebNumberOfMessagesWithLinks;
    } catch {
      webNumberOfMessagesWithLinks = ConfigurationService.Instance.rssConfig.initialWebNumberOfMessagesWithLinks;
    }

    let messages: string[];
    
    const messagesMasto = await this.updateMedia(this.commands.onCommandMasto, webNumberOfMessagesWithLinks);

    const messagesBlog = await this.updateMedia(this.commands.onCommandBlog, webNumberOfMessagesWithLinks);

    const messagesYoutube: {tag: string; content: string[]}[] = [];
    for (const tag of ConfigurationService.Instance.rssConfig.optionTagsYoutube) {
      messages = await this.updateMedia(this.commands.onCommandYoutube, webNumberOfMessagesWithLinks, tag, true);
      messagesYoutube.push({
        tag,
        content: messages,
      });
    }

    let waitMe = await this.saveYoutubeFavorites();

    waitMe = await this.saveMedia(messagesMasto, messagesBlog, messagesYoutube);
  };

  private filterDuplicateTitles = (messages: string[]): string[] => {
    if (messages.length === 0) {
      return messages;
    }
    
    const messagesFixed = messages.filter(message => message && message !== '' && message.split('\n').length >= 1);

    const messagesWithoutDuplicates: string[] = [];

    for (const message of messagesFixed) {
      const title = message.split('\n')[0];
      if (!messagesWithoutDuplicates.some(existingMessage => existingMessage.split('\n')[0] === title)) {
        messagesWithoutDuplicates.push(message);
      }
    }

    return messagesWithoutDuplicates;
  }

  private saveYoutubeFavorites = async (): Promise<boolean> => {
    const dataOrVoid: string[] | string = await readJSONFile(favoriteYoutubeFilePath, "[]");
    const data: string[] = dataOrVoid === "[]" ? [] : dataOrVoid as string[];

    this.favoritesYoutubeMessages = this.favoritesYoutubeMessages.concat(data);
    this.favoritesYoutubeMessages = this.filterDuplicateTitles(this.favoritesYoutubeMessages);
    this.favoritesYoutubeMessages = this.favoritesYoutubeMessages.filter(
      (item: any, index: number) => this.favoritesYoutubeMessages.indexOf(item) === index
    );

    if (this.favoritesYoutubeMessages.length > ConfigurationService.Instance.rssConfig.numMaxMessagesToSave) {
      this.favoritesYoutubeMessages = this.favoritesYoutubeMessages.slice(
        this.favoritesYoutubeMessages.length - ConfigurationService.Instance.rssConfig.numMaxMessagesToSave
      );
    }

    await saveInAFilePromise(JSON.stringify(this.favoritesYoutubeMessages, null, 2), favoriteYoutubeFilePath);
    return true;
  };

  private saveMedia = async (messagesMasto: string[], messagesBlog: string[], messagesYoutube: {tag: string; content: string[]}[]): Promise<boolean> => {
    const fileVoid = "{messagesMasto: [], messagesBlog: [], messagesYoutube: []}";
    const dataOrVoid: FileMediaContentType | string = await readJSONFile(
      mediaFilePath,
      "{messagesMasto: [], messagesBlog: [], messagesYoutube: []}"
    );
    const data: FileMediaContentType = dataOrVoid === fileVoid ?
     {messagesMasto: [], messagesBlog: [], messagesYoutube: []} : dataOrVoid as FileMediaContentType;

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
      data.messagesYoutube[indexTag].content = this.filterDuplicateTitles(data.messagesYoutube[indexTag].content);
      data.messagesYoutube[indexTag].content = data.messagesYoutube[indexTag].content.filter(
        (item: any, index: number) => data.messagesYoutube[indexTag].content.indexOf(item) === index
      );
      if (data.messagesYoutube[indexTag].content.length > ConfigurationService.Instance.rssConfig.numMaxMessagesToSave) {
        data.messagesYoutube[indexTag].content = data.messagesYoutube[indexTag].content.slice(
          data.messagesYoutube[indexTag].content.length - ConfigurationService.Instance.rssConfig.numMaxMessagesToSave
        );
      }
    }
    await saveInAFilePromise(JSON.stringify(data, null, 2), mediaFilePath);
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
          const messages = messagesToSend.slice(messagesToSend.length - webNumberOfMessagesWithLinks);
          resolve(messages);
        }
    });
  });

  
  static getMediaFileContent = async (type: MediaType, tag: string = ''): Promise<string[]> => {
    try {
      const fileVoid = "{messagesMasto: [], messagesBlog: [], messagesYoutube: []}";
      let data = await readJSONFile(mediaFilePath, fileVoid);
      data = data === fileVoid ? { messagesMasto: [], messagesBlog: [], messagesYoutube: [] } : data;
      if (type === 'youtube' && tag) {
        let indexTag = data.messagesYoutube.findIndex((item: any) => item.tag === tag);
        if (indexTag === -1) {
          return [];
        }
        return data.messagesYoutube[indexTag].content || [];
      }
      if (type === 'mastodon') {
        return data.messagesMasto || [];
      }
      if (type === 'blog') {
        return data.messagesBlog || [];
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
  
  static getFavoritesYoutubeFileContent = async (amount: number): Promise<string[]> => {
    try {
      const dataOrVoid: string[] | string = await readJSONFile(favoriteYoutubeFilePath, "[]");
      let messages = dataOrVoid === "[]" ? [] : (dataOrVoid as string[]);
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
