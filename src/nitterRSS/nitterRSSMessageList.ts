import { ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { WorkerChildParentHandleData, WorkerManager } from "../workerModule/workersManager";

export class NitterRSSMessageList extends ChannelMediaRSSMessageList {
    private urlProfiles: string[];
    private nitterInstancesList: string[];
    private numberOfWorkers: number;

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

    updateRSSList(): Promise<NitterRSSMessageList> {
        const urlsProfilesToSend: string[][] = WorkerManager.divideArrayInNumberOfWorkers(this.urlProfiles, this.numberOfWorkers);
        const dataWorkerList: WorkerChildParentHandleData[] = [];

        for (let i = 0; i < this.numberOfWorkers; i++) {
            dataWorkerList.push({
                id: `nitterRSSMessages ${i}`,
                workerScriptPath: './build/nitterRSS/nitterRSSWorker.js',
                workerDataObject: {
                    urlProfiles: urlsProfilesToSend[i],
                    nitterInstancesList: this.nitterInstancesList,
                    rssOptions: this.rssOptions,
                },
            },)
        }

        const workerManager = new WorkerManager(dataWorkerList);
        
        return new Promise<NitterRSSMessageList>(resolve => {
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
