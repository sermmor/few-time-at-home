import { ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { removeDuplicatesInStringArray } from "../utils";
import { WorkerChildParentHandleData, WorkerManager } from "../workerModule/workersManager";

export class MastodonRSSMessageList extends ChannelMediaRSSMessageList {
    private urlProfiles: string[];
    private numberOfWorkers: number;
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

    updateRSSList = (): Promise<MastodonRSSMessageList> => {
        const urlsProfilesToSend: string[][] = WorkerManager.divideArrayInNumberOfWorkers(this.urlProfiles, this.numberOfWorkers);
        const dataWorkerList: WorkerChildParentHandleData[] = [];

        for (let i = 0; i < this.numberOfWorkers; i++) {
            dataWorkerList.push({
                id: `mastodonRSSMessages ${i}`,
                workerScriptPath: './build/mastodonRSS/mastodonRSSWorker.js',
                workerDataObject: {
                    urlProfiles: urlsProfilesToSend[i],
                    mastoInstanceList: this.instanceList,
                    rssOptions: this.rssOptions,
                },
            },)
        }

        const workerManager = new WorkerManager(dataWorkerList);
        
        return new Promise<MastodonRSSMessageList>(resolve => {
            workerManager.gatherReceive().then(allMessages => {
                this.allMessages = allMessages
                    .reduce((previous, current) => previous.concat(current))
                    .sort((messageA: any, messageB: any) => messageA.date > messageB.date ? 1 : -1);
                workerManager.exitAllChilds();
                resolve(this);
            });
        });
    }
}