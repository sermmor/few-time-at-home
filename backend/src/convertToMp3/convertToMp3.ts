import ffmpeg from 'fluent-ffmpeg';
import { Lame } from 'node-lame';
// import { ConfigurationService } from '../API';
import { mkdir, readdir, stat } from 'fs';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

type Bitrate =  96 | 112 | 128 | 144 | 160 | 192 | 224 | 256 | 320;
type BitrateWithK = "96k" | "112k" | "128k" | "144k" | "160k" | "192k" | "224k" | "256k" | "320k";

export interface Mp3ProgressPayload {
  type: 'mp3_progress';
  /** 0-100. -1 when indeterminate (audio conversion). */
  percent: number;
  /** File currently being converted (basename only). */
  filename: string;
  /** FFmpeg timemark, e.g. "00:01:23.45". Empty for audio. */
  timemark: string;
  /** Files still pending after the current one. */
  filesLeft: number;
  /** Total files in this conversion job. */
  totalFiles: number;
  /** true for node-lame audio jobs (no per-sample progress available). */
  isAudio: boolean;
  /** true once every file has been processed. */
  isFinished: boolean;
}
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
    totalFiles: number,
    callbackProcess: (msg: string) => void,
    callbackFinished: (msg: string) => void,
    callbackProgress?: (data: Mp3ProgressPayload) => void,
  ) => {
    if (pathResultList.length === 0) {
      callbackProgress?.({ type: 'mp3_progress', percent: 100, filename: '', timemark: '', filesLeft: 0, totalFiles, isAudio: false, isFinished: true });
      callbackFinished("FINISHED!");
      console.log("FINISHED!");
      return;
    }

    const { from: filePath, to: filePathTo } = pathResultList[0];
    const filesLeft = pathResultList.length - 1;
    const filename = (filePath.split('/').pop() ?? filePath.split('\\').pop() ?? filePath) as string;

    callbackProgress?.({ type: 'mp3_progress', percent: 0, filename, timemark: '00:00:00', filesLeft, totalFiles, isAudio: false, isFinished: false });

    ffmpeg(filePath)
      .outputOptions("-vn", "-ab", bitrate, "-ar", "44100")
      .toFormat("mp3")
      .save(filePathTo)
      .on("progress", (prog: any) => {
        // prog.percent can be NaN (not null/undefined) when ffmpeg can't determine
        // duration — NaN passes through ??, so we must use isNaN().
        // JSON.stringify(NaN) → "null", so the frontend would always get 0%.
        const rawPct = prog.percent;
        const percent = (typeof rawPct === 'number' && !isNaN(rawPct))
          ? Math.min(100, Math.max(0, Math.round(rawPct)))
          : -1; // -1 = indeterminate (duration unknown)
        callbackProgress?.({
          type: 'mp3_progress',
          percent,
          filename,
          timemark: prog.timemark ?? '',
          filesLeft,
          totalFiles,
          isAudio: false,
          isFinished: false,
        });
      })
      .on("error", (err) => {
        callbackProcess(`Error converting ${filePathTo} (left: ${filesLeft}).`);
        console.log(`Error converting file: ${err}`);
        setTimeout(() => this.parseVideoToMP3(pathResultList.slice(1), bitrate, totalFiles, callbackProcess, callbackFinished, callbackProgress), 0);
      })
      .on("end", () => {
        callbackProcess(`Conversion finished ${filePathTo} (left: ${filesLeft}).`);
        console.log(`Conversion finished ${filePathTo} (left: ${filesLeft}).`);
        callbackProgress?.({ type: 'mp3_progress', percent: 100, filename, timemark: '', filesLeft, totalFiles, isAudio: false, isFinished: false });
        setTimeout(() => this.parseVideoToMP3(pathResultList.slice(1), bitrate, totalFiles, callbackProcess, callbackFinished, callbackProgress), 0);
      });
  };

  private parseAudioToMP3 = (
    pathResultList: {from: string; to: string}[],
    bitrateToConvertAudio: Bitrate,
    totalFiles: number,
    callbackProcess: (msg: string) => void,
    callbackFinished: (msg: string) => void,
    callbackProgress?: (data: Mp3ProgressPayload) => void,
  ) => {
    if (pathResultList.length === 0) {
      callbackProgress?.({ type: 'mp3_progress', percent: 100, filename: '', timemark: '', filesLeft: 0, totalFiles, isAudio: true, isFinished: true });
      callbackFinished("FINISHED!");
      console.log("FINISHED!");
      return;
    }

    const { from: filePath, to: filePathTo } = pathResultList[0];
    const filesLeft = pathResultList.length - 1;
    const filename = (filePath.split('/').pop() ?? filePath.split('\\').pop() ?? filePath) as string;

    // node-lame doesn't emit per-sample progress events; send -1 (indeterminate) while encoding.
    callbackProgress?.({ type: 'mp3_progress', percent: -1, filename, timemark: '', filesLeft, totalFiles, isAudio: true, isFinished: false });

    const encoder = new Lame({
      output: filePathTo,
      bitrate: bitrateToConvertAudio,
    }).setFile(filePath);

    encoder
      .encode()
      .then(() => {
        callbackProcess(`Conversion finished ${filePathTo} (left: ${filesLeft}).`);
        console.log(`Conversion finished ${filePathTo} (left: ${filesLeft}).`);
        callbackProgress?.({ type: 'mp3_progress', percent: 100, filename, timemark: '', filesLeft, totalFiles, isAudio: true, isFinished: false });
        setTimeout(() => this.parseAudioToMP3(pathResultList.slice(1), bitrateToConvertAudio, totalFiles, callbackProcess, callbackFinished, callbackProgress), 0);
      })
      .catch((error) => {
        callbackProcess(`Error converting ${filePathTo} (left: ${filesLeft}).`);
        console.log(`Error converting file: ${error}`);
        setTimeout(() => this.parseAudioToMP3(pathResultList.slice(1), bitrateToConvertAudio, totalFiles, callbackProcess, callbackFinished, callbackProgress), 0);
      });
  };

  public convertAllVideosToMP3 = (
    userData: { folderFrom: string; folderTo: string; bitrate: BitrateWithK; },
    callbackProcess: (msg: string) => void,
    callbackFinished: (msg: string) => void,
    callbackProgress?: (data: Mp3ProgressPayload) => void,
  ) => {
    // const ffmpegPath = process.env.FFMPEG_PATH || ConfigurationService.Instance.windowsFFMPEGPath;
    ffmpeg.setFfmpegPath(ffmpegPath);
    this.queueFolderToBuild = [userData.folderFrom];

    this.buildFoldersAndGetFilesLists(userData, userData.folderFrom, userData.folderTo).then(pathResultList => {
      const cleanPathList = this.cleanDuplicatesAndUnsuported(pathResultList);
      // TODO: Dividir la lista cleanPathList entre varios workers.
      this.parseVideoToMP3(cleanPathList, userData.bitrate, cleanPathList.length, callbackProcess, callbackFinished, callbackProgress);
    });
  };

  public convertAllAudiosToMP3 = (
    userData: { folderFrom: string; folderTo: string; bitrateToConvertAudio: Bitrate; },
    callbackProcess: (msg: string) => void,
    callbackFinished: (msg: string) => void,
    callbackProgress?: (data: Mp3ProgressPayload) => void,
  ) => {
    this.queueFolderToBuild = [userData.folderFrom];

    this.buildFoldersAndGetFilesLists(userData, userData.folderFrom, userData.folderTo).then(pathResultList => {
      const cleanPathList = this.cleanDuplicatesAndUnsuported(pathResultList);
      // TODO: Dividir la lista cleanPathList entre varios workers.
      this.parseAudioToMP3(cleanPathList, userData.bitrateToConvertAudio, cleanPathList.length, callbackProcess, callbackFinished, callbackProgress);
    });
  };
}
