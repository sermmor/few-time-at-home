import { extract, FeedData, ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessage, ChannelMediaRSSWorkerData, cleanLinksInMessage, filterRSSMessages, updateRSSListOneByOne } from "../channelMediaRSS";
import { parseFromBlogDateStringToDateObject, parseFromNitterDateStringToDateObject } from "../utils";
import { WorkerChild } from "../workerModule/workersManager";
import { YoutubeInfoByLinks, YoutubeMediaRSSMessage, YoutubeRSSWorkerData } from "./youtubeRSSWorkerData";

const updateRSS = (
    data: ChannelMediaRSSWorkerData,
    endpoint: string,
    nitterUrlIndex: number = 0,
    currentTry = 4,
    rssOptionsAlternative?: ReaderOptions,
    feedData?: FeedData,
): Promise<ChannelMediaRSSMessage[]> => {
  console.log(`Extracting: ${endpoint}`);
  const { rssOptions } = rssOptionsAlternative ? { rssOptions: rssOptionsAlternative, } : <YoutubeRSSWorkerData> data;
  const { youtubeInfoByLinks } = <YoutubeRSSWorkerData> data;
    return new Promise<ChannelMediaRSSMessage[]>(resolve =>
        extract(`${endpoint}`, rssOptions).then((dataItem) => {
            // console.log(data)
            const youtubeInfo = youtubeInfoByLinks.filter(data => data.url === endpoint)[0];
            if (!youtubeInfo.show_not_publised_videos && !rssOptionsAlternative) {
              // When we check if it's published videos ("Proximamente"), then try with NO normalization RSS.
              const newRssOptions = {
                ...rssOptions,
                normalization: false,
              };
              setTimeout(() => updateRSS(data, endpoint, nitterUrlIndex, currentTry, newRssOptions, dataItem).then(data => resolve(data)), 100);
            } else {
              let currentMessages: ChannelMediaRSSMessage[];
              if (feedData) {
                const viewersList: number[] = (<any> dataItem).entry.map((rssMessage: any) => +rssMessage['media:group']['media:community']['media:statistics']['@_views']);
                currentMessages = filterMessages(mapRSSBlogPostsToMessages(feedData, youtubeInfo), youtubeInfo, viewersList);
              } else {
                currentMessages = filterMessages(mapRSSBlogPostsToMessages(dataItem, youtubeInfo), youtubeInfo);
              }
              console.log(`${endpoint}  ${currentMessages.length}`);
              resolve(currentMessages);
            }

        }).catch(() => {
            if (currentTry > 0) {
                setTimeout(() => updateRSS(data, endpoint, nitterUrlIndex, currentTry - 1).then(data => resolve(data)), 100);
            } else {
                console.error(`Youtube profile ${endpoint} is broken or deleted!`);
                resolve([]);
            }
    }));
}

const mapRSSBlogPostsToMessages = (data: any, youtubeInfo: YoutubeInfoByLinks): YoutubeMediaRSSMessage[] => data.entries.map((rssMessage: any) => ({
    title: rssMessage.title,
    author: data.title,
    date: parseFromBlogDateStringToDateObject(rssMessage.published),
    content: rssMessage.description,
    originalLink: rssMessage.link,
    youtubeInfo,
}));

const filterMessages = (data: ChannelMediaRSSMessage[], youtubeInfo: YoutubeInfoByLinks, viewersList?: number[]): ChannelMediaRSSMessage[] => {
  // Filter 0 viewers
  let newData = data;
  if (viewersList) {
    newData = newData.filter((message, i) => viewersList[i] > 0);
  }

  // Filter mandatory words.
  if (youtubeInfo.mandatory_words !== '') {
    newData = newData.filter((message) => message.title.toLowerCase().indexOf(youtubeInfo.mandatory_words) > -1);
  }

  // Filter words to filter
  if (!youtubeInfo.words_to_filter || youtubeInfo.words_to_filter.length === 0) {
    return newData;
  }
  return newData.filter(
    (message) => {
      const titleSplitted = message.title.toLowerCase().split(' ');
      for (let i = 0; i < youtubeInfo.words_to_filter.length; i++) {
        if (titleSplitted.includes(youtubeInfo.words_to_filter[i])) {
          return false;
        }
      }
      return true;
    }
  );
};

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

