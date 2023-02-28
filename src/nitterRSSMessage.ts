import { extract, ReaderOptions } from "@extractus/feed-extractor";
import { NitterRSSMessage } from "./nitterRSSData";
import { parseFromNitterDateStringToDateObject } from "./utils";

export class NitterRSSMessageList {
    private urlProfiles: string[];
    private nitterInstancesList: string;

    constructor(
        userData: any,
        private rssOptions?: ReaderOptions,
        public allMessages: NitterRSSMessage[] = [],
    ) {

        this.urlProfiles = userData.nitterRssUsersList.map((user: any) => `/${user}/rss`);
        this.nitterInstancesList = userData.nitterInstancesList;
    }

    updateRSSList(): Promise<NitterRSSMessageList> {
        let messagesWaiting = this.urlProfiles.length;
        let messagesToConcat: NitterRSSMessage[][] = [];
        this.allMessages = [];

        return new Promise<NitterRSSMessageList>(resolve => {
            // url example: `/redunecontacto/rss` 
            this.urlProfiles.forEach((url, index) => setTimeout(() => this.updateRSS(url).then((currentMessages: NitterRSSMessage[]) => {
                messagesWaiting--;
                messagesToConcat.push(currentMessages);
                if (messagesWaiting <= 0) {
                    this.allMessages = messagesToConcat
                        .reduce((previous, current) => previous.concat(current))
                        .sort((messageA, messageB) => messageA.date > messageB.date ? 1 : -1);
                    resolve(this);
                }
            }), index * 100)); // 0.1 seconds of delay.
        });
    }

    formatMessagesToTelegramTemplate = (): string[] => this.allMessages.map(message =>
        `${message.author} - ${message.date.toDateString()}
        ${message.content}
        ${message.originalLink}`
    );

    private updateRSS = (endpoint: string, nitterUrlIndex: number = 0, currentTry = 4): Promise<NitterRSSMessage[]> => {
        return new Promise<NitterRSSMessage[]>(resolve =>
            extract(`${this.nitterInstancesList[nitterUrlIndex]}${endpoint}`, this.rssOptions).then((data) => {
                const currentMessages: NitterRSSMessage[] = this.filterNitterRSSMessages(
                    this.cleanNitterLinksInMessages(
                        this.mapRSSNitterPostsToMessages(data), this.nitterInstancesList[nitterUrlIndex]
                    )
                );
                resolve(currentMessages);
            }).catch(() => {
                if (currentTry > 0) {
                    setTimeout(() => this.updateRSS(endpoint, nitterUrlIndex, currentTry - 1), 100);
                } else if (nitterUrlIndex < this.nitterInstancesList.length) {
                    this.updateRSS(endpoint, nitterUrlIndex + 1, currentTry);
                } else {
                    console.error(`Nitter profile ${endpoint} is broken or deleted!`);
                }
        }));
    }

    private mapRSSNitterPostsToMessages = (data: any): NitterRSSMessage[] => data.item.map((rssMessage: any) => ({
        title: rssMessage.title,
        author: rssMessage['dc:creator'],
        date: parseFromNitterDateStringToDateObject(rssMessage.pubDate),
        content: rssMessage.description,
        originalLink: rssMessage.link,
    }));
    
    private cleanNitterLinksInMessages = (currentMessages: NitterRSSMessage[], nitterUrl: string): NitterRSSMessage[] => currentMessages.map(message => {
        const urlToClean = `<a href=\"${nitterUrl}`
        const contentSplitted = message.content.split(urlToClean);
        const cleanedContentSplitter = contentSplitted.map(pieceContent => {
            const end = pieceContent.indexOf('</a>');
            return (pieceContent.charAt(0) === '/' && end > -1) ? pieceContent.substring(end + 4) : pieceContent;
        });
        return {
            ...message,
            content: cleanedContentSplitter.join(''),
        };
    });
    
    private filterNitterRSSMessages = (currentMessages: NitterRSSMessage[]): NitterRSSMessage[]  => currentMessages.filter(
        ({ content }: NitterRSSMessage) => content.indexOf('<a href=\"') >= 0
    );
}
