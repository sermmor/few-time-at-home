export interface UploadFiles {
  drive: string;
  pathToSave: string;
  numberOfFiles: number;
  files: any[];
}

export interface DownloadFile {
  drive: string;
  path: string;
}

export interface GenericResponseMessage {
  message: string;
}
