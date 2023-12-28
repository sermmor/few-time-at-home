import { ConfigurationService } from "../service/configuration/configuration.service";

const getUrlApi = (): string => `http://${ConfigurationService.Instance.ip}:${ConfigurationService.Instance.port}`;

export const queryRssEndpoint  = (nameEndpoint: 'all' | 'mastodon' | 'twitter' | 'blog' | 'youtube', amount: number): string => `${getUrlApi()}/rss/${nameEndpoint}?amount=${amount}`;
export const configurationEndpoint = (): string => `${getUrlApi()}/configuration`;
export const notesEndpoint = (): string => `${getUrlApi()}/notes`;
export const sendToTelegramEndpoint = (): string => `${getUrlApi()}/send-to-telegram`;
export const notificationsEndpoint = (): string => `${getUrlApi()}/alerts`;
export const areNotificationsEnabledEndpoint = (): string => `${getUrlApi()}/alerts-is-ready`;
export const bookmarksEndpoint = (): string => `${getUrlApi()}/bookmarks`;
export const bookmarksPieceEndpoint = (): string => `${getUrlApi()}/bookmarks-piece`;
export const searchBookmarksEndpoint = (): string => `${getUrlApi()}/search-bookmarks`;
export const quoteEndpoint = (): string => `${getUrlApi()}/random-quote`;
export const unfurlEndpoint = (): string => `${getUrlApi()}/unfurl`;

export type CloudEndpointType = 'getDrivesList' | 'updateIndexing' | 'getAllItems' | 'createFolder' | 'moveItem' | 'renameItem' | 'createBlankFile' | 'uploadFile' | 'downloadFile' | 'search';
const cloudEndpointList = {
  'getDrivesList': '/cloud/drives',
  'updateIndexing': '/cloud/update',
  'getAllItems': '/cloud/get-items',
  'createFolder': '/cloud/create-folder',
  'moveItem': '/cloud/move-item',
  'renameItem': '/cloud/rename-item',
  'createBlankFile': '/cloud/create-blank-file',
  'uploadFile': '/cloud/upload-file',
  'downloadFile': '/cloud/download-file',
  'search': '/cloud/search',
};

export const getCloudEndpoint = (typeEndpoint: CloudEndpointType) => `${getUrlApi()}${cloudEndpointList[typeEndpoint]}`;
