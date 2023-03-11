import { ChannelMediaRSSWorkerData } from "../channelMediaRSS/channelMediaRSSWorkerData";

export interface MastodonRSSWorkerData extends ChannelMediaRSSWorkerData {
    mastoInstanceList: string[],
}