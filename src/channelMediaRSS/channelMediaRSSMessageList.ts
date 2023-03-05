import { ChannelMediaRSSMessage } from "./channelMediaRSSData";

export class ChannelMediaRSSMessageList {
    public allMessages: ChannelMediaRSSMessage[];

    constructor() {
        this.allMessages = [];
    }

    formatMessagesToTelegramTemplate = (): string[] => this.allMessages.map(message =>
        `${message.author} - ${message.date.toDateString()}
        ${message.content}
        ${message.originalLink}`
    );

    static formatListMessagesToTelegramTemplate = (channelList: ChannelMediaRSSMessageList[]): string[] => {
        const allMessages = channelList
            .map(channel => channel.allMessages)
            .reduce((previous, current) => previous.concat(current))
            .sort((messageA: any, messageB: any) => messageA.date > messageB.date ? 1 : -1);

        return allMessages.map(message =>
            `${message.author} - ${message.date.toDateString()}
            ${message.content}
            ${message.originalLink}`
        );
    }
}