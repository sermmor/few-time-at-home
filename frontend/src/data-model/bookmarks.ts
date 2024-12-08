export interface Bookmark {
  url: string;
  title: string;
}

export interface IndexEntry {
  nameFile: string;
  pathInBookmark: string;
}

export type BookmarkItem = IndexEntry & Bookmark;

export const isFolder = (element: BookmarkItem): boolean => !!element.nameFile;

export const getIdBookmarkItem = (item: BookmarkItem): string => item.nameFile ? item.nameFile : item.url;

export interface GetPathRequest {
  path: string;
}

export interface GetPathResponse {
  data: BookmarkItem[];
}

export interface GetTrashListRequest {
  bookmarksByPage: number;
  currentPage: number;
}

export interface GetTrashListResponse {
  data: Bookmark[];
}

export interface GetSearchListRequest {
  data: string;
}

export interface GetSearchListResponse {
  data: Bookmark[];
}

export interface GetAddBookmarkRequest {
  url: string;
  title: string;
  path: string;
}

export interface GetAddBookmarkResponse {
  data: Bookmark;
}

export interface GetAddFolderRequest {
  path: string;
}

export interface GetAddFolderResponse {
  data: IndexEntry;
}

export interface GetRemoveBookmarkRequest {
  url: string;
  path: string;
}

export interface GetRemoveFolderRequest {
  path: string;
}

export interface GetRemoveInTrashRequest {
  url: string;
}

export interface GetEditBookmarkRequest {
  path: string;
  oldBookmark: Bookmark;
  newBookmark: Bookmark;
}

export interface GetEditFolderRequest {
  oldPath: string;
  newPath: string;
}

export interface GetMoveRequest {
  toMove: BookmarkItem[];
  oldPath: string;
  newPath: string;
}
