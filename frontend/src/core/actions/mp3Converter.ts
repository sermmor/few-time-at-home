import { audioConverterDataModelMock, videoConverterDataModelMock } from "../../data-model/mock/mp3ConverterMock";
import { AudioConverterDataModel, VideoConverterDataModel } from "../../data-model/mp3Converter";
import { fetchJsonSendAndReceive } from "../fetch-utils";
import { audioToMp3ConverterEndpoint, videoToMp3ConverterEndpoint } from "../urls-and-end-points";

const sendVideoToMp3 = (data: VideoConverterDataModel) => 
  fetchJsonSendAndReceive<{data: VideoConverterDataModel}>(videoToMp3ConverterEndpoint(), {data}, videoConverterDataModelMock());

  
const sendAudioToMp3 = (data: AudioConverterDataModel) =>
  fetchJsonSendAndReceive<{data: AudioConverterDataModel}>(audioToMp3ConverterEndpoint(), {data}, audioConverterDataModelMock());

export const Mp3ConverterActions = { sendVideoToMp3, sendAudioToMp3 };
