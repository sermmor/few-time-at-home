
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

// TODO uploadFile, downloadFile
// TODO: To uploadFile use https://stackoverflow.com/a/36082038 (revisa: https://stackoverflow.com/questions/64488160/typescript-and-react-with-file-upload-typing ;;; https://www.typescriptlang.org/play?#code/JYWwDg9gTgLgBAJQKYEMDG8BmUIjgIilQ3wG4BYAKCrQgDsBneAYV0jqTvgF44AKAJRxuAPjgBvKnGlxajeAG1MwADZIAykjUYkAEwA0cBkhgAxVRq1IdugLrDExGADoArsfUwUMJAB5zaiKCcAD0IXAoKgwQcDBQwHpwvkzxdADmcAA+cABCKhAARiJUUjJyTHAAFih0umoAkiAoaUjM1elIDpiudBjA9PxIAFyO6C5tNS0AogBunDC+ABIAKgCyADL1dGCuMFNqIPMiQpKUMuey9BXKauvAFbxIzl5QLS43SAwU1GcX0sCYfgAQg+dyYQiIMFcUDo31Kf2MZgsmm0Pl0fFB9xgCgADLYBN9zgBfOG-aTleCuMD5FC6AKdXjdXowfp0QYjZBjZyrCDuJCzeZLNbrdRgGr7JCHLiGHl8gVcY4SeEXAH8D4o6xok7Kv7kq5YaAgAAi3hQDg4AHc4KZDSavIJCbrzphbabnCgwGBOOj8KBmkh8IZ1VYbEHkSG0c46ChDgSdTIicqSVQiUA
// TODO: AND DRAG & DROP https://claritydev.net/blog/react-typescript-drag-drop-file-upload-guide
// TODO si las cosas fallan en la parte servidor, ojear esto https://code.tutsplus.com/es/file-upload-with-multer-in-node--cms-32088t ;;; https://github.com/tutsplus/file-upload-with-multer-in-node

export const CloudActions = { getDrivesList, updateIndexing, getAllItems, createFolder, createBlankFile, moveItem, renameItem, uploadFile };
