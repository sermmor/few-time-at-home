import { extract, ReaderOptions } from "@extractus/feed-extractor";
import { parseFromNitterDateStringToDateObject } from "../utils";
import { WorkerChild } from "../workerModule/workersManager";
import { NitterRSSMessage } from "./nitterRSSData";
import { NitterRSSWorkerData } from "./nitterRSSWorkerData";

const updateRSSListOneByOne = (
    data: NitterRSSWorkerData,
    messagesToConcat: NitterRSSMessage[][],
    rssUrlWaiting: number,
    onFinished: (allMessages: NitterRSSMessage[]) => void,
) => {

    if (rssUrlWaiting > 0) {
        // url example: `/redunecontacto/rss` 
        const { urlProfiles } = data;
        const url = urlProfiles[rssUrlWaiting - 1];
        updateRSS(data, url).then((currentMessages: NitterRSSMessage[]) => {
            messagesToConcat.push(currentMessages);
            setTimeout(() => updateRSSListOneByOne(data, messagesToConcat, rssUrlWaiting - 1, onFinished), 0);
        });
    } else {
        const allMessages = messagesToConcat
            .reduce((previous, current) => previous.concat(current))
            .sort((messageA, messageB) => messageA.date > messageB.date ? 1 : -1);
        onFinished(allMessages);
    }
}

const updateRSS = (
    data: NitterRSSWorkerData,
    endpoint: string,
    nitterUrlIndex: number = 0,
    currentTry = 4
): Promise<NitterRSSMessage[]> => {
    const { nitterInstancesList, rssOptions } = data;
    return new Promise<NitterRSSMessage[]>(resolve =>
        extract(`${nitterInstancesList[nitterUrlIndex]}${endpoint}`, rssOptions).then((data) => {
            const currentMessages: NitterRSSMessage[] = filterNitterRSSMessages(
                cleanNitterLinksInMessages(
                    mapRSSNitterPostsToMessages(data), nitterInstancesList[nitterUrlIndex]
                )
            );
            console.log(`${nitterInstancesList[nitterUrlIndex]}${endpoint}  ${currentMessages.length}`);
            resolve(currentMessages);
        }).catch(() => {
            if (currentTry > 0) {
                setTimeout(() => updateRSS(data, endpoint, nitterUrlIndex, currentTry - 1), 100);
            } else if (nitterUrlIndex < nitterInstancesList.length) {
                updateRSS(data, endpoint, nitterUrlIndex + 1, currentTry);
            } else {
                console.error(`Nitter profile ${endpoint} is broken or deleted!`);
            }
    }));
}

const mapRSSNitterPostsToMessages = (data: any): NitterRSSMessage[] => data.item.map((rssMessage: any) => ({
    title: rssMessage.title,
    author: rssMessage['dc:creator'],
    date: parseFromNitterDateStringToDateObject(rssMessage.pubDate),
    content: rssMessage.description,
    originalLink: rssMessage.link,
}));

const cleanNitterLinksInMessages = (currentMessages: NitterRSSMessage[], nitterUrl: string): NitterRSSMessage[] => currentMessages.map(message => {
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

const filterNitterRSSMessages = (currentMessages: NitterRSSMessage[]): NitterRSSMessage[]  => currentMessages.filter(
    ({ content }: NitterRSSMessage) => content.indexOf('<a href=\"') >= 0
);

(function () {
    const worker = new WorkerChild();
    
    updateRSSListOneByOne(
        worker.dataGettedFromParent,
        [],
        worker.dataGettedFromParent.urlProfiles.length,
        (allMessages) => worker.gatherSender(allMessages),
    );
})();
