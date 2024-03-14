import ffmpeg from 'fluent-ffmpeg';
import { Lame } from 'node-lame';
import { ConfigurationService } from '../API';
import { mkdir, readdir, stat } from 'fs';

type Bitrate =  96 | 112 | 128 | 144 | 160 | 192 | 224 | 256 | 320;
type BitrateWithK = "96k" | "112k" | "128k" | "144k" | "160k" | "192k" | "224k" | "256k" | "320k";
const videosOrAudioFormat = [".mp4", ".MP4", ".avi", ".AVI", ".flv", ".FLV", ".mov", ".MOV", ".mpeg", ".MPEG", ".wav", ".WAV", ".mp3", ".MP3"];

export class ConvertToMP3 {
  static Instance: ConvertToMP3;
  private queueFolderToBuild: string[] = [];

  constructor() {
    this.queueFolderToBuild = [];
    ConvertToMP3.Instance = this;
  }

  // Utils. --------------------------------------------------------------------

  private replacePiecesString = (text: string, toReplaceList: string[], newTextReplaced: string) => {
    let newText = text;
    toReplaceList.forEach(toReplace => {
      newText = newText.split(toReplace).join(newTextReplaced);
    });
    return newText;
  }

  private hasRouteVideoOrAudioFormat = (path: string): boolean => !!videosOrAudioFormat.find(format => path.includes(format));

  private cleanDuplicatesAndUnsuported = (pathResultList: { from: string; to: string; }[]): { from: string; to: string; }[] => {
    const cleanedList: { from: string; to: string; }[] = [];
    pathResultList.forEach(pathResult => {
      if (!cleanedList.find(pathCleaned => pathCleaned.from === pathResult.from) && this.hasRouteVideoOrAudioFormat(pathResult.from)) {
        cleanedList.push(pathResult);
      }
    });
    return cleanedList;
  }
  
  // Analyze folders tree process. --------------------------------------------------------------------
  private createFoldersAndGetFilesListInCurrentLevel  = (
    fileList: string[],
    folderPathToRead: string,
    userData: { folderFrom: string; folderTo: string; }
  ): Promise<{from: string; to: string}[]> => new Promise<{from: string; to: string}[]>(resolve => {
    const filePathList: {from: string; to: string}[] = [];
    let numberOfFilesInCurrentTreeLevel = fileList.length;
    fileList.forEach(fileName => {
      const filePath = `${folderPathToRead}/${fileName}`;
      const filePathTo = `${userData.folderTo}/${this.replacePiecesString(fileName, videosOrAudioFormat, '.mp3')}`;
      stat(filePath, (err, stat) => {
        if (stat.isDirectory()) {
          mkdir(filePathTo, {recursive: true}, () => {
            this.queueFolderToBuild.push(filePath);
            console.log(`Folder ${filePathTo} created correctly.`);
            numberOfFilesInCurrentTreeLevel--;
            if (numberOfFilesInCurrentTreeLevel < 1) {
              resolve(filePathList);
            }
          });
        } else {
          filePathList.push({
            from: filePath,
            to: filePathTo,
          });
          numberOfFilesInCurrentTreeLevel--;
          if (numberOfFilesInCurrentTreeLevel < 1) {
            resolve(filePathList);
          }
        }
      });
    });
  });
  
  private goToNextQueueFolder = (
    rootFolderFrom: string,
    rootFolderTo: string,
    filePathList: {from: string; to: string}[],
  ): Promise<{from: string; to: string}[]> => new Promise<{from: string; to: string}[]>(resolve => {
    const newFolderFrom = this.queueFolderToBuild.shift();
    if (!newFolderFrom) {
      resolve(filePathList);
    } else {
      this.buildFoldersAndGetFilesLists(
        {
          folderFrom: newFolderFrom,
          folderTo: newFolderFrom.replace(rootFolderFrom, rootFolderTo),
        },
        rootFolderFrom,
        rootFolderTo,
      ).then(newFilePathListToAdd => {
        filePathList = filePathList.concat(newFilePathListToAdd);
        resolve(filePathList);
      });
    }
  });
  
  buildFoldersAndGetFilesLists = (
    userData: { folderFrom: string; folderTo: string; },
    rootFolderFrom: string,
    rootFolderTo: string,
  ): Promise<{from: string; to: string}[]> => new Promise<{from: string; to: string}[]>(resolve => {
    let numberOfItemLeft: number;
    let folderPathToRead = userData.folderFrom;
    let filePathList: {from: string; to: string}[] = [];
    if (this.queueFolderToBuild.length === 0) {
      resolve(filePathList);
    } else {
      readdir(folderPathToRead, (err, fileList) => {
        if (err) {
          console.log(`Error reading directory: ${err}`);
          this.goToNextQueueFolder(rootFolderFrom, rootFolderTo, filePathList).then(filePathList => resolve(filePathList));
        }
        numberOfItemLeft = fileList ? fileList.length : 0;
        if (numberOfItemLeft === 0) {
          this.goToNextQueueFolder(rootFolderFrom, rootFolderTo, filePathList).then(filePathList => resolve(filePathList));
        } else {
          this.createFoldersAndGetFilesListInCurrentLevel(fileList, folderPathToRead, userData).then(newFilePathListToAdd => {
            filePathList = filePathList.concat(newFilePathListToAdd);
            this.goToNextQueueFolder(rootFolderFrom, rootFolderTo, filePathList).then(filePathList => resolve(filePathList));
          });
        }
      });
    }
  });

  // Convert process. --------------------------------------------------------------------

  private parseVideoToMP3 = (
    pathResultList: {from: string; to: string}[],
    bitrate: string,
    callbackProcess: (msg: string) => void,
    callbackFinished: (msg: string) => void,
  ) => {
    if (pathResultList.length === 0) {
      callbackFinished("FINISHED!");
      console.log("FINISHED!");
      return;
    }
  
    const { from: filePath, to: filePathTo} = pathResultList[0];
    ffmpeg(filePath)
      .outputOptions("-vn", "-ab", bitrate, "-ar", "44100")
      .toFormat("mp3")
      .save(filePathTo)
      .on("error", (err) => {
        callbackProcess(`Error converting ${filePathTo} (left: ${pathResultList.length - 1}).`);
        console.log(`Error converting file: ${err}`);
        setTimeout(() => this.parseVideoToMP3(pathResultList.slice(1), bitrate, callbackProcess, callbackFinished), 0);
      })
      .on("end", () => {
        callbackProcess(`Conversion finished ${filePathTo} (left: ${pathResultList.length - 1}).`);
        console.log(`Conversion finished ${filePathTo} (left: ${pathResultList.length - 1}).`);
        setTimeout(() => this.parseVideoToMP3(pathResultList.slice(1), bitrate, callbackProcess, callbackFinished), 0);
      });
  };

  private parseAudioToMP3 = (
    pathResultList: {from: string; to: string}[],
    bitrateToConvertAudio: Bitrate,
    callbackProcess: (msg: string) => void,
    callbackFinished: (msg: string) => void,
  ) => {
    if (pathResultList.length === 0) {
      callbackFinished("FINISHED!");
      console.log("FINISHED!");
      return;
    }
  
    const { from: filePath, to: filePathTo} = pathResultList[0];
    const encoder = new Lame({
      output: filePathTo,
      bitrate: bitrateToConvertAudio,
    }).setFile(filePath);
  
    encoder
      .encode()
      .then(() => {
          // Encoding finished
          callbackProcess(`Conversion finished ${filePathTo} (left: ${pathResultList.length - 1}).`);
          console.log(`Conversion finished ${filePathTo} (left: ${pathResultList.length - 1}).`);
          setTimeout(() => this.parseAudioToMP3(pathResultList.slice(1), bitrateToConvertAudio, callbackProcess, callbackFinished), 0);
      })
      .catch((error) => {
          // Something went wrong
          callbackProcess(`Error converting ${filePathTo} (left: ${pathResultList.length - 1}).`);
          console.log(`Error converting file: ${error}`);
          setTimeout(() => this.parseAudioToMP3(pathResultList.slice(1), bitrateToConvertAudio, callbackProcess, callbackFinished), 0);
      });
  };

  public convertAllVideosToMP3 = (
    userData: { folderFrom: string; folderTo: string; bitrate: BitrateWithK; },
    callbackProcess: (msg: string) => void,
    callbackFinished: (msg: string) => void,
  ) => {
    const ffmpegPath = process.env.FFMPEG_PATH || ConfigurationService.Instance.windowsFFMPEGPath;
    ffmpeg.setFfmpegPath(ffmpegPath);
    this.queueFolderToBuild = [userData.folderFrom];
  
    this.buildFoldersAndGetFilesLists(userData, userData.folderFrom, userData.folderTo).then(pathResultList => {
      const cleanPathList = this.cleanDuplicatesAndUnsuported(pathResultList);
      // TODO: Dividir la lista cleanPathList entre varios workers.
      this.parseVideoToMP3(cleanPathList, userData.bitrate, callbackProcess, callbackFinished);
    });
  };
  
  public convertAllAudiosToMP3 = (
    userData: { folderFrom: string; folderTo: string; bitrateToConvertAudio: Bitrate; },
    callbackProcess: (msg: string) => void,
    callbackFinished: (msg: string) => void,
  ) => {
    this.queueFolderToBuild = [userData.folderFrom];
  
    this.buildFoldersAndGetFilesLists(userData, userData.folderFrom, userData.folderTo).then(pathResultList => {
      const cleanPathList = this.cleanDuplicatesAndUnsuported(pathResultList);
      // TODO: Dividir la lista cleanPathList entre varios workers.
      this.parseAudioToMP3(cleanPathList, userData.bitrateToConvertAudio, callbackProcess, callbackFinished);
    });
  };
}
