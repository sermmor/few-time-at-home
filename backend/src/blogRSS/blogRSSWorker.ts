import { extract, FeedData, ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessage, ChannelMediaRSSWorkerData, cleanLinksInMessage, filterRSSMessages, updateRSSListOneByOne } from "../channelMediaRSS";
import { parseFromBlogDateStringToDateObject, parseFromNitterDateStringToDateObject } from "../utils";
import { WorkerChild } from "../workerModule/workersManager";
import { BlogRSSWorkerData } from "./blogRSSWorkerData";

const updateRSS = (
    data: ChannelMediaRSSWorkerData,
    endpoint: string,
    nitterUrlIndex: number = 0,
    currentTry = 4,
    rssOptionsAlternative?: ReaderOptions,
    feedData?: FeedData,
): Promise<ChannelMediaRSSMessage[]> => {
    console.log(`Extracting: ${endpoint}`);
    const { rssOptions } = rssOptionsAlternative ? { rssOptions: rssOptionsAlternative, } : <BlogRSSWorkerData> data;
    return new Promise<ChannelMediaRSSMessage[]>(resolve => {
      const timeout = setTimeout(() => {
        console.error(`[Watchdog time] Blog profile ${endpoint} is broken or deleted!`);
        resolve([]);
      }, 1000 * 30);
      extract(`${endpoint}`, rssOptions).then((dataItem) => {
            clearTimeout(timeout);
            // console.log(data)
            if (dataItem && dataItem.entries && dataItem.entries[0] && dataItem.entries[0].link === '') {
              // When RSS hasn't link, then try with NO normalization RSS.
              const newRssOptions = {
                ...rssOptions,
                normalization: false,
              };
              setTimeout(() => updateRSS(data, endpoint, nitterUrlIndex, currentTry, newRssOptions, dataItem).then(data => resolve(data)), 100);
            } else {
              let currentMessages: ChannelMediaRSSMessage[];
              if (feedData) {
                currentMessages = mapRSSBlogPostsToMessages(feedData);
                if (!!dataItem && !!(<any> dataItem).item[0] && !!(<any> dataItem).item[0].enclosure && !!(<any> dataItem).item[0].enclosure['@_url']) {
                  // Get links Prisa ES from NO normalization RSS.
                  currentMessages = currentMessages.map((message: any, index: number) => ({
                    ...message,
                    originalLink: (<any> dataItem).item[index].enclosure['@_url'],
                  }));
                }
              } else {
                currentMessages = mapRSSBlogPostsToMessages(dataItem);
              }
              console.log(`${endpoint}  ${currentMessages.length}`);
              resolve(currentMessages);
            }
        }).catch((err) => {
          clearTimeout(timeout);
          if ((`${err}`).indexOf('error code 504') > -1) {
            console.log('Error: Request failed with error code 504');
            resolve([]);
          } else if (currentTry > 0) {
            setTimeout(() => updateRSS(data, endpoint, nitterUrlIndex, currentTry - 1).then(data => resolve(data)), 100);
          } else {
            console.error(`Blog profile ${endpoint} is broken or deleted!`);
            resolve([]);
          }
      })});
}

const mapRSSBlogPostsToMessages = (data: any): ChannelMediaRSSMessage[] => data.entries.map((rssMessage: any) => ({
    title: rssMessage.title,
    author: data.title,
    date: parseFromBlogDateStringToDateObject(rssMessage.published),
    content: rssMessage.description,
    originalLink: rssMessage.link,
}));

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

