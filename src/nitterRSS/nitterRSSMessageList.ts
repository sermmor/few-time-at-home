import { ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { WorkerChildParentHandleData, WorkerManager } from "../workerModule/workersManager";

export class NitterRSSMessageList extends ChannelMediaRSSMessageList {
    private nitterInstancesList: string[];

    constructor(
        userData: any,
        private rssOptions: ReaderOptions = {
            normalization: false,
            descriptionMaxLen: 10000,
        }
    ) {
        super();
        this.urlProfiles = userData.nitterRssUsersList.map((user: any) => `/${user}/rss`);
        this.nitterInstancesList = userData.nitterInstancesList;
        this.numberOfWorkers = userData.numberOfWorkers;
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
