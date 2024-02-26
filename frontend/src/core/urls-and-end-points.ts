import { ConfigurationService } from "../service/configuration/configuration.service";

const getUrlApi = (): string => `http://${ConfigurationService.Instance.ip}:${ConfigurationService.Instance.port}`;

export const queryRssEndpoint  = (nameEndpoint: 'all' | 'mastodon' | 'twitter' | 'blog' | 'youtube', amount: number): string => `${getUrlApi()}/rss/${nameEndpoint}?amount=${amount}`;
export const configurationTypesEndpoint = (): string => `${getUrlApi()}/configuration/type`;
export const configurationListByTypeEndpoint = (): string => `${getUrlApi()}/configuration/type/list`;
export const configurationEndpoint = (): string => `${getUrlApi()}/configuration`;
export const configurationSendCommandEndpoint = (): string => `${getUrlApi()}/configuration/launch-command`;
export const notesEndpoint = (): string => `${getUrlApi()}/notes`;
export const pomodoroEndpoint = (): string => `${getUrlApi()}/pomodoro`;
export const sendToTelegramEndpoint = (): string => `${getUrlApi()}/send-to-telegram`;
export const notificationsEndpoint = (): string => `${getUrlApi()}/alerts`;
export const areNotificationsEnabledEndpoint = (): string => `${getUrlApi()}/alerts-is-ready`;
export const bookmarksEndpoint = (): string => `${getUrlApi()}/bookmarks`;
export const bookmarksPieceEndpoint = (): string => `${getUrlApi()}/bookmarks-piece`;
export const searchBookmarksEndpoint = (): string => `${getUrlApi()}/search-bookmarks`;
export const quoteEndpoint = (): string => `${getUrlApi()}/random-quote`;
export const unfurlEndpoint = (): string => `${getUrlApi()}/unfurl`;

export type CloudEndpointType = 'getDrivesList' | 'getFolderContent' | 'createFolder' | 'moveItem' | 'renameItem' | 'createBlankFile' | 'saveFile' | 'uploadFile' | 'downloadFile' | 'searchInFolder' | 'deleteFileOrFolder';
const cloudEndpointList = {
  'getDrivesList': '/cloud/drives',
  'getFolderContent': '/cloud/get-folder-content',
  'createFolder': '/cloud/create-folder',
  'moveItem': '/cloud/move-item',
  'renameItem': '/cloud/rename-item',
  'createBlankFile': '/cloud/create-blank-file',
  'saveFile': '/cloud/save-file',
  'uploadFile': '/cloud/upload-file',
  'downloadFile': '/cloud/download-file',
  'searchInFolder': '/cloud/search-in-folder',
  'deleteFileOrFolder': '/cloud/delete',
};

export const getCloudEndpoint = (typeEndpoint: CloudEndpointType) => `${getUrlApi()}${cloudEndpointList[typeEndpoint]}`;
