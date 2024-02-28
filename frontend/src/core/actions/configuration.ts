import { ComandLineRequest, ComandLineResponse, ConfigurationDataModel, ConfigurationTypeDataModel } from "../../data-model/configuration";
import { comandLineResponseMock, configurationDataModelMock, configurationTypeDataModelMock } from "../../data-model/mock/configurationMock";
import { fetchJsonReceive, fetchJsonSendAndReceive } from "../fetch-utils";
import { configurationEndpoint, configurationListByTypeEndpoint, configurationSendCommandEndpoint, configurationTypesEndpoint } from "../urls-and-end-points";

const getConfigurationType = (): Promise<ConfigurationTypeDataModel> => 
  fetchJsonReceive<ConfigurationTypeDataModel>(configurationTypesEndpoint(), configurationTypeDataModelMock());

const getConfiguration = (types: string[], indexType = 0, config: ConfigurationDataModel[] = []): Promise<ConfigurationDataModel[]> => new Promise<ConfigurationDataModel[]>(resolve => {
  const type = types[indexType];
  const configurationList: ConfigurationDataModel[] = config;
  fetchJsonSendAndReceive<any>(configurationListByTypeEndpoint(), {type}, configurationDataModelMock(type)).then((parcialConfig: any) => {
    configurationList.push({
      type,
      content: parcialConfig.data,
    });

    if (indexType + 1 < types.length) {
      getConfiguration(types, indexType + 1, configurationList).then(finalConfig => resolve(finalConfig));
    } else {
      resolve(configurationList);
    }
  });
})

const sendConfiguration = (data: ConfigurationDataModel) => 
  fetchJsonSendAndReceive<ConfigurationDataModel>(configurationEndpoint(), data, configurationDataModelMock(data.type));

const sendCommandLine = (data: ComandLineRequest) => 
  fetchJsonSendAndReceive<ComandLineResponse>(configurationSendCommandEndpoint(), data, comandLineResponseMock());

export const ConfigurationActions = { getConfiguration, sendConfiguration, sendCommandLine, getConfigurationType };
