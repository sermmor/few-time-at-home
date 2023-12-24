
import { CloudDataModel, CloudDataModelFromFetch, CloudDrivesResponse, parseFromFetchToDataModel, GenericCloudRequest, UpdatedResponse, MessageResponse, ChangePathCloudRequest, UploadFilesToCloudRequest } from "../../data-model/cloud";
import { cloudDataModelMock, cloudDrivesResponseMock, messageResponseMock, updatedResponseMock } from "../../data-model/mock/cloudMock";
import { fetchJsonReceive, fetchJsonSendAndReceive, fetchSendFileAndReceiveConfirmation } from "../fetch-utils";
import { getCloudEndpoint } from "../urls-and-end-points";

const getDrivesList = (): Promise<CloudDrivesResponse> => 
  fetchJsonReceive<CloudDrivesResponse>(getCloudEndpoint('getDrivesList'), cloudDrivesResponseMock());

const updateIndexing = (data: GenericCloudRequest) => 
  fetchJsonSendAndReceive<UpdatedResponse>(getCloudEndpoint("updateIndexing"), {drive: data.drive}, updatedResponseMock());

const getAllItems = (drive: string): Promise<CloudDataModel> => new Promise<CloudDataModel>(resolve => {
  fetchJsonSendAndReceive<CloudDataModelFromFetch>(getCloudEndpoint('getAllItems'), { drive }, cloudDataModelMock())
    .then(fetchData => {
      resolve(parseFromFetchToDataModel(fetchData));
    });
});

const createFolder = (data: GenericCloudRequest) => 
  fetchJsonSendAndReceive<UpdatedResponse>(getCloudEndpoint("createFolder"), data, updatedResponseMock());

const createBlankFile = (data: GenericCloudRequest) => 
  fetchJsonSendAndReceive<UpdatedResponse>(getCloudEndpoint("createBlankFile"), data, updatedResponseMock());

const moveItem = (data: ChangePathCloudRequest) => 
  fetchJsonSendAndReceive<MessageResponse>(getCloudEndpoint("moveItem"), data, messageResponseMock());

const renameItem = (data: ChangePathCloudRequest) => 
  fetchJsonSendAndReceive<MessageResponse>(getCloudEndpoint("renameItem"), data, messageResponseMock());

const uploadFile = (data: UploadFilesToCloudRequest) =>
  fetchSendFileAndReceiveConfirmation<MessageResponse>(getCloudEndpoint('uploadFile'), data, messageResponseMock());

// TODO downloadFile
// TODO https://stackoverflow.com/questions/7288814/download-a-file-from-nodejs-server-using-express

export const CloudActions = { getDrivesList, updateIndexing, getAllItems, createFolder, createBlankFile, moveItem, renameItem, uploadFile };
