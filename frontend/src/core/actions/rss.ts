import { rssDataModelMock } from "../../data-model/mock/rssMock";
import { RssDataModel } from "../../data-model/rss";
import { fetchJsonReceive } from "../fetch-utils";
import { queryRssEndpoint, queryRssYoutubeEndpoint } from "../urls-and-end-points";

const getRSSAll = (amount = 20): Promise<RssDataModel> => getRSS('all', amount);
const getRSSMasto = (amount = 20): Promise<RssDataModel> => getRSS('mastodon', amount);
const getRSSNitter = (amount = 20): Promise<RssDataModel> => getRSS('twitter', amount);
const getRSSYoutube = (tag: string, amount: number): Promise<RssDataModel> => 
  fetchJsonReceive<RssDataModel>(queryRssYoutubeEndpoint(tag, amount), rssDataModelMock());//
const getRSSBlog = (amount = 20): Promise<RssDataModel> => getRSS('blog', amount);
const getRSS = (nameEndpoint: 'all' | 'mastodon' | 'twitter' | 'blog' | 'youtube', amount: number): Promise<RssDataModel> => 
  fetchJsonReceive<RssDataModel>(queryRssEndpoint(nameEndpoint, amount), rssDataModelMock());

export const RSSActions = { getRSSAll, getRSSMasto, getRSSNitter, getRSSBlog, getRSSYoutube, getRSS };
