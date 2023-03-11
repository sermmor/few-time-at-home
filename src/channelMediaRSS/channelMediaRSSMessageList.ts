import { WorkerChildParentHandleData, WorkerManager } from "../workerModule/workersManager";
import { ChannelMediaRSSMessage } from "./channelMediaRSSData";

export abstract class ChannelMediaRSSMessageList {
    protected urlProfiles: string[];
    protected numberOfWorkers: number;
    public allMessages: ChannelMediaRSSMessage[];

    constructor() {
        this.allMessages = [];
        this.urlProfiles = [];
        this.numberOfWorkers = 1;
    }

    abstract createWorkerData(urlsProfilesToSend: string[][], indexWorker: number): WorkerChildParentHandleData;

    updateRSSList = (): Promise<ChannelMediaRSSMessageList> => {
        const urlsProfilesToSend: string[][] = WorkerManager.divideArrayInNumberOfWorkers(this.urlProfiles, this.numberOfWorkers);
        const dataWorkerList: WorkerChildParentHandleData[] = [];

        for (let i = 0; i < this.numberOfWorkers; i++) {
            dataWorkerList.push(this.createWorkerData(urlsProfilesToSend, i))
        }

        const workerManager = new WorkerManager(dataWorkerList);
        
        return new Promise<ChannelMediaRSSMessageList>(resolve => {
            workerManager.gatherReceive().then(allMessages => {
                this.allMessages = allMessages
                    .reduce((previous, current) => previous.concat(current))
                    .sort((messageA: any, messageB: any) => messageA.date > messageB.date ? 1 : -1);
                workerManager.exitAllChilds();
                resolve(this);
            });
        });
    }

    formatMessagesToTelegramTemplate = (): string[] => this.allMessages.map(message =>
        `${message.author} - ${message.date.toDateString()}
        ${message.content}
        ${message.originalLink}`
    );

    static formatListMessagesToTelegramTemplate = (channelList: ChannelMediaRSSMessageList[]): string[] => {
        const allMessages = channelList
            .map(channel => channel.allMessages)
            .reduce((previous, current) => previous.concat(current))
            .sort((messageA: any, messageB: any) => messageA.date > messageB.date ? 1 : -1);

        return allMessages.map(message =>
            `${message.author} - ${message.date.toDateString()}
            ${message.content}
            ${message.originalLink}`
        );
    }
}