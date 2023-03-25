import { GenericTree } from "../service/trees/genericTree";

export const urlFolder = 'urlfolder:///';

export const isFolder = (element: BookmarkItem) => element.url.indexOf(urlFolder) > -1;

export interface BookmarkItemFromFetch {
  url: string;
  title: string;
  path: string;
}

export interface BookmarksDataModelFromFetch {
  data: BookmarkItemFromFetch[];
}

export interface BookmarkItem {
  url: string;
  title: string;
}

export interface BookmarksDataModel {
  data: GenericTree<BookmarkItem>;
}

export const parseFromFetchToDataModel = (bookmarkFetchStyle: BookmarksDataModelFromFetch): BookmarksDataModel => {
  const dataForTree: {path: string, data: BookmarkItem}[] = bookmarkFetchStyle.data.map(item => ({
    path: item.path ? item.path : '/',
    data: {
      title: item.title,
      url: item.url,
    }
  }));
  return {
    data: GenericTree.parseFromListWithPaths(dataForTree)!,
  };
}

export const parseFromDataModelToFetchToSend = (bookmarks: BookmarksDataModel): BookmarksDataModelFromFetch => {
  const dataFromTree: {path: string, data: BookmarkItem}[] = GenericTree.parseTreeToList(bookmarks.data);
  return {
    data: dataFromTree.map(item => ({
      url: item.data.url,
      title: item.data.title,
      path: item.path,
    }))
  };
}