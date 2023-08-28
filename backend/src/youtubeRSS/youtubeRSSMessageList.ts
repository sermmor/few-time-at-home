import { ReaderOptions } from "@extractus/feed-extractor";
import { ConfigurationService } from "../API";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { checkUntilConditionIsTrue, ExtractorUtilities } from "../utils";
import { WorkerChildParentHandleData } from "../workerModule/workersManager";

const fetch = require("node-fetch");

export class YoutubeRSSMessageList extends ChannelMediaRSSMessageList {
  
  public isYoutubeListLoaded = false;
  public youtubeLinkAndRssList: {channelUrl: string; rssUrl: string}[] = [];

  constructor(
      private rssOptions: ReaderOptions = {
          normalization: true,
          useISODateFormat: true,
          descriptionMaxLen: 200,
      }
  ) {
    super();
    this.refleshChannelMediaConfiguration();
  }

  waitUntilIsChargedYoutubeList = (): Promise<void> => new Promise<void>(resolve => checkUntilConditionIsTrue(() => this.isYoutubeListLoaded, () => resolve()));

  private static getYoutubeRSSUrl = (channelUrl: string, currentTry = 10): Promise<string> => new Promise<string>(resolve => {
    fetch(channelUrl).then((res: any) => res.text()).then((text: string) => {
      const code = ExtractorUtilities.cut(text, 'browse_id","value":"', "\"}");
      resolve(`https://www.youtube.com/feeds/videos.xml?channel_id=${code}`);
    }).catch(() => {
      if (currentTry > 0) {
        setTimeout(() => YoutubeRSSMessageList.getYoutubeRSSUrl(channelUrl, currentTry - 1).then(data => resolve(data)), 100);
    } else {
        console.error(`getYoutubeRSSUrl profile ${channelUrl} is broken or deleted!`);
        resolve('');
    }
    });
  });

  refleshChannelMediaConfiguration = (): Promise<string[]> => new Promise<string[]>(resolve => {
    this.urlProfiles = [];
    let numberOfElements = ConfigurationService.Instance.youtubeRssList.length;
    let rssUrlCandidateIndex = -1;
    ConfigurationService.Instance.youtubeRssList.forEach((channelUrl) => {
      rssUrlCandidateIndex = this.youtubeLinkAndRssList.findIndex(candidate => candidate.channelUrl === channelUrl);
      if (rssUrlCandidateIndex >= 0) {
        this.urlProfiles.push(this.youtubeLinkAndRssList[rssUrlCandidateIndex].rssUrl);
        numberOfElements--;
      } else {
        YoutubeRSSMessageList.getYoutubeRSSUrl(channelUrl).then(rssUrl => {
          this.youtubeLinkAndRssList.push({channelUrl, rssUrl});
          this.urlProfiles.push(rssUrl);
          numberOfElements--;
          // console.log(channelUrl, rssUrl, numberOfElements)
          if (numberOfElements === 0) {
            this.isYoutubeListLoaded = true;
            resolve(this.urlProfiles.filter(url => url !== ''));
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
  
  createWorkerData(urlsProfilesToSend: string[][], indexWorker: number): WorkerChildParentHandleData {
    return {
      id: `youtubeRSSMessages ${indexWorker}`,
      workerScriptPath: './build/youtubeRSS/youtubeRSSWorker.js',
      workerDataObject: {
        urlProfiles: urlsProfilesToSend[indexWorker],
        rssOptions: this.rssOptions,
      },
    }
  }

  formatMessagesToTelegramTemplate = (): string[] => this.allMessages.map(message =>
    `${message.title}
${message.author} - ${message.date.toDateString()}
${message.content}
${message.originalLink}`
  );
}
