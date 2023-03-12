import { ReaderOptions } from "@extractus/feed-extractor";
import { ConfigurationService } from "../API";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { WorkerChildParentHandleData } from "../workerModule/workersManager";

export class BlogRSSMessageList extends ChannelMediaRSSMessageList {

    constructor(
        private rssOptions: ReaderOptions = {
            normalization: true,
            useISODateFormat: true,
            descriptionMaxLen: 200,
        }
    ) {
        super();
        this.urlProfiles = ConfigurationService.Instance.blogRssList;
    }

    refleshChannelMediaConfiguration(): void {
        this.urlProfiles = ConfigurationService.Instance.blogRssList;
    }
    
    createWorkerData(urlsProfilesToSend: string[][], indexWorker: number): WorkerChildParentHandleData {
        return {
            id: `blogRSSMessages ${indexWorker}`,
            workerScriptPath: './build/blogRSS/blogRSSWorker.js',
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
