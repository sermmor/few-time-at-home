import { unfurlDataModelMock } from "../../data-model/mock/unfurlDataMock";
import { UnfurlDataModel } from "../../data-model/unfurl";
import { fetchJsonSendAndReceive } from "../fetch-utils";
import { unfurlEndpoint } from "../urls-and-end-points";

const getUnfurl = async(dataToSend: {urlList: string[], loadTime: number}): Promise<UnfurlDataModel[]> => {
  const data = await fetchJsonSendAndReceive<{data: UnfurlDataModel[]}>(unfurlEndpoint(), dataToSend, unfurlDataModelMock());
  return (data as any).data as UnfurlDataModel[];
}

export const UnfurlActions = { getUnfurl };
