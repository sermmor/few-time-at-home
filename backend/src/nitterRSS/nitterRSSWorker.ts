import { extract, ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessage, ChannelMediaRSSWorkerData, cleanLinksInMessage, filterRSSMessages, updateRSSListOneByOne } from "../channelMediaRSS";
import { parseFromNitterDateStringToDateObject } from "../utils";
import { WorkerChild } from "../workerModule/workersManager";
import { NitterRSSWorkerData } from "./nitterRSSWorkerData";

const updateRSS = (
    data: ChannelMediaRSSWorkerData,
    endpoint: string,
    nitterUrlIndex: number = 0,
    currentTry = 4
): Promise<ChannelMediaRSSMessage[]> => {
    console.log(`Extracting: ${endpoint}`);

    const { nitterInstancesList, rssOptions } = <NitterRSSWorkerData> data;
    return new Promise<ChannelMediaRSSMessage[]>(resolve =>
        extract(`${nitterInstancesList[nitterUrlIndex]}${endpoint}`, rssOptions).then((data) => {
            const currentMessages: ChannelMediaRSSMessage[] = filterRSSMessages(
                cleanNitterLinksInMessages(
                    mapRSSNitterPostsToMessages(data), nitterInstancesList[nitterUrlIndex]
                )
            );
            console.log(`${nitterInstancesList[nitterUrlIndex]}${endpoint}  ${currentMessages.length}`);
            resolve(currentMessages);
        }).catch(() => {
            if (currentTry > 0) {
                setTimeout(() => updateRSS(data, endpoint, nitterUrlIndex, currentTry - 1).then(data => resolve(data)), 100);
            } else if (nitterUrlIndex < nitterInstancesList.length) {
                updateRSS(data, endpoint, nitterUrlIndex + 1, currentTry).then(data => resolve(data));
            } else {
                console.error(`Nitter profile ${endpoint} is broken or deleted!`);
                resolve([]);
            }
    }));
}

const mapRSSNitterPostsToMessages = (data: any): ChannelMediaRSSMessage[] => data.item.map((rssMessage: any) => ({
    title: '',
    author: rssMessage['dc:creator'],
    date: parseFromNitterDateStringToDateObject(rssMessage.pubDate),
    content: rssMessage.description,
    originalLink: rssMessage.link,
}));

const cleanNitterLinksInMessages = (currentMessages: ChannelMediaRSSMessage[], nitterUrl: string): ChannelMediaRSSMessage[] =>
    currentMessages.map(message => cleanLinksInMessage(message, `<a href=\"${nitterUrl}`));

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

