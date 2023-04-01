import { ConfigurationService } from "../service/configuration/configuration.service";

const getUrlApi = (): string => `http://${ConfigurationService.Instance.ip}:${ConfigurationService.Instance.port}`;

export const queryRssEndpoint  = (nameEndpoint: 'all' | 'mastodon' | 'twitter' | 'blog' | 'youtube', amount: number): string => `${getUrlApi()}/rss/${nameEndpoint}?amount=${amount}`;
export const configurationEndpoint = (): string => `${getUrlApi()}/configuration`;
export const notesEndpoint = (): string => `${getUrlApi()}/notes`;
export const sendToTelegramEndpoint = (): string => `${getUrlApi()}/send-to-telegram`;
export const notificationsEndpoint = (): string => `${getUrlApi()}/alerts`;
export const areNotificationsEnabledEndpoint = (): string => `${getUrlApi()}/alerts-is-ready`;
export const bookmarksEndpoint = (): string => `${getUrlApi()}/bookmarks`;
export const searchBookmarksEndpoint = (): string => `${getUrlApi()}/search-bookmarks`;
export const quoteEndpoint = (): string => `${getUrlApi()}/random-quote`;
export const unfurlEndpoint = (): string => `${getUrlApi()}/unfurl`;
