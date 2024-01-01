import { ComandLineRequest, ComandLineResponse, ConfigurationDataModel } from "../../data-model/configuration";
import { comandLineResponseMock, configurationDataModelMock } from "../../data-model/mock/configurationMock";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { configurationEndpoint, configurationSendCommandEndpoint } from "../urls-and-end-points";

const getConfiguration = (): Promise<ConfigurationDataModel> => 
  fetchJsonReceive<ConfigurationDataModel>(configurationEndpoint(), configurationDataModelMock());

const sendConfiguration = (data: ConfigurationDataModel) => 
  fetchJsonSendAndReceive<ConfigurationDataModel>(configurationEndpoint(), data, configurationDataModelMock());

const sendCommandLine = (data: ComandLineRequest) => 
  fetchJsonSendAndReceive<ComandLineResponse>(configurationSendCommandEndpoint(), data, comandLineResponseMock());

export const ConfigurationActions = { getConfiguration, sendConfiguration, sendCommandLine };
