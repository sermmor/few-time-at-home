import { ConfigurationDataModel } from "../../data-model/configuration";
import { ConfigurationDataModelMock } from "../../data-model/mock/configurationMock";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { configurationEndpoint } from "../urls-and-end-points";

const getConfiguration = (): Promise<ConfigurationDataModel> => 
  fetchJsonReceive<ConfigurationDataModel>(configurationEndpoint, ConfigurationDataModelMock());

const sendConfiguration = (data: ConfigurationDataModel) => 
  fetchJsonSendAndReceive<ConfigurationDataModel>(configurationEndpoint, data, ConfigurationDataModelMock());

export const ConfigurationActions = { getConfiguration, sendConfiguration };
