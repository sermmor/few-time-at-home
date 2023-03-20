import { ConfigurationDataModel } from "../../data-model/configuration";
import { configurationDataModelMock } from "../../data-model/mock/configurationMock";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { configurationEndpoint } from "../urls-and-end-points";

const getConfiguration = (): Promise<ConfigurationDataModel> => 
  fetchJsonReceive<ConfigurationDataModel>(configurationEndpoint(), configurationDataModelMock());

const sendConfiguration = (data: ConfigurationDataModel) => 
  fetchJsonSendAndReceive<ConfigurationDataModel>(configurationEndpoint(), data, configurationDataModelMock());

export const ConfigurationActions = { getConfiguration, sendConfiguration };
