import { ReaderOptions } from "@extractus/feed-extractor";

export interface MastodonRSSWorkerData {
    urlProfiles: string[],
    mastoInstanceList: string[],
    rssOptions: ReaderOptions,
}