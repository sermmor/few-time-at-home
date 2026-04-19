import { readLaterAddMessagesResponseMock, readLaterGetMessagesResponseMock, readLaterRemoveMessagesResponseMock, readLaterSearchMessagesResponseMock } from "../../data-model/mock/readLaterRssMock";
import { ReadLaterAddMessagesRequest, ReadLaterAddMessagesResponse, ReadLaterGetMessagesRequest, ReadLaterGetMessagesResponse, ReadLaterRemoveMessagesRequest, ReadLaterRemoveMessagesResponse, ReadLaterSearchMessagesRequest, ReadLaterSearchMessagesResponse } from "../../data-model/readLaterRss";
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

export const ReadLaterRSSActions = { getMessage, getMessageRandom, add, remove, search };
