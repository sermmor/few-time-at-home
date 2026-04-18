import { BlogRSSMessageList } from "../blogRSS";
import { NewsRSSMessageList } from "../blogRSS/newsRSSMessageList";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { MastodonRSSMessageList } from "../mastodonRSS";
import { YoutubeRSSMessageList } from "../youtubeRSS";

export class ChannelMediaRSSCollectionExport {
  static Instance: ChannelMediaRSSCollectionExport;
  constructor(public channelMediaCollection: ChannelMediaRSSCollection) {
    ChannelMediaRSSCollectionExport.Instance = this;
  }
}

export interface ChannelMediaRSSCollection {
    mastodonRSS: MastodonRSSMessageList,
    blogRSS: BlogRSSMessageList,
    newsRSS: NewsRSSMessageList,
    youtubeRSS: YoutubeRSSMessageList,
}

export interface TelegramBotCommand {
    onCommandAll: () => Promise<string[]>;
    onCommandMasto: () => Promise<string[]>;
    onCommandBlog: () => Promise<string[]>;
    onCommandNews: () => Promise<string[]>;
    onCommandYoutube: () => Promise<string[]>;
}

export const getAllMessageCommands = (channelCollections: ChannelMediaRSSCollection): TelegramBotCommand => ({
    onCommandAll: getAllMessages(channelCollections),
    onCommandMasto: getAllMessagesChannelMediaRSS(channelCollections.mastodonRSS),
    onCommandBlog: getAllMessagesChannelMediaRSS(channelCollections.blogRSS),
    onCommandNews: getAllMessagesChannelMediaRSS(channelCollections.newsRSS),
    onCommandYoutube: getAllMessagesChannelMediaRSS(channelCollections.youtubeRSS),
});

const getAllMessages = ({blogRSS, mastodonRSS, youtubeRSS, newsRSS}: ChannelMediaRSSCollection) => (): Promise<string[]> => new Promise<string[]>(
    resolve => mastodonRSS.updateRSSList().then(() => {
      youtubeRSS.updateRSSList().then(() => {
        blogRSS.updateRSSList().then(() => {
          newsRSS.updateRSSList().then(() => {
            resolve(ChannelMediaRSSMessageList.formatListMessagesToTelegramTemplate([
                mastodonRSS,
                youtubeRSS,
                blogRSS,
                newsRSS,
            ]));
          })
        })
      })
    })
  );

const getAllMessagesChannelMediaRSS = (channelMediaRSS: ChannelMediaRSSMessageList) => (): Promise<string[]> => new Promise<string[]>(
    resolve => channelMediaRSS.updateRSSList().then(() => {
            resolve(channelMediaRSS.formatMessagesToTelegramTemplate());
        }));
