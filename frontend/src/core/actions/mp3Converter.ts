import { audioConverterDataModelMock, videoConverterDataModelMock } from "../../data-model/mock/mp3ConverterMock";
import { AudioConverterDataModel, VideoConverterDataModel } from "../../data-model/mp3Converter";
import { fetchJsonSendAndTextReceive } from "../fetch-utils";
import { audioToMp3ConverterEndpoint, stillConverterEndpoint, videoToMp3ConverterEndpoint } from "../urls-and-end-points";

const sendVideoToMp3 = (data: VideoConverterDataModel) => 
  fetchJsonSendAndTextReceive<{data: VideoConverterDataModel}>(videoToMp3ConverterEndpoint(), {data}, videoConverterDataModelMock());

  
const sendAudioToMp3 = (data: AudioConverterDataModel) =>
  fetchJsonSendAndTextReceive<{data: AudioConverterDataModel}>(audioToMp3ConverterEndpoint(), {data}, audioConverterDataModelMock());

const stillConverting = () =>
  fetchJsonSendAndTextReceive<{}>(stillConverterEndpoint(), {}, audioConverterDataModelMock());

export const Mp3ConverterActions = { sendVideoToMp3, sendAudioToMp3, stillConverting };
