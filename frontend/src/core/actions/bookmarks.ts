
import { BookmarksDataModel, BookmarksDataModelFromFetch, parseFromDataModelToFetchToSend, parseFromFetchToDataModel } from "../../data-model/bookmarks";
import { bookmarksDataModelMock } from "../../data-model/mock/bookmarksMock";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { bookmarksEndpoint, searchBookmarksEndpoint } from "../urls-and-end-points";

const getBookmarks = (): Promise<BookmarksDataModel> => new Promise<BookmarksDataModel>(resolve => {
  fetchJsonReceive<BookmarksDataModelFromFetch>(bookmarksEndpoint(), bookmarksDataModelMock())
    .then(fetchData => {
      resolve(parseFromFetchToDataModel(fetchData));
    });
});

const sendBookmarks = (data: BookmarksDataModel) => new Promise<BookmarksDataModel>(resolve => {
  const dataToFetch = parseFromDataModelToFetchToSend(data);
  fetchJsonSendAndReceive<BookmarksDataModelFromFetch>(bookmarksEndpoint(), dataToFetch, bookmarksDataModelMock())
    .then(fetchData => {
      resolve(parseFromFetchToDataModel(fetchData));
    });

});

const searchBookmarks = (textToSearch: string) => 
  fetchJsonSendAndReceive<BookmarksDataModelFromFetch>(searchBookmarksEndpoint(), {data: textToSearch}, bookmarksDataModelMock());

export const BookmarksActions = { getBookmarks, sendBookmarks, searchBookmarks };
