import { ReaderOptions } from "@extractus/feed-extractor";
import { ConfigurationService } from "../API";
import { ChannelMediaRSSMessageList } from "../channelMediaRSS";
import { removeDuplicatesInStringArray } from "../utils";
import { WorkerChildParentHandleData } from "../workerModule/workersManager";

export class MastodonRSSMessageList extends ChannelMediaRSSMessageList {
    private instanceList: string[];

    constructor(
        private rssOptions: ReaderOptions = {
            normalization: false,
            useISODateFormat: true,
            descriptionMaxLen: 10000,
        },
    ) {
        super();
        this.urlProfiles = ConfigurationService.Instance.mastodonRssUsersList.map((user: any) => `https://${user.instance}/users/${user.user}.rss`);
        this.instanceList = removeDuplicatesInStringArray(ConfigurationService.Instance.mastodonRssUsersList.map((user: any) => user.instance));
    }
    
    refleshChannelMediaConfiguration(): void {
        this.urlProfiles = ConfigurationService.Instance.mastodonRssUsersList.map((user: any) => `https://${user.instance}/users/${user.user}.rss`);
        this.instanceList = removeDuplicatesInStringArray(ConfigurationService.Instance.mastodonRssUsersList.map((user: any) => user.instance));
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