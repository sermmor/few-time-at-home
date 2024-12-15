import { readLaterAddMessagesResponseMock, readLaterGetMessagesResponseMock, readLaterRemoveMessagesResponseMock } from "../../data-model/mock/readLaterRssMock";
import { ReadLaterAddMessagesRequest, ReadLaterAddMessagesResponse, ReadLaterGetMessagesRequest, ReadLaterGetMessagesResponse, ReadLaterRemoveMessagesRequest, ReadLaterRemoveMessagesResponse } from "../../data-model/readLaterRss";
import { fetchJsonSendAndReceive } from "../fetch-utils";
import { readLaterRSSEndpoint } from "../urls-and-end-points";

const getMessage = (request: ReadLaterGetMessagesRequest): Promise<ReadLaterGetMessagesResponse> => 
  fetchJsonSendAndReceive<ReadLaterGetMessagesResponse>(readLaterRSSEndpoint('get'), request, readLaterGetMessagesResponseMock());

const add = (request: ReadLaterAddMessagesRequest): Promise<ReadLaterAddMessagesResponse> => 
  fetchJsonSendAndReceive<ReadLaterAddMessagesResponse>(readLaterRSSEndpoint('add'), request, readLaterAddMessagesResponseMock());

const remove = (request: ReadLaterRemoveMessagesRequest): Promise<ReadLaterRemoveMessagesResponse> => 
  fetchJsonSendAndReceive<ReadLaterRemoveMessagesResponse>(readLaterRSSEndpoint('remove'), request, readLaterRemoveMessagesResponseMock());

export const ReadLaterRSSActions = { getMessage, add, remove };
