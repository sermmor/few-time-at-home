import { stat, mkdir, readdir, rename, rm } from "fs";
import { getCurrentStringDateAndHour, saveInAFile } from "../utils";
import { ConfigurationService } from "./configuration.service";

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
const defaultTempUpload: Drive = { name: 'upload', path: `data/uploads` };

export class CloudService {
  static Instance: CloudService;
  
  constructor(public cloudOrigins: Drive[] = []) {
    CloudService.Instance = this;
    this.cloudOrigins.push(defaultOrigin);
    this.cloudOrigins.push(defaultTrash);
    this.cloudOrigins.push(defaultTempUpload);
  }

  private fromRelativePathToAbsolute = (path: string) => `${ConfigurationService.Instance.cloudRootPath}/${path}`;
  private fromAbsolutePathToRelative = (path: string) => path.split(ConfigurationService.Instance.cloudRootPath).join('').substring(1);

  giveMeRealPathFile = (path: string): string => this.fromRelativePathToAbsolute(path);
  
  getFolderContent = (driveName: string, relativefolderPath: string): Promise<CloudItem[]> => new Promise<CloudItem[]>(resolve => {
    const folderPath = this.fromRelativePathToAbsolute(relativefolderPath);
    if (folderPath === '/') return cloudDefaultPath;
    let allItemsAlreadyCollected: CloudItem[] = [];
    let numberOfItemLeft: number;
    readdir(folderPath, (err, fileList) => {
      numberOfItemLeft = fileList ? fileList.length : 0;
      if (numberOfItemLeft === 0) {
        resolve([]);
      } else {
        fileList.forEach(fileName => {
          const filePath = `${folderPath}/${fileName}`;
          stat(filePath, (err, stat) => {
            if (!stat || !stat.isDirectory) console.log(`> Crash? : ${folderPath}/${fileName}`);
            try {
              allItemsAlreadyCollected.push({
                name: fileName,
                path: this.fromAbsolutePathToRelative(filePath),
                driveName: driveName,
                isFolder: stat.isDirectory(),
              });
              numberOfItemLeft--;
              if (numberOfItemLeft <= 0) {
                resolve(allItemsAlreadyCollected);
              }
            } catch (e) {
              console.log(e);
              console.log(`> Crash with exception : ${filePath}`);
            }
          });
        });
      }
    });
  });

  getDrivesList = (): string[] => this.cloudOrigins.map(drive => drive.name);

  updateCloudItemsIndex = (nameDrive: string, relativeFolderPath: string): Promise<CloudItem[]> => new Promise<CloudItem[]>(resolve =>
    this.getFolderContent(nameDrive, relativeFolderPath).then(allItemsAlreadyCollected => resolve(allItemsAlreadyCollected)));

  private searchPredicate = (ci: CloudItem) => (w: string): boolean => ci.name.toLowerCase().indexOf(w) >= 0 || ci.path.toLowerCase().indexOf(w) >= 0;

  searchCloudItemInDirectory = (nameDrive: string, relativeFolderPath: string, searchTokken: string): Promise<{ path: string }[]> => new Promise<{ path: string }[]>(resolve => {
    const words = searchTokken.toLowerCase().split(' ').filter(value => value !== '');
    const maxResults = 100;
    
    this.getFolderContent(nameDrive, relativeFolderPath).then(cloudItems => {
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

  lsDirOperation = (nameDrive: string, relativePathItem: string): Promise<string[]> => new Promise<string[]>(resolve =>
    this.getFolderContent(nameDrive, relativePathItem).then(
      allItemsAlreadyCollected => resolve(allItemsAlreadyCollected.map(cloudItem => cloudItem.path))
      ).catch(e => resolve([])));

  getListFolderFiles = (nameDrive: string, relativePathItem: string): Promise<string[]> => new Promise<string[]>(resolve => this.getFolderContent(nameDrive, relativePathItem)
    .then(allItemsAlreadyCollected => {
      resolve(
        allItemsAlreadyCollected.filter(cloudItem => !cloudItem.isFolder).map(cloudItemFile => cloudItemFile.path)
    )}));
  
  uploadFile = (tempFile: string, relativePathFile: string) : Promise<string> => new Promise<string>(resolve => {
    // It's comes files from web to server.
    const pathFile = this.fromRelativePathToAbsolute(relativePathFile);
    stat(tempFile, (err, stat) => {
      if (err === null) {
        rename(tempFile, pathFile, (err) => {
          if (err === null) {
            resolve(`File or folder ${relativePathFile} uploaded correctly.`);
          } else {
            console.log(err);
            resolve(`Error to uploaded file or folder ${tempFile} in ${relativePathFile}.`);
          }
        });
      } else {
        console.log(err);
        resolve(`Folder or file ${tempFile} already exist in ${relativePathFile}!`);
      }
    });
  });

  getPathDrive = (nameDrive: string): string => {
    const indexDrive = this.cloudOrigins.findIndex(item => item.name === nameDrive);
    return this.cloudOrigins[indexDrive].path;
  }

  moveFileOrFolder = (oldRelativePathFileOrFolder: string[], newRelativePathFileOrFolder: string[], numberOfErrors = 0) : Promise<string> => new Promise<string>(resolve => {
    if (oldRelativePathFileOrFolder.length !== newRelativePathFileOrFolder.length) {
      resolve('Error, name files to move are greater to newRelativePathFileOrFolder list');
    } else if (oldRelativePathFileOrFolder.length === 0) {
      resolve(`All files moved (number of errors = ${numberOfErrors}`);
    } else {
      this.renameFileOrFolder(oldRelativePathFileOrFolder[0], newRelativePathFileOrFolder[0]).then(response => {
        if (response !== 'Folder renamed correctly.' && response !== 'File renamed correctly.') {
          numberOfErrors++;
        }
        this.moveFileOrFolder(
          oldRelativePathFileOrFolder.slice(1, oldRelativePathFileOrFolder.length),
          newRelativePathFileOrFolder.slice(1, newRelativePathFileOrFolder.length),
          numberOfErrors
        ).then(messageResponse => resolve(messageResponse));
      });
    }
  });

  renameFileOrFolder = (oldRelativePathFileOrFolder: string, newRelativePathFileOrFolder: string) : Promise<string> => new Promise<string>(resolve => {
    const oldPathFileOrFolder = this.fromRelativePathToAbsolute(oldRelativePathFileOrFolder);
    const newPathFileOrFolder = this.fromRelativePathToAbsolute(newRelativePathFileOrFolder);
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
  
  createFolder = (newFolderRelativePath: string): Promise<string> => new Promise<string>(resolve => {
    const newFolderPath = this.fromRelativePathToAbsolute(newFolderRelativePath);
    stat(newFolderPath, (err, stat) => {
      if (err !== null) {
        mkdir(newFolderPath, {recursive: true}, () => {
          resolve(`Folder ${newFolderRelativePath} created correctly.`)
          console.log(`Folder ${newFolderPath} created correctly.`)
        });
      } else {
        resolve(`Folder ${newFolderRelativePath} already exist!`);
        console.log(`Folder ${newFolderPath} already exist!`);
      }
    });
  });

  createBlankFile = (newFileRelativePath: string): Promise<void> => new Promise<void>(resolve => {
    const newFilePath = this.fromRelativePathToAbsolute(newFileRelativePath);
    saveInAFile('', newFilePath, () => {
      resolve();
    });
  });

  saveInFile = (fileRelativePath: string, textContent: string): Promise<void> => new Promise<void>(resolve => {
    const filePath = this.fromRelativePathToAbsolute(fileRelativePath);
    saveInAFile(textContent, filePath, () => {
      resolve();
    });
  });

  deleteFileOrFolder = (nameDrive: string, relativePath: string): Promise<string> => new Promise<string>(resolve => {
    const path = this.fromRelativePathToAbsolute(relativePath);
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
                resolve(`Error when delete folder ${relativePath}.`);
              }
            });
          } else {
            rm(path, err => {
              if (err === null) {
                resolve('ok');
              } else {        
                console.log(`Error when delete file ${path}.`);
                resolve(`Error when delete file ${relativePath}.`);
              }
            });
          }
        } else {
          // Move to drive trashDefaultPath.
          const pathSplitted = path.split('/');
          const nameFileOrFolfer = pathSplitted[pathSplitted.length - 1];
          const trashRelativePathFile = `${trashDefaultPath}/${getCurrentStringDateAndHour()}_${nameFileOrFolfer}`;
          const trashPathFile = this.fromRelativePathToAbsolute(trashRelativePathFile);

          rename(path, trashPathFile, (err) => {
            if (err === null) {
              // Moved to trash.
              resolve('ok');
            } else {
              console.log(`Error to move file or folder ${path} to trash folder`);
              resolve(`Error to move file or folder ${relativePath} to trash folder`);
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
