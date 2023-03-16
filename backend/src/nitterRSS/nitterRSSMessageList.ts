import { ReaderOptions } from "@extractus/feed-extractor";
import { ConfigurationService } from "../API";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { WorkerChildParentHandleData } from "../workerModule/workersManager";

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
}
