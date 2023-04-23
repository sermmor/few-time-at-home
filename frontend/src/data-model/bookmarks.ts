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

export interface DataToSendInPieces {
  data: BookmarkItemFromFetch[];
  isFinished: boolean;
}

export const prepareInPiecesDataModelToSend = (bookmarks: BookmarksDataModelFromFetch, numberItemsPerPiece: number = 100): DataToSendInPieces[] => {
  const numberOfPieces = Math.ceil(bookmarks.data.length / numberItemsPerPiece);
  const dataToSend: DataToSendInPieces[] = [];
  let indexCurrent = 0;

  for (let i = 0; i < numberOfPieces; i++) {
    if (indexCurrent + numberItemsPerPiece < bookmarks.data.length) {
      dataToSend.push({
        data: bookmarks.data.slice(indexCurrent, indexCurrent + numberItemsPerPiece),
        isFinished: false,
      });
      indexCurrent = indexCurrent + numberItemsPerPiece;
    } else {
      dataToSend.push({
        data: bookmarks.data.slice(indexCurrent, bookmarks.data.length),
        isFinished: true,
      });
      indexCurrent = bookmarks.data.length;
    }
  }
  
  return dataToSend;
}

