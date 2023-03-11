import { extract, ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessage } from "../channelMediaRSS";
import { cleanLinksInMessage, filterRSSMessages, updateRSSListOneByOne } from "../channelMediaRSS/channelMediaRSSWorker";
import { ChannelMediaRSSWorkerData } from "../channelMediaRSS/channelMediaRSSWorkerData";
import { parseFromNitterDateStringToDateObject } from "../utils";
import { WorkerChild } from "../workerModule/workersManager";
import { MastodonRSSWorkerData } from "./mastodonRSSWorkerData";


const updateRSS = (
    data: ChannelMediaRSSWorkerData,
    endpoint: string,
    nitterUrlIndex: number = 0,
    currentTry = 4
): Promise<ChannelMediaRSSMessage[]> => {
    const { rssOptions, mastoInstanceList } = <MastodonRSSWorkerData> data;
    return new Promise<ChannelMediaRSSMessage[]>(resolve =>
        extract(`${endpoint}`, rssOptions).then((data) => {
            const currentMessages: ChannelMediaRSSMessage[] = filterRSSMessages(
                cleanMastoLinksInMessages(
                    mapRSSMastodonPostsToMessages((data)), mastoInstanceList
                )
            );
            console.log(`${endpoint}  ${currentMessages.length}`);
            resolve(currentMessages);
        }).catch(() => {
            if (currentTry > 0) {
                setTimeout(() => updateRSS(data, endpoint, nitterUrlIndex, currentTry - 1), 100);
            } else {
                console.error(`Mastodon profile ${endpoint} is broken or deleted!`);
                resolve([]);
            }
    }));
}

const mapRSSMastodonPostsToMessages = (data: any): ChannelMediaRSSMessage[] => data.item.map((rssMessage: any) => ({
    title: rssMessage.title,
    author: rssMessage.link.split('/')[3],
    date: parseFromNitterDateStringToDateObject(rssMessage.pubDate),
    content: rssMessage.description,
    originalLink: rssMessage.link,
}));

const cleanMastoLinksInMessages = (currentMessages: ChannelMediaRSSMessage[], mastoInstances: string[]): ChannelMediaRSSMessage[] => 
    currentMessages.map(message => {
        const mastoUrl = mastoInstances.find(instance => message.originalLink.indexOf(instance) > 0);
        return cleanLinksInMessage(message, `<a href=\"https://${mastoUrl}`);
    });

(function () {
    const worker = new WorkerChild();
    
    updateRSSListOneByOne(
        worker.dataGettedFromParent,
        [],
        worker.dataGettedFromParent.urlProfiles.length,
        updateRSS,
        (allMessages) => worker.gatherSender(allMessages),
    );
})();

