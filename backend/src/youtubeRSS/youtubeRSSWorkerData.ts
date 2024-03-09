import { ChannelMediaRSSMessage } from "../channelMediaRSS";
import { ChannelMediaRSSWorkerData } from "../channelMediaRSS/channelMediaRSSWorkerData";

export interface YoutubeInfoByLinks {
  url: string;
  show_not_publised_videos: boolean;
  not_filter_shorts: boolean;
  words_to_filter: string[];
}

export interface YoutubeMediaRSSMessage extends ChannelMediaRSSMessage {
  youtubeInfo: YoutubeInfoByLinks;
}

export interface YoutubeRSSWorkerData extends ChannelMediaRSSWorkerData {
  youtubeInfoByLinks: YoutubeInfoByLinks[];
}