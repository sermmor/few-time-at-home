import { GenericTree } from "../service/trees/genericTree";
import { DownloadFile, UploadFiles } from "./commons";

export const urlFolder = 'urlfolder:///';

export const addPrefixUrlFolder = (nameFolder: string | undefined): string => urlFolder + nameFolder;

export const isFolder = (element: CloudItem) => !element.isNotFolder;

export interface CloudDrivesResponse {
  driveList: string[];
}

export interface UpdatedResponse {
  isUpdated: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface CloudItemFromFetch {
  name: string;
  path: string;
  driveName: string;
}

export interface CloudDataModelFromFetch {
  allItems: CloudItemFromFetch[];
}

export interface CloudItem {
  name: string;
  isNotFolder: boolean;
  driveName: string;
  path: string;
}

export interface CloudDataModel {
  data: GenericTree<CloudItem>;
}

const buildPath = (pathWithFile: string) => {
  const splitedPath = pathWithFile.split('/');
  return splitedPath.slice(0, splitedPath.length - 1).join('/');
}

export const parseFromFetchToDataModel = (cloudFetchStyle: CloudDataModelFromFetch): CloudDataModel => {
  const dataForTree: {path: string, data: CloudItem}[] = cloudFetchStyle.allItems.map(item => ({
    path: item.path ? buildPath(item.path) : '/',
    data: {
      name: item.name,
      driveName: item.driveName,
      isNotFolder: true,
      path: `${item.path}`,
    }
  }));
  return {
    data: GenericTree.parseFromListWithPaths(dataForTree)!,
  };
}

export const parseFromDataModelToFetchToSend = (Clouds: CloudDataModel): CloudDataModelFromFetch => {
  const dataFromTree: {path: string, data: CloudItem}[] = GenericTree.parseTreeToList(Clouds.data);
  return {
    allItems: dataFromTree.map(item => ({
      name: item.data.name,
      path: item.path,
      driveName: item.data.driveName,
    }))
  };
}

export interface GenericCloudRequest {
  drive: string;
  path?: string;
}

export interface ChangePathCloudRequest {
  drive: string;
  oldPath: string;
  newPath: string;
}

export interface UploadFilesToCloudRequest extends UploadFiles {
}

export interface DownloadFileToCloudResquest extends DownloadFile {
}