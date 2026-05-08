import { readLaterAddMessagesResponseMock, readLaterGetMessagesResponseMock, readLaterRemoveMessagesResponseMock, readLaterSearchMessagesResponseMock } from "../../data-model/mock/readLaterRssMock";
import {
  ReadLaterAddMessagesRequest, ReadLaterAddMessagesResponse,
  ReadLaterGetAllRequest, ReadLaterGetAllResponse,
  ReadLaterGetMessagesRequest, ReadLaterGetMessagesResponse,
  ReadLaterRemoveMessagesRequest, ReadLaterRemoveMessagesResponse,
  ReadLaterSearchMessagesRequest, ReadLaterSearchMessagesResponse,
  ReadLaterUpdateMessageRequest, ReadLaterUpdateMessageResponse,
} from "../../data-model/readLaterRss";
import { fetchJsonSendAndReceive } from "../fetch-utils";
import { readLaterRSSEndpoint } from "../urls-and-end-points";

const getMessage = (request: ReadLaterGetMessagesRequest): Promise<ReadLaterGetMessagesResponse> =>
  fetchJsonSendAndReceive<ReadLaterGetMessagesResponse>(readLaterRSSEndpoint('get'), request, readLaterGetMessagesResponseMock());

const getMessageRandom = (request: ReadLaterGetMessagesRequest): Promise<ReadLaterGetMessagesResponse> =>
  fetchJsonSendAndReceive<ReadLaterGetMessagesResponse>(readLaterRSSEndpoint('getRandom'), request, readLaterGetMessagesResponseMock());

const add = (request: ReadLaterAddMessagesRequest): Promise<ReadLaterAddMessagesResponse> =>
  fetchJsonSendAndReceive<ReadLaterAddMessagesResponse>(readLaterRSSEndpoint('add'), request, readLaterAddMessagesResponseMock());

const remove = (request: ReadLaterRemoveMessagesRequest): Promise<ReadLaterRemoveMessagesResponse> =>
  fetchJsonSendAndReceive<ReadLaterRemoveMessagesResponse>(readLaterRSSEndpoint('remove'), request, readLaterRemoveMessagesResponseMock());

const search = (request: ReadLaterSearchMessagesRequest): Promise<ReadLaterSearchMessagesResponse> =>
  fetchJsonSendAndReceive<ReadLaterSearchMessagesResponse>(readLaterRSSEndpoint('search'), request, readLaterSearchMessagesResponseMock());

const getAll = (request: ReadLaterGetAllRequest): Promise<ReadLaterGetAllResponse> =>
  fetchJsonSendAndReceive<ReadLaterGetAllResponse>(readLaterRSSEndpoint('getAll'), request, { data: [], total: 0 });

const update = (request: ReadLaterUpdateMessageRequest): Promise<ReadLaterUpdateMessageResponse> =>
  fetchJsonSendAndReceive<ReadLaterUpdateMessageResponse>(readLaterRSSEndpoint('update'), request, { response: '' });

export const ReadLaterRSSActions = { getMessage, getMessageRandom, add, remove, search, getAll, update };
