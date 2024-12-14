export interface Bookmark {
  url: string;
  title: string;
}

export interface IndexEntry {
  nameFile: string;
  pathInBookmark: string;
}

export const isInRootPath = (itemPath: string): boolean => {
  // For instance: nameDrive='' item.path='/Andalucia.jpeg' is true
  const splitPath = itemPath.split('/');
  return splitPath.length === 2 && itemPath[0] === "";
}

// For instance: item.path='/Images/Andalucia' => '/Images'
export const getParentPath = (itemPath: string): string => {
  const splitPath = itemPath.split('/');
  return splitPath.slice(0, splitPath.length - 1).join('/');
}

// For instance: item.path='Images/States/Spain/Andalucia' => ['cloud', 'cloud/Images', 'cloud/Images/States', 'cloud/Images/States/Spain']
export const getBreadcrumb = (itemPath: string): string[] => {
  const breadcrumb: string[] = [];
  let currentPath = '';

  itemPath.split('/').forEach(folderName => {
    currentPath = ('' === currentPath) ? folderName : `${currentPath}/${folderName}`;
    breadcrumb.push(currentPath);
  });

  return breadcrumb.slice(0, breadcrumb.length - 1);
}

export type BookmarkItem = IndexEntry & Bookmark;

export const isFolder = (element: BookmarkItem): boolean => !!element.nameFile;

export const getIdBookmarkItem = (item: BookmarkItem): string => item.nameFile ? item.nameFile : item.url;

export const isEqualIdFolder = (item: BookmarkItem, idItem: string): boolean => item.nameFile === idItem;
export const isEqualIdBookmark = (item: BookmarkItem, idItem: string): boolean => item.url === idItem;
export const isEqualIdBookmarkItem = (item: BookmarkItem, idItem: string): boolean => isFolder(item) ? isEqualIdFolder(item, idItem) : isEqualIdBookmark(item, idItem);

export const getBookmarkItemById = (list: BookmarkItem[], idItem: string): { item: BookmarkItem | undefined, isFolder: boolean } => {
  // We don't know if item is folder or bookmark so, we search.
  const itemFolder = list.find(item => isEqualIdFolder(item, idItem));
  if (itemFolder) {
    return { item: itemFolder, isFolder: true };
  }

  const itemBookmark = list.find(item => isEqualIdBookmark(item, idItem));
  return { item: itemBookmark, isFolder: false };
}

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

export interface GetOnlyBookmarkListResponse {
  data: Bookmark[],
}

export interface GetTrashListResponse {
  bookmarks: Bookmark[],
  totalOfBookmarks: number,
  numberOfPages: number,
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
