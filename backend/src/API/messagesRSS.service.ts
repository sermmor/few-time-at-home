import { BlogRSSMessageList } from "../blogRSS";
import { NewsRSSMessageList } from "../blogRSS/newsRSSMessageList";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { MastodonRSSMessageList } from "../mastodonRSS";
import { NitterRSSMessageList } from "../nitterRSS";
import { YoutubeRSSMessageList } from "../youtubeRSS";
import { ConfigurationService } from "./configuration.service";

export class ChannelMediaRSSCollectionExport {
  static Instance: ChannelMediaRSSCollectionExport;
  constructor(public channelMediaCollection: ChannelMediaRSSCollection) {
    ChannelMediaRSSCollectionExport.Instance = this;
  }
}

export interface ChannelMediaRSSCollection {
    nitterRSS: NitterRSSMessageList,
    mastodonRSS: MastodonRSSMessageList,
    blogRSS: BlogRSSMessageList,
    newsRSS: NewsRSSMessageList,
    youtubeRSS: YoutubeRSSMessageList,
}

export interface TelegramBotCommand {
    onCommandAll: () => Promise<string[]>;
    onCommandNitter: () => Promise<string[]>;
    onCommandMasto: () => Promise<string[]>;
    onCommandBlog: () => Promise<string[]>;
    onCommandNews: () => Promise<string[]>;
    onCommandYoutube: () => Promise<string[]>;
}

export const getAllMessageCommands = (channelCollections: ChannelMediaRSSCollection): TelegramBotCommand => ({
    onCommandAll: getAllMessages(channelCollections),
    onCommandMasto: getAllMessagesChannelMediaRSS(channelCollections.mastodonRSS),
    onCommandNitter: getAllMessagesChannelMediaRSS(channelCollections.nitterRSS),
    onCommandBlog: getAllMessagesChannelMediaRSS(channelCollections.blogRSS),
    onCommandNews: getAllMessagesChannelMediaRSS(channelCollections.newsRSS),
    onCommandYoutube: getAllMessagesChannelMediaRSS(channelCollections.youtubeRSS),

});

const getAllMessages = ({blogRSS, mastodonRSS, nitterRSS, youtubeRSS, newsRSS}: ChannelMediaRSSCollection) => (): Promise<string[]> => new Promise<string[]>(
    resolve => ConfigurationService.Instance.showNitterRSSInAll ? nitterRSS.updateRSSList().then(() =>
        mastodonRSS.updateRSSList().then(() => {
          youtubeRSS.updateRSSList().then(() => {
            blogRSS.updateRSSList().then(() => {
              newsRSS.updateRSSList().then(() => {
                  resolve(ChannelMediaRSSMessageList.formatListMessagesToTelegramTemplate([
                      nitterRSS,
                      mastodonRSS,
                      youtubeRSS,
                      blogRSS,
                      newsRSS,
                  ]));
              })
            })
          })
        }))
      : mastodonRSS.updateRSSList().then(() => {
        youtubeRSS.updateRSSList().then(() => {
          blogRSS.updateRSSList().then(() => {
            newsRSS.updateRSSList().then(() => {
                resolve(ChannelMediaRSSMessageList.formatListMessagesToTelegramTemplate([
                    nitterRSS,
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
// const getAllMessages = ({blogRSS, mastodonRSS, youtubeRSS}: ChannelMediaRSSCollection) => (): Promise<string[]> => new Promise<string[]>(
//     resolve => mastodonRSS.updateRSSList().then(() => {
//           youtubeRSS.updateRSSList().then(() => {
//             blogRSS.updateRSSList().then(() => {
//                 resolve(ChannelMediaRSSMessageList.formatListMessagesToTelegramTemplate([
//                     mastodonRSS,
//                     youtubeRSS,
//                     blogRSS
//                 ]));
//             })
//         })}));

const getAllMessagesChannelMediaRSS = (channelMediaRSS: ChannelMediaRSSMessageList) => (): Promise<string[]> => new Promise<string[]>(
    resolve => channelMediaRSS.updateRSSList().then(() => {
            resolve(channelMediaRSS.formatMessagesToTelegramTemplate());
        }));
