
import { CloudDataModel, CloudDrivesResponse, GenericCloudRequest, UpdatedResponse, MessageResponse, ChangePathCloudRequest, UploadFilesToCloudRequest, DownloadFileToCloudResquest, SearchItemsResquest, SearchItemsResponse, GetFolderCloudRequest, MoveCloudRequest, SaveCloudFileRequest } from "../../data-model/cloud";
import { cloudDataModelMock, cloudDrivesResponseMock, messageResponseMock, updatedResponseMock } from "../../data-model/mock/cloudMock";
import { fetchDownloadFile, fetchGetTextDownloadFile, fetchJsonReceive, fetchJsonSendAndReceive, fetchSendFileAndReceiveConfirmation } from "../fetch-utils";
import { getCloudEndpoint } from "../urls-and-end-points";

const getDrivesList = (): Promise<CloudDrivesResponse> => 
  fetchJsonReceive<CloudDrivesResponse>(getCloudEndpoint('getDrivesList'), cloudDrivesResponseMock());

const getAllFolderItems = (data: GetFolderCloudRequest): Promise<CloudDataModel> =>
  fetchJsonSendAndReceive<CloudDataModel>(getCloudEndpoint('getFolderContent'), data, cloudDataModelMock());

const searchAllItemsInFolder = (data: SearchItemsResquest) => 
  fetchJsonSendAndReceive<SearchItemsResponse>(getCloudEndpoint('searchInFolder'), data, {search: []});

const createFolder = (path: string) => 
  fetchJsonSendAndReceive<MessageResponse>(getCloudEndpoint("createFolder"), { path }, messageResponseMock());

const createBlankFile = (path: string) => 
  fetchJsonSendAndReceive<UpdatedResponse>(getCloudEndpoint("createBlankFile"), { path }, updatedResponseMock());

const saveFile = (data: SaveCloudFileRequest) => 
  fetchJsonSendAndReceive<UpdatedResponse>(getCloudEndpoint("saveFile"), data, updatedResponseMock());

const moveItem = (data: MoveCloudRequest) => 
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

export const CloudActions = { getDrivesList, getAllFolderItems, searchAllItemsInFolder, createFolder, createBlankFile, saveFile, moveItem, renameItem, uploadFile, downloadFile, deleteFileOrFolder, openFileContentInEditor };
