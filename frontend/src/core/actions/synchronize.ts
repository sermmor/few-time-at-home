import { MessageResponse } from "../../data-model/cloud";
import { messageResponseMock } from "../../data-model/mock/cloudMock";
import { fetchJsonSendAndReceive } from "../fetch-utils";
import { synchronizeDownloadEndpoint, synchronizeUploadEndpoint } from "../urls-and-end-points";

const uploadData = (url: string) => 
  fetchJsonSendAndReceive<MessageResponse>(synchronizeUploadEndpoint(), {url}, messageResponseMock());
const downloadData = (url: string) => 
  fetchJsonSendAndReceive<MessageResponse>(synchronizeDownloadEndpoint(), {url}, messageResponseMock());

export const synchronizeActions = { uploadData, downloadData };
