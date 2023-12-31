import { writeFile, stat, mkdir, existsSync, readdir, rename, rmdir, rm } from "fs";
import { getCurrentStringDateAndHour, readJSONFile, saveInAFile } from "../utils";

export const cloudDefaultPath = 'cloud';
export const trashDefaultPath = 'trash';

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

const defaultOrigin: Drive = { name: 'cloud', path: cloudDefaultPath, indexPath: 'data/cloud/cloud.json' };
const defaultTrash: Drive = { name: 'trash', path: trashDefaultPath, indexPath: 'data/cloud/trash.json' };
const defaultIndexFileContent: string = '[\n]';
const defaultIndexJsonFileContent = (): CloudItem[] => [];

export class CloudService {
  static Instance: CloudService;
  
  constructor(public cloudOrigins: Drive[] = []) {
    CloudService.Instance = this;
    this.cloudOrigins.push(defaultOrigin);
    this.cloudOrigins.push(defaultTrash);

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

  getDrivesList = (): string[] => this.cloudOrigins.map(drive => drive.name);

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

  private searchPredicate = (ci: CloudItem) => (w: string): boolean => ci.name.toLowerCase().indexOf(w) >= 0 || ci.path.toLowerCase().indexOf(w) >= 0;

  searchCloudItem = (nameDrive: string, searchTokken: string): { path: string }[] => {
    const words = searchTokken.toLowerCase().split(' ').filter(value => value !== '');
    const maxResults = 100;
    
    const cloudItems = this.getCloudItems(nameDrive);

    const resultOr = cloudItems.filter(ci => words.filter(this.searchPredicate(ci)).length > 0);

    const resultAnd = cloudItems.filter(ci => {
      let w: string;
      const searchCondition = this.searchPredicate(ci);
      for (let i = 0; i < words.length; i++) {
        w = words[i];
        if (!searchCondition(w)) {
          return false;
        }
      }
      return true;
    });

    const resultsOrWithoutAnd = resultOr.filter(bmOr => resultAnd.findIndex(bmAnd => bmAnd.path === bmOr.path) === -1);
    const result = resultAnd.concat(resultsOrWithoutAnd);

    return (result.length > maxResults) ? result.slice(0, maxResults) : result;
  };

  private findCloudItem = (nameDrive: string, pathItem: string): CloudItem | undefined => {
    const cloudItems = this.getCloudItems(nameDrive)
    const index = cloudItems.findIndex(item => item.path === pathItem);
    return index === -1 ? undefined : cloudItems[index];
  };

  private findCloudFolderItemsList = (nameDrive: string, pathItem: string): CloudItem[] => {
    const cloudItems = this.getCloudItems(nameDrive);
    const cloudItemsFinded = cloudItems.filter(item => item.path.includes(pathItem));
    return cloudItemsFinded;
  };

  private removeDuplicatesItems = (pathList: string[]): string[] => {
    const newPathList: string[] = [];
    pathList.forEach(path => {
      if (newPathList.indexOf(path) < 0) {
        newPathList.push(path);
      }
    });
    return newPathList;
  }

  lsDirOperation = (nameDrive: string, pathItem: string): string[] => {
    const cloudItems = this.getCloudItems(nameDrive);
    const cloudItemsFinded = cloudItems.filter(item => item.path.includes(pathItem)).map(item => {
      const splittedPathItemParent = pathItem.split('/');
      const splittedPathItemOffspring = item.path.split('/');
      const splittedPathChild = splittedPathItemOffspring.slice(0, splittedPathItemParent.length + 1);
      return splittedPathChild.join('/');
    });
    return this.removeDuplicatesItems(cloudItemsFinded);
  };

  getListFolderFiles = (nameDrive: string, pathItem: string): Promise<string[]> => new Promise<string[]>(resolve => {
    const filesAndFolderList = this.lsDirOperation(nameDrive, pathItem);
    const fileList: string[] = [];
    let counterDown = filesAndFolderList.length;

    filesAndFolderList.forEach((path) => {
      stat(path, (err, stat) => {
        if (!stat.isDirectory()) {
          fileList.push(path);
        }
        counterDown--;
        
        if (counterDown === 0) {
          resolve(fileList);
        }
      });
    });
  });
  
  uploadFile = (nameDrive: string, tempFile: string, pathFile: string) : Promise<string> => new Promise<string>(resolve => {
    // It's comes files from web to server.
    stat(tempFile, (err, stat) => {
      if (err === null) {
        rename(tempFile, pathFile, (err) => {
          if (err === null) {
            const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
            const pathFileSplit = pathFile.split('/');
            this.cloudOrigins[indexDrive].contentIndexing?.push({
              name: pathFileSplit[pathFileSplit.length - 1],
              path: pathFile, // TODO: OJO que LA RUTA puede variar dependiendo del drive seleccionado.
              driveName: nameDrive,
            });
            this.saveIndexingFiles(this.cloudOrigins[indexDrive]).then(() => resolve(`File or folder ${pathFile} uploaded correctly.`));
          } else {
            console.log(err);
            resolve(`Error to uploaded file or folder ${tempFile} in ${pathFile}.`);
          }
        });
      } else {
        console.log(err);
        resolve(`Folder or file ${tempFile} already exist in ${pathFile}!`);
      }
    });
  });

  getPathDrive = (nameDrive: string): string => {
    const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
    return this.cloudOrigins[indexDrive].path;
  }

  moveFileOrFolder = (nameDrive: string, oldPathFileOrFolder: string, newPathFileOrFolder: string) : Promise<string> => this.renameFileOrFolder(nameDrive, oldPathFileOrFolder, newPathFileOrFolder);

  renameFileOrFolder = (nameDrive: string, oldPathFileOrFolder: string, newPathFileOrFolder: string) : Promise<string> => new Promise<string>(resolve => {
    stat(oldPathFileOrFolder, (err, stat) => {
      if (err === null) {
        rename(oldPathFileOrFolder, newPathFileOrFolder, (err) => {
          if (err === null) {
            if (stat.isDirectory()) {
              const pathSplited = newPathFileOrFolder.split('/');
              const itemList = this.findCloudFolderItemsList(nameDrive, oldPathFileOrFolder);
              itemList.forEach(item => {
                const pathItemWithoutOldFolderPath = item.path.substring(oldPathFileOrFolder.length);
                item.path = newPathFileOrFolder + pathItemWithoutOldFolderPath;
              })
              const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
              this.saveIndexingFiles(this.cloudOrigins[indexDrive]).then(() => resolve('Folder renamed correctly.'));
            } else {
              const pathSplited = newPathFileOrFolder.split('/');
              const item = this.findCloudItem(nameDrive, oldPathFileOrFolder);
              item!.path = newPathFileOrFolder;
              item!.name = pathSplited[pathSplited.length - 1];
              const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
              this.saveIndexingFiles(this.cloudOrigins[indexDrive]).then(() => resolve('File renamed correctly.'));
            }
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

  createBlankFile = (nameDrive: string, newFilePath: string): Promise<void> => new Promise<void>(resolve => {
    saveInAFile('', newFilePath, () => {
      const splitPath = newFilePath.split('/');
      const newItem: CloudItem = {
        driveName: nameDrive,
        name: splitPath[splitPath.length - 1],
        path: newFilePath,
      };
      const indexDrive = this.cloudOrigins.findIndex(drive => drive.name === nameDrive);
      this.cloudOrigins[indexDrive].contentIndexing!.push(newItem);
      this.saveIndexingFiles(this.cloudOrigins[indexDrive]).then(() => resolve());
    });
  });

  deleteFileOrFolder = (nameDrive: string, path: string): Promise<string> => new Promise<string>(resolve => {
    stat(path, (err, stat) => {
      if (err !== null) {
        if (nameDrive === trashDefaultPath) {
          // Delete forever.
          if (stat.isDirectory()) {
            rmdir(path, err => {
              if (err !== null) {
                this.updateCloudItemsIndex(trashDefaultPath).then(() => resolve('ok'));
              } else {        
                console.log(`Error when delete folder ${path}.`);
                resolve(`Error when delete folder ${path}.`);
              }
            });
          } else {
            rm(path, err => {
              if (err !== null) {
                this.updateCloudItemsIndex(trashDefaultPath).then(() => resolve('ok'));
              } else {        
                console.log(`Error when delete file ${path}.`);
                resolve(`Error when delete file ${path}.`);
              }
            });
          }
        } else {
          // Move to drive trashDefaultPath.
          const pathSplitted = path.split('/');
          const nameFileOrFolfer = pathSplitted[pathSplitted.length - 1];
          const trashPathFile = `${trashDefaultPath}/${getCurrentStringDateAndHour()}_${nameFileOrFolfer}`;

          rename(path, trashPathFile, (err) => {
            if (err === null) {
              if (stat.isDirectory()) {
                // Moved to trash directory.
                this.updateCloudItemsIndex(nameDrive).then(() => resolve('ok'));
              } else {
                // Moved to trash file. => Update old cloudOrigins and trash.
                const pathSplited = trashPathFile.split('/');
                const item = this.findCloudItem(nameDrive, path);
                const newTrashItem: CloudItem = {
                  path: trashPathFile,
                  name: pathSplited[pathSplited.length - 1],
                  driveName: trashDefaultPath,
                };
                const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
                const indexItem = this.cloudOrigins[indexDrive].contentIndexing!.findIndex(itemCandidate => itemCandidate.path === item!.path);
                this.cloudOrigins[indexDrive].contentIndexing!.splice(indexItem, 1);

                const indexTrashDrive = this.cloudOrigins.findIndex(item => item.name === trashDefaultPath);
                this.cloudOrigins[indexTrashDrive].contentIndexing!.push(newTrashItem);

                this.saveIndexingFiles(this.cloudOrigins[indexDrive]).then(() => this.saveIndexingFiles(this.cloudOrigins[indexTrashDrive]).then(() => resolve('ok')));
              }
            } else {
              console.log(`Error to move file or folder ${path} to trash folder`);
              resolve(`Error to move file or folder ${path} to trash folder`);
            }
          });
        }
      } else {
        console.log(`File or folder ${path} don\'t exists!`);
        resolve(`File or folder ${path} don\'t exists!`);
      }
    });
  });
}
