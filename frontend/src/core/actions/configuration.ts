import { ComandLineRequest, ComandLineResponse, ConfigurationDataModel, ConfigurationTypeDataModel } from "../../data-model/configuration";
import { comandLineResponseMock, configurationDataModelMock, configurationTypeDataModelMock } from "../../data-model/mock/configurationMock";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { configurationEndpoint, configurationListByTypeEndpoint, configurationSendCommandEndpoint, configurationTypesEndpoint } from "../urls-and-end-points";

const getConfigurationType = (): Promise<ConfigurationTypeDataModel> => 
  fetchJsonReceive<ConfigurationTypeDataModel>(configurationTypesEndpoint(), configurationTypeDataModelMock());

const getConfiguration = (types: string[], indexType = 0, config: any = {}): Promise<ConfigurationDataModel> => new Promise<ConfigurationDataModel>(resolve => {
  fetchJsonSendAndReceive<any>(configurationListByTypeEndpoint(), {type: types[indexType]}, {}).then((parcialConfig: any) => {
    let nextConfig: any;
    if (types[indexType] === 'configuration') { 
      nextConfig = parcialConfig.data;
    } else {
      nextConfig = config;
      nextConfig[types[indexType]] = parcialConfig.data;
    }

    if (indexType + 1 < types.length) {
      getConfiguration(types, indexType + 1, nextConfig).then(finalConfig => resolve(finalConfig));
    } else {
      resolve(nextConfig);
    }
  });
})

const sendConfiguration = (data: ConfigurationDataModel) => 
  fetchJsonSendAndReceive<ConfigurationDataModel>(configurationEndpoint(), data, configurationDataModelMock());

const sendCommandLine = (data: ComandLineRequest) => 
  fetchJsonSendAndReceive<ComandLineResponse>(configurationSendCommandEndpoint(), data, comandLineResponseMock());

export const ConfigurationActions = { getConfiguration, sendConfiguration, sendCommandLine, getConfigurationType };
