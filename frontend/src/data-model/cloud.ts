import { DownloadFile, UploadFiles } from "./commons";

export const urlFolder = 'urlfolder:///';

export const isFileInRootPath = (nameDrive: string, itemPath: string): boolean => {
  // For instance: nameDrive='cloud' item.path='cloud/Andalucia.jpeg' is true
  const splitPath = itemPath.split('/');
  return splitPath.length === 2 && splitPath[0] === nameDrive;
}

// For instance: item.path='cloud/Images/Andalucia.jpeg' => 'Images'
export const getPathFolderContainer = (itemPath: string): string => {
  const splitPath = itemPath.split('/');
  return splitPath.slice(0, splitPath.length - 1).join('/');
}

export const addPrefixUrlFolder = (nameFolder: string | undefined): string => urlFolder + nameFolder;

export interface CloudDrivesResponse {
  driveList: string[];
}

export interface UpdatedResponse {
  isUpdated: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface CloudItem {
  name: string;
  path: string;
  isFolder: boolean;
  driveName: string;
}

export interface CloudDataModel {
  data: CloudItem[];
}

export interface GenericCloudRequest {
  drive: string;
  path: string;
}

export interface ChangePathCloudRequest {
  oldPath: string;
  newPath: string;
}

export interface UploadFilesToCloudRequest extends UploadFiles {
}

export interface DownloadFileToCloudResquest extends DownloadFile {
}

export interface SearchItemsResquest {
  nameDrive: string;
  folderPath: string;
  searchTokken: string;
}

export interface SearchItemsResponse {
  search: { path: string }[];
}