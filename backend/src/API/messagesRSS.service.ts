import { BlogRSSMessageList } from "../blogRSS";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { MastodonRSSMessageList } from "../mastodonRSS";
import { NitterRSSMessageList } from "../nitterRSS";
import { YoutubeRSSMessageList } from "../youtubeRSS";

export interface ChannelMediaRSSCollection {
    nitterRSS: NitterRSSMessageList,
    mastodonRSS: MastodonRSSMessageList,
    blogRSS: BlogRSSMessageList,
    youtubeRSS: YoutubeRSSMessageList,
}

export interface TelegramBotCommand {
    onCommandAll: () => Promise<string[]>;
    onCommandNitter: () => Promise<string[]>;
    onCommandMasto: () => Promise<string[]>;
    onCommandBlog: () => Promise<string[]>;
    onCommandYoutube: () => Promise<string[]>;
}

export const getAllMessageCommands = (channelCollections: ChannelMediaRSSCollection): TelegramBotCommand => ({
    onCommandAll: getAllMessages(channelCollections),
    onCommandMasto: getAllMessagesChannelMediaRSS(channelCollections.mastodonRSS),
    onCommandNitter: getAllMessagesChannelMediaRSS(channelCollections.nitterRSS),
    onCommandBlog: getAllMessagesChannelMediaRSS(channelCollections.blogRSS),
    onCommandYoutube: getAllMessagesChannelMediaRSS(channelCollections.youtubeRSS),

});

const getAllMessages = ({blogRSS, mastodonRSS, nitterRSS, youtubeRSS}: ChannelMediaRSSCollection) => (): Promise<string[]> => new Promise<string[]>(
    resolve => nitterRSS.updateRSSList().then(() =>
        mastodonRSS.updateRSSList().then(() => {
          youtubeRSS.updateRSSList().then(() => {
            blogRSS.updateRSSList().then(() => {
                resolve(ChannelMediaRSSMessageList.formatListMessagesToTelegramTemplate([
                    nitterRSS,
                    mastodonRSS,
                    blogRSS
                ]));
            })
          })
        })));

const getAllMessagesChannelMediaRSS = (channelMediaRSS: ChannelMediaRSSMessageList) => (): Promise<string[]> => new Promise<string[]>(
    resolve => channelMediaRSS.updateRSSList().then(() => {
            resolve(channelMediaRSS.formatMessagesToTelegramTemplate());
        }));