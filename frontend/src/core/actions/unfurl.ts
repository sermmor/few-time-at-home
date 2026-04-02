import { unfurlDataModelMock, UnfurlYoutubeImageModelMock } from "../../data-model/mock/unfurlDataMock";
import { UnfurlDataModel, UnfurlYoutubeImageModel } from "../../data-model/unfurl";
import { fetchJsonSendAndReceive } from "../fetch-utils";
import { unfurlEndpoint, unfurlYoutubeImageEndpoint } from "../urls-and-end-points";

const getUnfurl = async(dataToSend: {urlList: string[], loadTime: number}): Promise<UnfurlDataModel[]> => {
  const data = await fetchJsonSendAndReceive<{data: UnfurlDataModel[]}>(unfurlEndpoint(), dataToSend, unfurlDataModelMock());
  return (data as any).data as UnfurlDataModel[];
}

//static unfurlYoutubeImageEndpoint = "/unfurl-youtube-image";
const getUnfurlYoutubeImage = async(dataToSend: {youtubeUrl: string, indexItem: number}): Promise<UnfurlYoutubeImageModel> => 
  fetchJsonSendAndReceive<UnfurlYoutubeImageModel>(unfurlYoutubeImageEndpoint(), dataToSend, UnfurlYoutubeImageModelMock());

export const UnfurlActions = { getUnfurl, getUnfurlYoutubeImage };
