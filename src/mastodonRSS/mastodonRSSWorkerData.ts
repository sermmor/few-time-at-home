import { ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSWorkerData } from "../channelMediaRSS/channelMediaRSSWorkerData";

export interface MastodonRSSWorkerData extends ChannelMediaRSSWorkerData {
    mastoInstanceList: string[],
}