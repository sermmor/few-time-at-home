import { ConfigurationDataModel } from "../../data-model/configuration";
import { ConfigurationDataModelMock } from "../../data-model/mock/configurationMock";
import { fetchJson } from "../fetch-utils";
import { configurationEndpoint } from "../urls-and-end-points";

const getConfiguration = (): Promise<ConfigurationDataModel> => 
  fetchJson<ConfigurationDataModel>(configurationEndpoint, ConfigurationDataModelMock());

export const ConfigurationActions = { getConfiguration };
