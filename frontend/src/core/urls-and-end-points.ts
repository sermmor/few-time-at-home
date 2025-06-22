import { ConfigurationService } from "../service/configuration/configuration.service";

const getUrlApi = (): string => `http://${ConfigurationService.Instance.ip}:${ConfigurationService.Instance.port}`;

export const queryRssEndpoint  = (nameEndpoint: 'mastodon' | 'twitter' | 'blog' | 'youtube' | 'favorites', amount: number): string => `${getUrlApi()}/rss/${nameEndpoint}?amount=${amount}`;
export const queryRssYoutubeEndpoint  = (tag: string, amount: number): string => `${getUrlApi()}/rss/youtube?amount=${amount}&tag=${tag}`;
export const configurationTypesEndpoint = (): string => `${getUrlApi()}/configuration/type`;
export const configurationListByTypeEndpoint = (): string => `${getUrlApi()}/configuration/type/list`;
export const configurationEndpoint = (): string => `${getUrlApi()}/configuration`;
export const configurationSendCommandEndpoint = (): string => `${getUrlApi()}/configuration/launch-command`;
export const notesEndpoint = (): string => `${getUrlApi()}/notes`;
export const pomodoroEndpoint = (): string => `${getUrlApi()}/pomodoro`;
export const videoToMp3ConverterEndpoint = (): string => `${getUrlApi()}/video-to-mp3-converter`;
export const audioToMp3ConverterEndpoint = (): string => `${getUrlApi()}/audio-to-mp3-converter`;
export const stillConverterEndpoint = (): string => `${getUrlApi()}/still-converter`;
export const sendToTelegramEndpoint = (): string => `${getUrlApi()}/send-to-telegram`;
export const notificationsEndpoint = (): string => `${getUrlApi()}/alerts`;
export const areNotificationsEnabledEndpoint = (): string => `${getUrlApi()}/alerts-is-ready`;
export const quoteEndpoint = (): string => `${getUrlApi()}/random-quote`;
export const unfurlEndpoint = (): string => `${getUrlApi()}/unfurl`;

export const synchronizeDownloadEndpoint = (): string => `${getUrlApi()}/synchronize/download`;
export const synchronizeUploadEndpoint = (): string => `${getUrlApi()}/synchronize/upload`;

export type CloudEndpointType = 'getDrivesList' | 'getFolderContent' | 'createFolder' | 'moveItem' | 'renameItem' | 'createBlankFile' | 'saveFile' | 'uploadFile' | 'downloadFile' | 'searchInFolder' | 'deleteFileOrFolder' | 'zipFolder';
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
  'zipFolder': '/cloud/zip-folder',
};

export const getCloudEndpoint = (typeEndpoint: CloudEndpointType) => `${getUrlApi()}${cloudEndpointList[typeEndpoint]}`;

export type BookmarkEndpointList = 'getPathList' | 'getTrashList' | 'search' | 'searchInTrash' | 'addBookmark' | 'addFolder' | 'removeBookmark' | 'removeFolder' | 'removeInTrash' | 'editBookmark' | 'editFolder' | 'move';
const bookmarkEndpointList = {
  'getPathList': '/bookmarks/path',
  'getTrashList': '/bookmarks/trash',
  'search': '/bookmarks/search',
  'searchInTrash': '/bookmarks/search-in-trash',
  'addBookmark': '/bookmarks/add-bookmark',
  'addFolder': '/bookmarks/add-folder',
  'removeBookmark': '/bookmarks/remove-bookmark',
  'removeFolder': '/bookmarks/remove-folder',
  'removeInTrash': '/bookmarks/remove-in-trash',
  'editBookmark': '/bookmarks/edit-bookmark',
  'editFolder': '/bookmarks/edit-folder',
  'move': '/bookmarks/move',
};

export const bookmarksEndpoint = (typeEndpoint: BookmarkEndpointList): string => `${getUrlApi()}${bookmarkEndpointList[typeEndpoint]}`;

export type ReadLaterRSSEndpointList = 'get' | 'add' | 'remove';
const readLaterRSSEndpointList = {
  'get': '/readLaterRSS/get-messages',
  'add': '/readLaterRSS/add-messages',
  'remove': '/readLaterRSS/remove-messages',
};

export const readLaterRSSEndpoint = (typeEndpoint: ReadLaterRSSEndpointList): string => `${getUrlApi()}${readLaterRSSEndpointList[typeEndpoint]}`;

export const rssForceUpdateEndpoint = (): string => `${getUrlApi()}/rss/force-update`;
