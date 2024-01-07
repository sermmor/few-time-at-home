import { DownloadFile, UploadFiles } from "./commons";

export const isFileInRootPath = (nameDrive: string, itemPath: string): boolean => {
  // For instance: nameDrive='cloud' item.path='cloud/Andalucia.jpeg' is true
  const splitPath = itemPath.split('/');
  return splitPath.length === 2 && splitPath[0] === nameDrive;
}

// For instance: item.path='cloud/Images/Andalucia.jpeg' => 'cloud/Images'
export const getPathFolderContainer = (itemPath: string): string => {
  const splitPath = itemPath.split('/');
  return splitPath.slice(0, splitPath.length - 1).join('/');
}

// For instance: item.path='cloud/Images/States/Spain/Andalucia.jpeg' => ['cloud', 'cloud/Images', 'cloud/Images/States', 'cloud/Images/States/Spain']
export const getBreadcrumb = (itemPath: string): string[] => {
  const breadcrumb: string[] = [];
  let currentPath = '';

  itemPath.split('/').forEach(folderName => {
    currentPath = ('' === currentPath) ? folderName : `${currentPath}/${folderName}`;
    breadcrumb.push(currentPath);
  });

  return breadcrumb.slice(0, breadcrumb.length - 1);
}

export const getNameFileOfFolder = (path: string): string => {
  const splitPath = path.split('/');
  return splitPath[splitPath.length - 1];
}

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

export interface GetFolderCloudRequest {
  drive: string;
  folderPath: string;
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