import { ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { removeDuplicatesInStringArray } from "../utils";
import { WorkerChildParentHandleData, WorkerManager } from "../workerModule/workersManager";

export class MastodonRSSMessageList extends ChannelMediaRSSMessageList {
    private instanceList: string[];

    constructor(
        userData: any,
        private rssOptions: ReaderOptions = {
            normalization: false,
            useISODateFormat: true,
            descriptionMaxLen: 10000,
        },
    ) {
        super();
        this.urlProfiles = userData.mastodonRssUsersList.map((user: any) => `https://${user.instance}/users/${user.user}.rss`);
        this.instanceList = removeDuplicatesInStringArray(userData.mastodonRssUsersList.map((user: any) => user.instance));
        this.numberOfWorkers = userData.numberOfWorkers;
    }
    
    createWorkerData(urlsProfilesToSend: string[][], indexWorker: number): WorkerChildParentHandleData {
        return {
            id: `mastodonRSSMessages ${indexWorker}`,
            workerScriptPath: './build/mastodonRSS/mastodonRSSWorker.js',
            workerDataObject: {
                urlProfiles: urlsProfilesToSend[indexWorker],
                mastoInstanceList: this.instanceList,
                rssOptions: this.rssOptions,
            },
        }
    }
}