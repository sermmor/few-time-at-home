import { ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSWorkerData } from "../channelMediaRSS/channelMediaRSSWorkerData";

export interface NitterRSSWorkerData extends ChannelMediaRSSWorkerData {
    nitterInstancesList: string[],
}