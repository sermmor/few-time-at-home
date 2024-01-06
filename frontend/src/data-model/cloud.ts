import { DownloadFile, UploadFiles } from "./commons";

export const urlFolder = 'urlfolder:///';

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