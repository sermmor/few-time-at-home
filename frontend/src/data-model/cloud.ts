import { GenericTree } from "../service/trees/genericTree";

export const urlFolder = 'urlfolder:///';

export const isFolder = (element: CloudItem) => !element.isNotFolder;

export interface CloudItemFromFetch {
  name: string;
  path: string;
  driveName: string;
}

export interface CloudsDataModelFromFetch {
  data: CloudItemFromFetch[];
}

export interface CloudItem {
  name: string;
  isNotFolder: boolean;
  driveName: string;
}

export interface CloudsDataModel {
  data: GenericTree<CloudItem>;
}

export const parseFromFetchToDataModel = (cloudFetchStyle: CloudsDataModelFromFetch): CloudsDataModel => {
  const dataForTree: {path: string, data: CloudItem}[] = cloudFetchStyle.data.map(item => ({
    path: item.path ? item.path : '/',
    data: {
      name: item.name,
      driveName: item.driveName,
      isNotFolder: true,
    }
  }));
  return {
    data: GenericTree.parseFromListWithPaths(dataForTree)!,
  };
}

export const parseFromDataModelToFetchToSend = (Clouds: CloudsDataModel): CloudsDataModelFromFetch => {
  const dataFromTree: {path: string, data: CloudItem}[] = GenericTree.parseTreeToList(Clouds.data);
  return {
    data: dataFromTree.map(item => ({
      name: item.data.name,
      path: item.path,
      driveName: item.data.driveName,
    }))
  };
}

export interface GenericCloudRequest {
  drive: string;
  path: string;
}

export interface ChangePathCloudRequest {
  drive: string;
  oldPath: string;
  newPath: string;
}

export interface UploadFilesToCloudRequest {
  drive: string;
  pathToSave: string;
  numberOfFiles: number;
  files: any[];
}
