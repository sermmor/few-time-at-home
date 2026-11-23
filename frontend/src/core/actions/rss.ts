import { rssDataModelMock, rssRecommendedDataModelMock } from "../../data-model/mock/rssMock";
import { RssDataModel, RssRecommendedDataModel } from "../../data-model/rss";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { dismissRssRecommendedEndpoint, queryRssEndpoint, queryRssRecommendedEndpoint, queryRssYoutubeEndpoint, rssForceUpdateEndpoint } from "../urls-and-end-points";

const postForceUpdate = (): Promise<{ response: string }> => fetchJsonReceive<{ response: string }>(
  rssForceUpdateEndpoint(),
  { response: 'OK' }
);
const getRSSFavorites = (amount = 20): Promise<RssDataModel> => getRSS('favorites', amount);
const getRSSMasto = (amount = 20): Promise<RssDataModel> => getRSS('mastodon', amount);
const getRSSNitter = (amount = 20): Promise<RssDataModel> => getRSS('twitter', amount);
const getRSSYoutube = (tag: string, amount: number): Promise<RssDataModel> => 
  fetchJsonReceive<RssDataModel>(queryRssYoutubeEndpoint(tag, amount), rssDataModelMock());//
const getRSSBlog = (amount = 20): Promise<RssDataModel> => getRSS('blog', amount);
const getRSS = (nameEndpoint: 'mastodon' | 'twitter' | 'blog' | 'news' | 'youtube' | 'favorites', amount: number): Promise<RssDataModel> => 
  fetchJsonReceive<RssDataModel>(queryRssEndpoint(nameEndpoint, amount), rssDataModelMock());
// Categoría "Recomiéndame": mensajes ordenados por el recomendador del backend + motivo de cada uno
const getRSSRecommended = (amount = 20): Promise<RssRecommendedDataModel> =>
  fetchJsonReceive<RssRecommendedDataModel>(queryRssRecommendedEndpoint(amount), rssRecommendedDataModelMock());
// "No me interesa": el backend lo guarda y no lo vuelve a recomendar
const dismissRecommended = (message: string): Promise<{ ok: boolean }> =>
  fetchJsonSendAndReceive<{ ok: boolean }>(dismissRssRecommendedEndpoint(), { message }, { ok: false });

export const RSSActions = { getRSSMasto, getRSSNitter, getRSSBlog, getRSSYoutube, getRSS, getRSSFavorites, getRSSRecommended, dismissRecommended, postForceUpdate };
