import { unfurlDataModelMock } from "../../data-model/mock/unfurlDataMock";
import { UnfurlDataModel } from "../../data-model/unfurl";
import { fetchJsonSendAndReceive } from "../fetch-utils";
import { unfurlEndpoint } from "../urls-and-end-points";

const getUnfurl = (dataToSend: {url: string}): Promise<UnfurlDataModel> => 
  fetchJsonSendAndReceive<UnfurlDataModel>(unfurlEndpoint(), dataToSend, unfurlDataModelMock());

export const UnfurlActions = { getUnfurl };
