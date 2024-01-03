import { writeFile, stat, mkdir, existsSync, readdir, rename, rmdir, rm } from "fs";
import { getCurrentStringDateAndHour, readJSONFile, saveInAFile } from "../utils";

export const cloudDefaultPath = 'cloud';
export const trashDefaultPath = 'trash';

export interface CloudItem {
  name: string;
  path: string;
  isFolder: boolean;
  driveName: string;
}

export interface Drive {
  name: string;
  path: string;
}

const defaultOrigin: Drive = { name: 'cloud', path: cloudDefaultPath };
const defaultTrash: Drive = { name: 'trash', path: trashDefaultPath };

export class CloudService {
  static Instance: CloudService;
  
  constructor(public cloudOrigins: Drive[] = []) {
    CloudService.Instance = this;
    this.cloudOrigins.push(defaultOrigin);
    this.cloudOrigins.push(defaultTrash);
  }
  
  getFolderContent = (driveName: string, folderPath: string): Promise<CloudItem[]> => new Promise<CloudItem[]>(resolve => {
    let allItemsAlreadyCollected: CloudItem[] = [];
    let filePath: string;
    let numberOfItemLeft: number;
    readdir(folderPath, (err, fileList) => {
      numberOfItemLeft = fileList.length;
      fileList.forEach(fileName => {
        filePath = `${folderPath}/${fileName}`;
        stat(filePath, (err, stat) => {
          if (!stat || !stat.isDirectory) console.log(`> Crash? : ${folderPath}/${fileName}`);
          try {
            allItemsAlreadyCollected.push({
              name: fileName,
              path: filePath,
              driveName: driveName,
              isFolder: stat.isDirectory(),
            });
            numberOfItemLeft--;
            if (numberOfItemLeft <= 0) { // TODO: Test from front.
              resolve(allItemsAlreadyCollected);
            }
          } catch (e) {
            console.log(e);
            console.log(`> Crash with exception : ${filePath}`);
          }
        });
      });
    });
  });

  getDrivesList = (): string[] => this.cloudOrigins.map(drive => drive.name);

  updateCloudItemsIndex = (nameDrive: string, folderPath: string): Promise<CloudItem[]> => new Promise<CloudItem[]>(resolve =>
    this.getFolderContent(nameDrive, folderPath).then(allItemsAlreadyCollected => resolve(allItemsAlreadyCollected)));

  private searchPredicate = (ci: CloudItem) => (w: string): boolean => ci.name.toLowerCase().indexOf(w) >= 0 || ci.path.toLowerCase().indexOf(w) >= 0;

  // TODO searchCloudItem changed to searchCloudItemInDirectory AND NOW USE PROMISE!!!
  searchCloudItemInDirectory = (nameDrive: string, folderPath: string, searchTokken: string): Promise<{ path: string }[]> => new Promise<{ path: string }[]>(resolve => {
    const words = searchTokken.toLowerCase().split(' ').filter(value => value !== '');
    const maxResults = 100;
    
    this.getFolderContent(nameDrive, folderPath).then(cloudItems => {
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
  
      resolve((result.length > maxResults) ? result.slice(0, maxResults) : result);
    });
  });

  // TODO: CHANGED TO PROMISE
  private findCloudItem = (nameDrive: string, pathItem: string): Promise<CloudItem | undefined> => new Promise<CloudItem | undefined>(resolve => {
    const splitPathItem = pathItem.split('/');
    const folderPath = splitPathItem.slice(0, splitPathItem.length - 1).join('/');
    this.getFolderContent(nameDrive, folderPath).then(cloudItems => {
      const index = cloudItems.findIndex(item => item.path === pathItem);
      resolve(index === -1 ? undefined : cloudItems[index]);
    });
  });

  // TODO: CHANGED TO PROMISE
  lsDirOperation = (nameDrive: string, pathItem: string): Promise<string[]> => new Promise<string[]>(resolve =>
    this.getFolderContent(nameDrive, pathItem).then(
      allItemsAlreadyCollected => resolve(allItemsAlreadyCollected.map(cloudItem => cloudItem.path))
      ));

  getListFolderFiles = (nameDrive: string, pathItem: string): Promise<string[]> => new Promise<string[]>(resolve => this.getFolderContent(nameDrive, pathItem)
    .then(allItemsAlreadyCollected => {
      resolve(
        allItemsAlreadyCollected.filter(cloudItem => !cloudItem.isFolder).map(cloudItemFile => cloudItemFile.path)
    )}));
  
  // TODO: Quit parameter "nameDrive"
  uploadFile = (tempFile: string, pathFile: string) : Promise<string> => new Promise<string>(resolve => {
    // It's comes files from web to server.
    stat(tempFile, (err, stat) => {
      if (err === null) {
        rename(tempFile, pathFile, (err) => {
          if (err === null) {
            resolve(`File or folder ${pathFile} uploaded correctly.`);
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

  // TODO: Quit parameter "nameDrive"
  moveFileOrFolder = (oldPathFileOrFolder: string, newPathFileOrFolder: string) : Promise<string> => this.renameFileOrFolder(oldPathFileOrFolder, newPathFileOrFolder);

  // TODO: Quit parameter "nameDrive"
  renameFileOrFolder = (oldPathFileOrFolder: string, newPathFileOrFolder: string) : Promise<string> => new Promise<string>(resolve => {
    stat(oldPathFileOrFolder, (err, stat) => {
      if (err === null) {
        rename(oldPathFileOrFolder, newPathFileOrFolder, (err) => {
          if (err === null) {
            if (stat.isDirectory()) {
              resolve('Folder renamed correctly.');
            } else {
              resolve('File renamed correctly.');
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
  
  // TODO: Quit parameter "nameDrive"
  createFolder = (newFolderPath: string): Promise<string> => new Promise<string>(resolve => {
    stat(newFolderPath, (err, stat) => {
      if (err === null) {
        mkdir(newFolderPath, {recursive: true}, () => {
          resolve(`Folder ${newFolderPath} created correctly.`)
        });
      } else {
        resolve(`Folder ${newFolderPath} already exist!`);
      }
    });
  });

  // TODO: Quit parameter "nameDrive"
  createBlankFile = (newFilePath: string): Promise<void> => new Promise<void>(resolve => {
    saveInAFile('', newFilePath, () => {
      resolve();
    });
  });

  deleteFileOrFolder = (nameDrive: string, path: string): Promise<string> => new Promise<string>(resolve => {
    stat(path, (err, stat) => {
      if (err === null) {
        if (nameDrive === trashDefaultPath) {
          // Delete forever.
          if (stat.isDirectory()) {
            rm(path, { recursive: true, force: true }, err => {
              if (err === null) {
                resolve('ok');
              } else {        
                console.log(err);
                console.log(`Error when delete folder ${path}.`);
                resolve(`Error when delete folder ${path}.`);
              }
            });
          } else {
            rm(path, err => {
              if (err === null) {
                resolve('ok');
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
              // Moved to trash.
              resolve('ok');
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
