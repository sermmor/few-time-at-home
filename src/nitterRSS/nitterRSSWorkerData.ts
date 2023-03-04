import { ReaderOptions } from "@extractus/feed-extractor";

export interface NitterRSSWorkerData {
    urlProfiles: string[],
    nitterInstancesList: string[],
    rssOptions: ReaderOptions,
}