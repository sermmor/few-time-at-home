import {
  GetAddBookmarkRequest,
  GetAddBookmarkResponse,
  GetAddFolderResponse,
  GetEditBookmarkRequest,
  GetEditFolderRequest,
  GetMoveRequest,
  GetPathRequest,
  GetPathResponse,
  GetRemoveBookmarkRequest,
  GetRemoveFolderRequest,
  GetRemoveInTrashRequest,
  GetSearchListRequest,
  GetSearchListResponse,
  GetTrashListRequest,
  GetTrashListResponse
} from "../../data-model/bookmarks";
import {
  getBookmarkAndFolderListModelMock,
  getBookmarkListModelMock,
  getOnlyABookmarkDataModelMock,
  getOnlyAFolderDataModelMock
} from "../../data-model/mock/bookmarksMock";
import { fetchJsonSendAndReceive } from "../fetch-utils";
import { bookmarksEndpoint } from "../urls-and-end-points";

const getPathList = (request: GetPathRequest = { path: '/' }): Promise<GetPathResponse> => 
  fetchJsonSendAndReceive<GetPathResponse>(bookmarksEndpoint('getPathList'), request, getBookmarkAndFolderListModelMock());

const getTrashList = (request: GetTrashListRequest): Promise<GetTrashListResponse> => 
  fetchJsonSendAndReceive<GetTrashListResponse>(bookmarksEndpoint('getTrashList'), request, getBookmarkListModelMock());

const getSearch = (request: GetSearchListRequest): Promise<GetSearchListResponse> => 
  fetchJsonSendAndReceive<GetSearchListResponse>(bookmarksEndpoint('search'), request, getBookmarkListModelMock());

const getSearchTrash = (request: GetSearchListRequest): Promise<GetSearchListResponse> => 
  fetchJsonSendAndReceive<GetSearchListResponse>(bookmarksEndpoint('searchInTrash'), request, getBookmarkListModelMock());

const getAddBookmark = (request: GetAddBookmarkRequest): Promise<GetAddBookmarkResponse> => 
  fetchJsonSendAndReceive<GetAddBookmarkResponse>(bookmarksEndpoint('addBookmark'), request, getOnlyABookmarkDataModelMock());

const getAddFolder = (request: GetAddBookmarkRequest): Promise<GetAddFolderResponse> => 
  fetchJsonSendAndReceive<GetAddFolderResponse>(bookmarksEndpoint('addBookmark'), request, getOnlyAFolderDataModelMock());

const getRemoveBookmark = (request: GetRemoveBookmarkRequest): Promise<GetPathResponse> => 
  fetchJsonSendAndReceive<GetPathResponse>(bookmarksEndpoint('removeBookmark'), request, getBookmarkAndFolderListModelMock());

const getRemoveFolder = (request: GetRemoveFolderRequest): Promise<GetPathResponse> => 
  fetchJsonSendAndReceive<GetPathResponse>(bookmarksEndpoint('removeFolder'), request, getBookmarkAndFolderListModelMock());

const getRemoveInTrash = (request: GetRemoveInTrashRequest): Promise<GetPathResponse> => 
  fetchJsonSendAndReceive<GetPathResponse>(bookmarksEndpoint('removeInTrash'), request, getBookmarkAndFolderListModelMock());

const getEditBookmark = (request: GetEditBookmarkRequest): Promise<GetPathResponse> => 
  fetchJsonSendAndReceive<GetPathResponse>(bookmarksEndpoint('editBookmark'), request, getBookmarkAndFolderListModelMock());

const getEditFolder = (request: GetEditFolderRequest): Promise<GetPathResponse> => 
  fetchJsonSendAndReceive<GetPathResponse>(bookmarksEndpoint('editFolder'), request, getBookmarkAndFolderListModelMock());

const getMove = (request: GetMoveRequest): Promise<GetPathResponse> => 
  fetchJsonSendAndReceive<GetPathResponse>(bookmarksEndpoint('move'), request, getBookmarkAndFolderListModelMock());

export const BookmarksActions = {
  getPathList,
  getTrashList,
  getSearch,
  getSearchTrash,
  getAddBookmark,
  getAddFolder,
  getRemoveBookmark,
  getRemoveFolder,
  getRemoveInTrash,
  getEditBookmark,
  getEditFolder,
  getMove,
};
