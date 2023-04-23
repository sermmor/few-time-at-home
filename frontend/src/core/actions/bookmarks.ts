
import { BookmarkItemFromFetch, BookmarksDataModel, BookmarksDataModelFromFetch, DataToSendInPieces, parseFromDataModelToFetchToSend, parseFromFetchToDataModel, prepareInPiecesDataModelToSend } from "../../data-model/bookmarks";
import { bookmarksDataModelMock, dataToGetInPiecesMock } from "../../data-model/mock/bookmarksMock";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { bookmarksEndpoint, bookmarksPieceEndpoint, searchBookmarksEndpoint } from "../urls-and-end-points";

export interface DataToGetInPieces {
  data: BookmarkItemFromFetch[];
  pieceIndex: number;
  totalPieces: number;
  isFinished: boolean;
}

let isInGetBookmarkProcess = false;

const getBookmarks = (): Promise<BookmarksDataModel> => new Promise<BookmarksDataModel>(resolve => {
  if (!isInGetBookmarkProcess) {
    isInGetBookmarkProcess = true;
    fetchJsonReceive<{data: DataToGetInPieces}>(bookmarksEndpoint(), dataToGetInPiecesMock())
      .then(fetchPieceData => {
        if (fetchPieceData.data.isFinished) {
          resolve(parseFromFetchToDataModel({data: fetchPieceData.data.data}));
        } else {
          getBookmarksRecursive(fetchPieceData.data.data).then(finalData => {
            console.log(finalData.length)
            isInGetBookmarkProcess = false;
            resolve(parseFromFetchToDataModel({data: finalData}));
          });
        }
      });
  } else {
    setTimeout(() => {
      if (isInGetBookmarkProcess) {
        isInGetBookmarkProcess = false;
        getBookmarks().then(data => resolve(data));
        console.log('> Call getBookmark again.')
      } else {
        console.log('> Not need to call getBookmark again.')
      }
    }, 30000);
  }
});

const getBookmarksRecursive = (allData : BookmarkItemFromFetch[]) => new Promise<BookmarkItemFromFetch[]>(resolve => {
  fetchJsonReceive<{data: DataToGetInPieces}>(bookmarksPieceEndpoint(), dataToGetInPiecesMock()).then(fetchPieceData => {
    if (!fetchPieceData.data || fetchPieceData.data.isFinished) {
      const dataCompleted = fetchPieceData.data ? allData.concat(fetchPieceData.data.data) : allData;
      resolve(dataCompleted);
    } else {
      setTimeout(() => {
        const dataCompleted = allData.concat(fetchPieceData.data.data);
        getBookmarksRecursive(dataCompleted).then(finalData => resolve(finalData));
      }, 0.5);
    }
  });
});

const sendBookmarks = (data: BookmarksDataModel) => new Promise<void>(resolve => {
  const dataToFetch = parseFromDataModelToFetchToSend(data);
  const dataToFetchInPieces = prepareInPiecesDataModelToSend(dataToFetch);

  sendBookmarksRecursive(dataToFetchInPieces).then(data => resolve(data));
  
  // fetchJsonSendAndReceive<BookmarksDataModelFromFetch>(bookmarksEndpoint(), dataToFetch, bookmarksDataModelMock())
  //   .then(fetchData => {
  //     resolve({data: new GenericTree<BookmarkItem>('', undefined)});
  //   });
});

const sendBookmarksRecursive = (dataToFetchInPieces: DataToSendInPieces[]) => new Promise<void>(resolve => {
  if (dataToFetchInPieces.length === 0) {
    resolve();
  } else {
    const dataToFetch = dataToFetchInPieces[0];
    const restOfPieces = dataToFetchInPieces.slice(1);
    
    fetchJsonSendAndReceive<DataToSendInPieces>(bookmarksEndpoint(), dataToFetch, {data: bookmarksDataModelMock().data, isFinished: false })
      .then(() => {
        setTimeout(() => sendBookmarksRecursive(restOfPieces).then(data => resolve(data)), 0);
      });
  }
});

const searchBookmarks = (textToSearch: string) => 
  fetchJsonSendAndReceive<BookmarksDataModelFromFetch>(searchBookmarksEndpoint(), {data: textToSearch}, bookmarksDataModelMock());

export const BookmarksActions = { getBookmarks, sendBookmarks, searchBookmarks };
