import { extract, ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessage } from "../channelMediaRSS";
import { parseFromNitterDateStringToDateObject } from "../utils";
import { WorkerChild } from "../workerModule/workersManager";
import { ChannelMediaRSSWorkerData } from "./channelMediaRSSWorkerData";

type updateRSSFunction = (
    data: ChannelMediaRSSWorkerData,
    endpoint: string,
    nitterUrlIndex?: number,
    currentTry?: number
) => Promise<ChannelMediaRSSMessage[]>;

export const updateRSSListOneByOne = (
    data: ChannelMediaRSSWorkerData,
    messagesToConcat: ChannelMediaRSSMessage[][],
    rssUrlWaiting: number,
    updateRSS: updateRSSFunction,
    onFinished: (allMessages: ChannelMediaRSSMessage[]) => void,
) => {

    if (rssUrlWaiting > 0) {
        const { urlProfiles } = data;
        const url = urlProfiles[rssUrlWaiting - 1];
        updateRSS(data, url).then((currentMessages: ChannelMediaRSSMessage[]) => {
            messagesToConcat.push(currentMessages);
            setTimeout(() => updateRSSListOneByOne(data, messagesToConcat, rssUrlWaiting - 1, updateRSS, onFinished), 0);
        });
    } else {
        const allMessages = !messagesToConcat || messagesToConcat.length < 2 ? [] : messagesToConcat
            .reduce((previous, current) => previous.concat(current))
            .sort((messageA, messageB) => messageA.date > messageB.date ? 1 : -1);
        onFinished(allMessages);
    }
}

export const filterRSSMessages = (currentMessages: ChannelMediaRSSMessage[]): ChannelMediaRSSMessage[]  => currentMessages.filter(
    ({ content }: ChannelMediaRSSMessage) => content.indexOf('<a href=\"') >= 0
);


export const cleanLinksInMessage = (message: ChannelMediaRSSMessage, urlToClean: string): ChannelMediaRSSMessage => {
    const contentSplitted = message.content.split(urlToClean);
    const cleanedContentSplitter = contentSplitted.map(pieceContent => {
        const end = pieceContent.indexOf('</a>');
        return (pieceContent.charAt(0) === '/' && end > -1) ? pieceContent.substring(end + 4) : pieceContent;
    });
    return {
        ...message,
        content: cleanedContentSplitter.join(''),
    };
};
