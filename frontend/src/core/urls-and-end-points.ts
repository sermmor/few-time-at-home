import { ConfigurationService } from "../service/configuration/configuration.service";

const getUrlApi = (): string => `http://${ConfigurationService.Instance.ip}:${ConfigurationService.Instance.port}`;

export const queryRssEndpoint  = (nameEndpoint: 'all' | 'mastodon' | 'twitter' | 'blog' | 'youtube', amount: number): string => `${getUrlApi()}/rss/${nameEndpoint}?amount=${amount}`;
export const configurationEndpoint = (): string => `${getUrlApi()}/configuration`;
export const notesEndpoint = (): string => `${getUrlApi()}/notes`;
export const quoteEndpoint = (): string => `${getUrlApi()}/random-quote`;
export const unfurlEndpoint = (): string => `${getUrlApi()}/unfurl`;
