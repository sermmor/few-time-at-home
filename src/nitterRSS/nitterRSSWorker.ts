import { extract, ReaderOptions } from "@extractus/feed-extractor";
import { parseFromNitterDateStringToDateObject } from "../utils";
import { NitterRSSMessage } from "./nitterRSSData";

const updateRSS = (
    nitterInstancesList: string[],
    rssOptions: ReaderOptions,
    endpoint: string,
    nitterUrlIndex: number = 0,
    currentTry = 4
): Promise<NitterRSSMessage[]> => {
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
                setTimeout(() => updateRSS(nitterInstancesList, rssOptions, endpoint, nitterUrlIndex, currentTry - 1), 100);
            } else if (nitterUrlIndex < nitterInstancesList.length) {
                updateRSS(nitterInstancesList, rssOptions, endpoint, nitterUrlIndex + 1, currentTry);
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
    const worker = require('node:worker_threads');
    
    console.log(`Hola soy el hijo ${worker.threadId}, aquí datos de mi padre: `, worker.workerData);

    worker.parentPort.postMessage({'datos': [1, {'hola': 'mundo'}], 'hijo número': worker.threadId});

    // const { nitterInstancesList, rssOptions, endpoint, nitterUrlIndexFrom, nitterUrlIndexTo, urlProfiles } = worker.workerData;
    // updateRSSListOneByOne(w.workerData.endpoint, w.workerData.nitterUrlIndexFrom, w.workerData.nitterUrlIndexTo)
    // TODO: Use all urlProfiles secuantialy and when finished (THE SAME OF THE METHOD updateRSSListOneByOne), send results to parent.
    // ! THIS IS A CONCURRENCY REDUCE PATTERN DO A CLASS FOR MANAGE THIS (pick up all the results in a list, and do an operation with them (GATHER and sort in our case)).
    // ! USE Scatter, Gather OPERATIONS.
})();
