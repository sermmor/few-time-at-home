import { ReaderOptions } from "@extractus/feed-extractor";
import { ConfigurationService } from "../API";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { checkUntilConditionIsTrue, ExtractorUtilities, readJSONFile, saveInAFile } from "../utils";
import { WorkerChildParentHandleData } from "../workerModule/workersManager";
import { YoutubeRSSUtils } from "./youtubeRSSUtils";
import { YoutubeData } from "../API/configuration.service";
import { YoutubeInfoByLinks } from "./youtubeRSSWorkerData";

const fetch = require("node-fetch");

const DEFAULT_TRIES = 10;

const pathYoutubeRssUrlFile = 'data/youtube_rss_urls.json';

interface YouTubeRSSUrl {
  channelUrl: string;
  rssUrl: string;
}

export class YoutubeRSSMessageList extends ChannelMediaRSSMessageList {
  public isYoutubeListLoaded = false;
  public static youtubeLinkAndRssList: YouTubeRSSUrl[] = [];

  constructor(
      private rssOptions: ReaderOptions = {
          normalization: true,
          useISODateFormat: true,
          descriptionMaxLen: 200,
      }
  ) {
    super();
    this.loadChannelsRssFile().then(() => this.refleshChannelMediaConfiguration());
  }

  private loadChannelsRssFile = (): Promise<YouTubeRSSUrl[]> => new Promise<YouTubeRSSUrl[]>(resolve => {
    readJSONFile(pathYoutubeRssUrlFile, '[]').then(dataJson => {
      YoutubeRSSMessageList.youtubeLinkAndRssList = dataJson;
      if (Object.values(dataJson).length === 0) {
        YoutubeRSSMessageList.youtubeLinkAndRssList = [];
      }
      resolve(YoutubeRSSMessageList.youtubeLinkAndRssList);
    });
  });

  private saveChannelsRssFile = (): Promise<YouTubeRSSUrl[]> => new Promise<YouTubeRSSUrl[]>(resolve => {
    saveInAFile(JSON.stringify(YoutubeRSSMessageList.youtubeLinkAndRssList, null, 2), pathYoutubeRssUrlFile);
    resolve(YoutubeRSSMessageList.youtubeLinkAndRssList);
    console.log("> Youtube RSS channels saved!");
  });

  waitUntilIsChargedYoutubeList = (): Promise<void> => new Promise<void>(resolve => checkUntilConditionIsTrue(() => this.isYoutubeListLoaded, () => resolve()));

  private static getYoutubeRSSUrl = (channelUrl: string, youtubeRssUrlFileLoaded: YouTubeRSSUrl[], currentTry = DEFAULT_TRIES): Promise<string> => new Promise<string>(resolve => {
    const rssUrlInFile = (currentTry < DEFAULT_TRIES) ? -1 : youtubeRssUrlFileLoaded.findIndex((rssAndChannelUrl) => rssAndChannelUrl.channelUrl === channelUrl);
    if (rssUrlInFile !== -1) {
      console.log('> LOADED FROM FILE', youtubeRssUrlFileLoaded[rssUrlInFile].channelUrl);
      resolve(youtubeRssUrlFileLoaded[rssUrlInFile].rssUrl);
    } else {
      // Use webscrapping.
      fetch(channelUrl).then((res: any) => res.text()).then((text: string) => {
        const code = ExtractorUtilities.cut(text, 'browse_id","value":"', "\"}");
        console.log(`> Loaded ${channelUrl} at try ${DEFAULT_TRIES - currentTry}`)
        resolve(`https://www.youtube.com/feeds/videos.xml?channel_id=${code}`);
      }).catch(() => {
        if (currentTry > 0) {
          setTimeout(() => YoutubeRSSMessageList.getYoutubeRSSUrl(channelUrl, youtubeRssUrlFileLoaded, currentTry - 1).then(data => resolve(data)), 100);
      } else {
          console.error(`> getYoutubeRSSUrl profile ${channelUrl} is broken or deleted!`);
          resolve('');
      }
      });
    }
  });

  refleshChannelMediaConfiguration = (): Promise<string[]> => new Promise<string[]>(resolve => {
    this.urlProfiles = [];
    let numberOfElements = ConfigurationService.Instance.youtubeRssList.length;
    let rssUrlCandidateIndex = -1;
    ConfigurationService.Instance.youtubeRssList.forEach((channelUrl: YoutubeData) => {
      rssUrlCandidateIndex = YoutubeRSSMessageList.youtubeLinkAndRssList.findIndex(candidate => candidate.channelUrl === channelUrl.url);
      if (rssUrlCandidateIndex >= 0) {
        this.urlProfiles.push(YoutubeRSSMessageList.youtubeLinkAndRssList[rssUrlCandidateIndex].rssUrl);
        numberOfElements--;
      } else {
        YoutubeRSSMessageList.getYoutubeRSSUrl(channelUrl.url, YoutubeRSSMessageList.youtubeLinkAndRssList).then(rssUrl => {
          if (YoutubeRSSMessageList.youtubeLinkAndRssList.findIndex((rssAndChannelUrl) => rssAndChannelUrl.channelUrl === channelUrl.url) === -1) {
            YoutubeRSSMessageList.youtubeLinkAndRssList.push({channelUrl: channelUrl.url, rssUrl});
          }
          this.urlProfiles.push(rssUrl);
          numberOfElements--;
          // console.log(channelUrl, rssUrl, numberOfElements)
          if (numberOfElements === 0) {
            this.isYoutubeListLoaded = true;
            const allProfiles = this.urlProfiles.filter(url => url !== '');
            console.log(`> Loaded ${allProfiles.length} youtube profiles of ${ConfigurationService.Instance.youtubeRssList.length}.`);
            this.saveChannelsRssFile();
            resolve(allProfiles);
          }
        });
      }
    });
    if (numberOfElements === 0) {
      this.isYoutubeListLoaded = true;
      resolve(this.urlProfiles);
    }
  });

  updateRSSList(): Promise<ChannelMediaRSSMessageList> {
    return new Promise<ChannelMediaRSSMessageList>(resolve =>
      this.waitUntilIsChargedYoutubeList().then(() => super.updateRSSList().then(messageList => resolve(messageList)))
    );
  }

  private getDataByUrls = (urlLists: string[]): YoutubeInfoByLinks[] => {
    const originalChannelUrlList = YoutubeRSSMessageList.youtubeLinkAndRssList.filter(channelAndRssData => urlLists.includes(channelAndRssData.rssUrl)).map(channelAndRssData => channelAndRssData.channelUrl);

    return ConfigurationService.Instance.youtubeRssList.filter(youtubeData => originalChannelUrlList.includes(youtubeData.url)).map(youtubeData => ({
      ...youtubeData,
      url: YoutubeRSSMessageList.youtubeLinkAndRssList.filter(channelAndRssData => channelAndRssData.channelUrl === youtubeData.url).map(channelAndRssData => channelAndRssData.rssUrl)[0],
      words_to_filter: (youtubeData.words_to_filter === 'defaultToIgnore') ? [] : (youtubeData.words_to_filter || '').toLowerCase().split(' '),
      mandatory_words: (youtubeData.mandatory_words === 'null') ? '' : (youtubeData.mandatory_words || '').toLowerCase(),
    }));
  }
  
  createWorkerData(urlsProfilesToSend: string[][], indexWorker: number): WorkerChildParentHandleData {
    return {
      id: `youtubeRSSMessages ${indexWorker}`,
      workerScriptPath: './build/youtubeRSS/youtubeRSSWorker.js',
      workerDataObject: {
        urlProfiles: urlsProfilesToSend[indexWorker],
        rssOptions: this.rssOptions,
        youtubeInfoByLinks: this.getDataByUrls(urlsProfilesToSend[indexWorker]),
      },
    }
  }

  formatMessagesToTelegramTemplate = (): string[] => {
    YoutubeRSSUtils.allLastMessages = this.allMessages;
    return this.allMessages.map(message =>`${message.title}
${message.author} - ${message.date.toDateString()}
${message.content}
${message.originalLink}`
    );
  }

  static fileContent = (): string => JSON.stringify(YoutubeRSSMessageList.youtubeLinkAndRssList, null, 2);

  static setFileContent = (data: any): Promise<void> => new Promise<void>(resolve => {
    YoutubeRSSMessageList.youtubeLinkAndRssList = data;
    saveInAFile(JSON.stringify(YoutubeRSSMessageList.youtubeLinkAndRssList, null, 2), pathYoutubeRssUrlFile, () => resolve());
  });
}
