import { RssDataModel } from "../data-model/rss";
import { queryRssEndpoint } from "../urls-and-end-points";

export const getRSSAll = (amount = 20): Promise<RssDataModel> => new Promise<RssDataModel>(resolve => {
});

export const getRSSMasto = (amount = 20): Promise<RssDataModel> => new Promise<RssDataModel>(resolve => {
});

export const getRSSNitter = (amount = 20): Promise<RssDataModel> => new Promise<RssDataModel>(resolve => {
});

export const getRSSBlog = (amount = 20): Promise<RssDataModel> => new Promise<RssDataModel>(resolve => {
});

export const getRSS = (nameEndpoint: 'all' | 'mastodon' | 'twitter' | 'blog', amount: number): Promise<RssDataModel> => new Promise<RssDataModel>(resolve => {
    fetch(queryRssEndpoint(nameEndpoint, amount))
    .then(res => res.json())
    .then(json => resolve({...json}));
});