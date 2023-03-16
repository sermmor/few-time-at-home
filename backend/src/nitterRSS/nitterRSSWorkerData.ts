import { ChannelMediaRSSWorkerData } from "../channelMediaRSS/channelMediaRSSWorkerData";

export interface NitterRSSWorkerData extends ChannelMediaRSSWorkerData {
    nitterInstancesList: string[],
}