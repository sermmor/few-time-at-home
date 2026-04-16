import { stat, mkdir, readdir, rename, rm } from "fs";
import { readdir as readdirAsync } from "fs/promises";
import { Dirent } from "fs";
import { zip, COMPRESSION_LEVEL } from 'zip-a-folder';
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

  public fromRelativePathToAbsolute = (path: string) => `${ConfigurationService.Instance.cloudRootPath}/${path}`;
  public fromAbsolutePathToRelative = (path: string) => path.split(ConfigurationService.Instance.cloudRootPath).join('').substring(1);

  giveMeRealPathFile = (path: string): string => this.fromRelativePathToAbsolute(path);

  isExistsPath = (absolutePath: string): Promise<boolean> => new Promise<boolean>(resolve => stat(absolutePath, (err, stat) => resolve(err === null)));
  
  isExistsAllPaths = (absolutePathList: string[]): Promise<boolean> => new Promise<boolean>(resolve => {
    if (absolutePathList.length === 0) {
      resolve(true);
    } else {
      this.isExistsPath(absolutePathList[0]).then(isExistsFirstPath => {
        if (isExistsFirstPath) {
          this.isExistsAllPaths(absolutePathList.slice(1)).then(isExistsOthersPaths => resolve(isExistsOthersPaths));
        } else {
          resolve(false);
        }
      });
    }
  });

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

  private recursiveSearchDeep = async (
    absoluteFolderPath: string,
    words: string[],
    results: { path: string }[],
    maxResults: number,
    cancelled: { value: boolean },
  ): Promise<void> => {
    if (cancelled.value || results.length >= maxResults) return;

    let entries: Dirent[];
    try {
      entries = await readdirAsync(absoluteFolderPath, { withFileTypes: true });
    } catch (_e) {
      return; // skip unreadable directories
    }

    const subDirs: string[] = [];

    for (const entry of entries) {
      if (cancelled.value || results.length >= maxResults) break;

      const entryAbsPath = `${absoluteFolderPath}/${entry.name}`;
      const entryRelPath = this.fromAbsolutePathToRelative(entryAbsPath);
      const lowerName = entry.name.toLowerCase();
      const lowerPath = entryRelPath.toLowerCase();

      const matchesAll = words.every(w => lowerName.includes(w) || lowerPath.includes(w));
      if (matchesAll) {
        results.push({ path: entryRelPath });
      }

      if (entry.isDirectory()) {
        subDirs.push(entryAbsPath);
      }
    }

    // Process subdirectories in batches of 8 to avoid I/O saturation on SSD
    const BATCH_SIZE = 8;
    for (let i = 0; i < subDirs.length; i += BATCH_SIZE) {
      if (cancelled.value || results.length >= maxResults) break;
      const batch = subDirs.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(dir => this.recursiveSearchDeep(dir, words, results, maxResults, cancelled)));
    }
  };

  searchCloudItemInDirectoryDeep = (
    nameDrive: string,
    relativeFolderPath: string,
    searchToken: string,
    cancelled: { value: boolean },
  ): Promise<{ path: string }[]> => {
    const words = searchToken.toLowerCase().split(' ').filter(v => v !== '');
    const maxResults = 200;
    const results: { path: string }[] = [];
    const absoluteFolderPath = this.fromRelativePathToAbsolute(relativeFolderPath);

    return this.recursiveSearchDeep(absoluteFolderPath, words, results, maxResults, cancelled)
      .then(() => results);
  };

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
    stat(tempFile, (err, _stat) => {
      if (err === null) {
        // Ensure the destination directory exists before moving the file.
        // This is required when uploading files inside dragged folders (recursive upload),
        // where subdirectories may not yet exist in the cloud.
        const parentDir = pathFile.split('/').slice(0, -1).join('/');
        mkdir(parentDir, { recursive: true }, () => {
          rename(tempFile, pathFile, (renameErr) => {
            if (renameErr === null) {
              resolve(`File or folder ${relativePathFile} uploaded correctly.`);
            } else {
              console.log(renameErr);
              resolve(`Error to uploaded file or folder ${tempFile} in ${relativePathFile}.`);
            }
          });
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

  zipFolder = (relativePathToZip: string, compression: COMPRESSION_LEVEL): Promise<string> => new Promise<string>(resolve => {
    const pathToZip = this.fromRelativePathToAbsolute(relativePathToZip);
    zip( pathToZip, `${pathToZip}.zip`, { compression } ).then(() => resolve(`Zip file created in ${relativePathToZip}.zip`));
  });

  getBackgroundImageFileName = (): Promise<string | null> => new Promise<string | null>(resolve => {
    const cloudFolderPath = this.fromRelativePathToAbsolute('cloud');
    const imageExtensions = ['jpg', 'jpeg', 'webp', 'gif', 'png'];
    
    readdir(cloudFolderPath, (err, fileList) => {
      if (err) {
        console.log(`Error reading cloud folder: ${err}`);
        resolve(null);
      } else {
        const backgroundFile = fileList?.find(fileName => {
          const lowerFileName = fileName.toLowerCase();
          return lowerFileName.startsWith('background') && 
                 imageExtensions.some(ext => lowerFileName.endsWith(`.${ext}`));
        });
        resolve(backgroundFile || null);
      }
    });
  });
}
