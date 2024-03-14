import { audioConverterDataModelMock, converterDataModelMock, videoConverterDataModelMock } from "../../data-model/mock/mp3ConverterMock";
import { AudioConverterDataModel, ConverterDataModel, VideoConverterDataModel } from "../../data-model/mp3Converter";
import { fetchJsonSendAndReceive, fetchJsonSendAndTextReceive } from "../fetch-utils";
import { audioToMp3ConverterEndpoint, stillConverterEndpoint, videoToMp3ConverterEndpoint } from "../urls-and-end-points";

const sendVideoToMp3 = (data: VideoConverterDataModel) => 
  fetchJsonSendAndReceive<ConverterDataModel>(videoToMp3ConverterEndpoint(), {data}, converterDataModelMock());

  
const sendAudioToMp3 = (data: AudioConverterDataModel) =>
  fetchJsonSendAndReceive<ConverterDataModel>(audioToMp3ConverterEndpoint(), {data}, converterDataModelMock());

const stillConverting = () =>
  fetchJsonSendAndReceive<ConverterDataModel>(stillConverterEndpoint(), {}, converterDataModelMock());

export const Mp3ConverterActions = { sendVideoToMp3, sendAudioToMp3, stillConverting };
