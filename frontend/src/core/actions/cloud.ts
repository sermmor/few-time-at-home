
import { CloudDataModel, CloudDataModelFromFetch, CloudDrivesResponse, parseFromFetchToDataModel, GenericCloudRequest, UpdatedResponse, MessageResponse, ChangePathCloudRequest, UploadFilesToCloudRequest, DownloadFileToCloudResquest, SearchItemsResquest, SearchItemsResponse } from "../../data-model/cloud";
import { cloudDataModelMock, cloudDrivesResponseMock, messageResponseMock, updatedResponseMock } from "../../data-model/mock/cloudMock";
import { fetchDownloadFile, fetchGetTextDownloadFile, fetchJsonReceive, fetchJsonSendAndReceive, fetchSendFileAndReceiveConfirmation } from "../fetch-utils";
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

const searchAllItems = (data: SearchItemsResquest) => 
  fetchJsonSendAndReceive<SearchItemsResponse>(getCloudEndpoint('search'), data, {search: []});

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

const downloadFile = (data: DownloadFileToCloudResquest) => 
  fetchDownloadFile(getCloudEndpoint('downloadFile'), data);

const openFileContentInEditor = (data: DownloadFileToCloudResquest): Promise<string> => 
  fetchGetTextDownloadFile(getCloudEndpoint('downloadFile'), data);

const deleteFileOrFolder = (data: GenericCloudRequest) => 
  fetchJsonSendAndReceive<MessageResponse>(getCloudEndpoint("deleteFileOrFolder"), data, messageResponseMock());

export const CloudActions = { getDrivesList, updateIndexing, getAllItems, searchAllItems, createFolder, createBlankFile, moveItem, renameItem, uploadFile, downloadFile, deleteFileOrFolder, openFileContentInEditor };
