import { writeFile, stat, mkdir, readFile, existsSync, readdir, rename } from "fs";
import { readJSONFile, saveInAFile } from "../utils";

export interface CloudItem {
  name: string;
  path: string;
  driveName: string;
}

export interface Drive {
  name: string;
  path: string;
  indexPath: string;
  contentIndexing?: CloudItem[];
}

const defaultOrigin: Drive = { name: 'cloud', path: 'cloud', indexPath: 'data/cloud/cloud.json' };
const defaultIndexFileContent: string = '[\n]';
const defaultIndexJsonFileContent = (): CloudItem[] => [];

// TODO: EACH PUBLIC METHOD IS AN ENDPOINT!!!
// TODO (updateCloudItemsIndex, getCloudItems, createFolder, moveFileOrFolder, renameFileOrFolder, createBlankFile, uploadFile, downloadFile - getPathDrive)
export class CloudService {
  constructor(public cloudOrigins: Drive[] = []) {
    this.cloudOrigins.push(defaultOrigin);

    this.getAllIndexingFilesContent().then(driveList => {
      this.updateCloudItemsIndex();
    });
  }

  private getIndexingFilesContent = (indexPath: string): Promise<CloudItem[]> => new Promise<CloudItem[]>(resolve => {
    const folderPathSplited = indexPath.split("/");
    const folderPath = folderPathSplited.slice(0, folderPathSplited.length - 1).join("/");

    const saveFile = () => writeFile(indexPath, defaultIndexFileContent, () => {
      resolve(defaultIndexJsonFileContent());
    });

    stat(folderPath, (err, stat) => {
      if (err === null) {
        if (existsSync(indexPath)) {
          readJSONFile(indexPath, defaultIndexFileContent).then(data => resolve(data));
        } else {
          saveFile();
        }
      } else {
        mkdir(folderPath, {recursive: true}, () => saveFile());
      }
    });
  });

  private getAllIndexingFilesContent = (): Promise<Drive[]> => new Promise<Drive[]>(resolve => {
    let numberOriginLeft = this.cloudOrigins.length;
    this.cloudOrigins.forEach(drive => {
      this.getIndexingFilesContent(drive.indexPath).then(data => {
        drive.contentIndexing = data;
        numberOriginLeft--;
        if (numberOriginLeft === 0) {
          resolve(this.cloudOrigins);
        }
      });
    });
  });

  private updateDriveIndex = (drive: Drive, path: string, items?: CloudItem[]): Promise<CloudItem[]> => new Promise<CloudItem[]>(resolve => {
    let allItemsAlreadyCollected: CloudItem[] = !items ? [] : items;
    const directories: string[] = [];
    readdir(path, (err, files) => {
      let numberFilesLeft = files.length;
      files.forEach(filePath => {
        stat(`${path}/${filePath}`, (err, stat) => {
          if (stat.isDirectory()) {
            directories.push(filePath);
          } else {
            allItemsAlreadyCollected.push({
              name: filePath,
              path: `${path}/${filePath}`,
              driveName: drive.name,
            });
          }
          numberFilesLeft--;

          if (numberFilesLeft === 0) {
            if (directories.length === 0) {
              resolve(allItemsAlreadyCollected);
            } else {
              let numberDirectoriesLeft = directories.length;
              let newItems: CloudItem[] = [];
              directories.forEach(directory => {
                setTimeout(() => {
                  this.updateDriveIndex(drive, `${path}/${directory}`, allItemsAlreadyCollected).then(items => {
                    newItems = items.filter(i => allItemsAlreadyCollected.findIndex(i2 => i2.path === i.path) < 0);
                    allItemsAlreadyCollected = allItemsAlreadyCollected.concat(newItems);
                    numberDirectoriesLeft--;
                    if (numberDirectoriesLeft === 0) {
                      resolve(allItemsAlreadyCollected);
                    }
                  })},
                0);
              })
            }
          }
        });
      });
    });
  });

  private saveIndexingFiles = (drive?: Drive): Promise<void> => new Promise<void>(resolve => {
    if (!drive) {
      let numberOriginLeft = this.cloudOrigins.length;
      this.cloudOrigins.forEach(currentDrive => {
        const driveContent: string = JSON.stringify(currentDrive.contentIndexing, null, 2);
        writeFile(currentDrive.indexPath, driveContent, () => {
          numberOriginLeft--;
          if (numberOriginLeft === 0) {
            resolve();
          }
        });
      });
    } else {
      const driveContent: string = JSON.stringify(drive.contentIndexing, null, 2);
      writeFile(drive.indexPath, driveContent, () => {
          resolve();
      });
    }
  });

  updateCloudItemsIndex = (nameDrive?: string): Promise<void> => new Promise<void>(resolve => {
    if (!nameDrive) {
      let numberOriginLeft = this.cloudOrigins.length;
      this.cloudOrigins.forEach((drive, indexDrive) => {
        this.updateDriveIndex(drive, drive.path).then(data => {
          this.cloudOrigins[indexDrive].contentIndexing = data;
          numberOriginLeft--;
          if (numberOriginLeft === 0) {
            this.saveIndexingFiles().then(() => resolve());
          }
        });
      });
    } else {
      const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
      const drive: Drive = this.cloudOrigins[indexDrive];
      this.updateDriveIndex(drive, drive.path).then(data => {
        drive.contentIndexing = data;
        this.saveIndexingFiles(drive).then(() => resolve());
      });
    }
  });

  getCloudItems = (nameDrive: string): CloudItem[] => {
    const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
    const contentDrive = this.cloudOrigins[indexDrive].contentIndexing;
    return contentDrive ? contentDrive : [];
  };

  private findCloudItem = (nameDrive: string, pathItem: string): CloudItem | undefined => {
    const cloudItems = this.getCloudItems(nameDrive)
    const index = cloudItems.findIndex(item => item.path === pathItem);
    return index === -1 ? undefined : cloudItems[index];
  };
  
  uploadFile = (nameDrive: string, tempFile: string, pathFile: string) : Promise<string> => new Promise<string>(resolve => {
    // It's comes files from web to server.
    stat(pathFile, (err, stat) => {
      if (err === null) {
        rename(tempFile, pathFile, (err) => {
          if (err === null) {
            const item = this.findCloudItem(nameDrive, tempFile);
            item!.path = pathFile;
            const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
            this.saveIndexingFiles(this.cloudOrigins[indexDrive]).then(() => resolve('File or folder uploaded correctly.'));
          } else {
            resolve('Error to uploaded file or folder.');
          }
        });
      } else {
        resolve('Folder or file already exist!');
      }
    });
  });

  getPathDrive = (nameDrive: string): string => {
    // For Download file https://www.geeksforgeeks.org/express-js-res-sendfile-function/
    const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
    return this.cloudOrigins[indexDrive].path;
  }

  moveFileOrFolder = (nameDrive: string, oldPathFileOrFolder: string, newPathFileOrFolder: string) : Promise<string> => this.renameFileOrFolder(nameDrive, oldPathFileOrFolder, newPathFileOrFolder);

  renameFileOrFolder = (nameDrive: string, oldPathFileOrFolder: string, newPathFileOrFolder: string) : Promise<string> => new Promise<string>(resolve => {
    stat(newPathFileOrFolder, (err, stat) => {
      if (err === null) {
        rename(oldPathFileOrFolder, newPathFileOrFolder, (err) => {
          if (err === null) {
            const item = this.findCloudItem(nameDrive, oldPathFileOrFolder);
            item!.path = newPathFileOrFolder;
            const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
            this.saveIndexingFiles(this.cloudOrigins[indexDrive]).then(() => resolve('File or folder renamed correctly.'));
          } else {
            resolve('Error to rename file or folder.');
          }
        });
      } else {
        resolve('Folder or file already exist!');
      }
    });
  });
  
  createFolder = (nameDrive: string, newFolderPath: string): Promise<string> => new Promise<string>(resolve => {
    stat(newFolderPath, (err, stat) => {
      if (err === null) {
        mkdir(newFolderPath, {recursive: true}, () => {
          const splitPath = newFolderPath.split('/');
          const newItem: CloudItem = {
            driveName: nameDrive,
            name: splitPath[splitPath.length - 1],
            path: newFolderPath,
          };
          const indexDrive = this.cloudOrigins.findIndex(drive => drive.name === nameDrive);
          this.cloudOrigins[indexDrive].contentIndexing!.push(newItem);
          this.saveIndexingFiles(this.cloudOrigins[indexDrive]).then(() => resolve('Folder created correctly.'));
        });
      } else {
        resolve('Folder already exist!');
      }
    });
  });

  createBlankFile = (nameDrive: string, newFilePath: string): Promise<string> => new Promise<string>(resolve => {
    saveInAFile('', newFilePath, () => {
      const splitPath = newFilePath.split('/');
      const newItem: CloudItem = {
        driveName: nameDrive,
        name: splitPath[splitPath.length - 1],
        path: newFilePath,
      };
      const indexDrive = this.cloudOrigins.findIndex(drive => drive.name === nameDrive);
      this.cloudOrigins[indexDrive].contentIndexing!.push(newItem);
      this.saveIndexingFiles(this.cloudOrigins[indexDrive]).then(() => resolve('File created correctly.'));
    });
  });
}
