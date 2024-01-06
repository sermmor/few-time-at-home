export interface UploadFiles {
  folderPathToSave: string;
  files: any[];
}

export interface DownloadFile {
  drive: string;
  path: string;
}

export interface GenericResponseMessage {
  message: string;
}
