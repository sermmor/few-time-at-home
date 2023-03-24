
import { BookmarksDataModel } from "../../data-model/bookmarks";
import { bookmarksDataModelMock } from "../../data-model/mock/bookmarksMock";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { bookmarksEndpoint } from "../urls-and-end-points";

const getBookmarks = (): Promise<BookmarksDataModel> => 
  fetchJsonReceive<BookmarksDataModel>(bookmarksEndpoint(), bookmarksDataModelMock());

const sendBookmarks = (data: BookmarksDataModel) => 
  fetchJsonSendAndReceive<BookmarksDataModel>(bookmarksEndpoint(), data, bookmarksDataModelMock());

export const BookmarksActions = { getBookmarks, sendBookmarks };
