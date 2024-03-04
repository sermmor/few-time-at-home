import { ReaderOptions } from "@extractus/feed-extractor";
import { ConfigurationService } from "../API";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { WorkerChildParentHandleData } from "../workerModule/workersManager";

const fetch = require("node-fetch");

export class NitterRSSMessageList extends ChannelMediaRSSMessageList {
    private nitterInstancesList: string[];

    constructor(
        private rssOptions: ReaderOptions = {
            normalization: false,
            descriptionMaxLen: 10000,
        }
    ) {
        super();
        this.urlProfiles = ConfigurationService.Instance.nitterRssUsersList.map((user: any) => `/${user}/rss`);
        this.nitterInstancesList = ConfigurationService.Instance.nitterInstancesList;
    }

    refleshChannelMediaConfiguration(): void {
        this.urlProfiles = ConfigurationService.Instance.nitterRssUsersList.map((user: any) => `/${user}/rss`);
        this.nitterInstancesList = ConfigurationService.Instance.nitterInstancesList;
    }
    
    createWorkerData(urlsProfilesToSend: string[][], indexWorker: number): WorkerChildParentHandleData {
        return {
            id: `nitterRSSMessages ${indexWorker}`,
            workerScriptPath: './build/nitterRSS/nitterRSSWorker.js',
            workerDataObject: {
                urlProfiles: urlsProfilesToSend[indexWorker],
                nitterInstancesList: this.nitterInstancesList,
                rssOptions: this.rssOptions,
            },
        }
    }

    // ---------------------------------------------------------- REPLACE NITTER BY TWITTER.
    updateRSSList(): Promise<ChannelMediaRSSMessageList> {
      const { urlTwitterAPI, user_list_id, user_name, password, email, userExceptionsList, numberOfMessages } = ConfigurationService.Instance.twitterData;
      const data = {
          "data": {
              user_list_id,
              user_name,
              password,
              email,
              userExceptionsList,
              "numberOfTuits": `${numberOfMessages}`,
          }
      };
      return new Promise<ChannelMediaRSSMessageList>(resolve => {
        fetch(urlTwitterAPI, {
          method: 'POST',
          headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
          },
          body: JSON.stringify(data, null, 2)
        }).then((res: any) => res.json())
          .then((json: any) => {
            const allMessages = {...json}
            this.allMessages = allMessages.data.reverse();
            resolve(this);
          });
      });
  }

  formatMessagesToTelegramTemplate = (): string[] => this.allMessages.map(message =>
    `${message.author} - ${message.date}
    ${message.content}
    ${message.originalLink}`
);
}
