import { readFile, writeFile } from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
// import { YoutubeRSSMessageList } from "../youtubeRSS";
import { AlertListService } from "./alertNotification.service";
import { BookmarkService } from "./bookmark.service";
import { ConfigurationService } from "./configuration.service";
import { NotesService } from "./notes.service"
import { PomodoroService } from "./pomodoro.service";
import FormData from 'form-data';
import { readJSONFile } from "../utils";
import { ChannelMediaRSSCollectionExport } from "./messagesRSS.service";
import { ReadLaterMessagesRSS } from "./readLaterMessagesRSS.service";

const fetch = require("node-fetch");

const pathJsonSyncronize = 'data/synchronize.json';

export class SynchronizeService {
  constructor() {}

  private collectAllData = async() => {
    const bookmark = await BookmarkService.Instance.fileContent();
    const readLaterRss = await ReadLaterMessagesRSS.fileContent();
    return {
      notes: NotesService.Instance.fileContent(),
      alerts: AlertListService.Instance.fileContent(),
      bookmark,
      pomodoro: PomodoroService.Instance.fileContent(),
      youtube: ChannelMediaRSSCollectionExport.Instance.channelMediaCollection.youtubeRSS.fileContent(),
      configuration: ConfigurationService.Instance.fileContent(),
      readLaterRss,
    }
  };

  private setDataToApplication = async (dataText: any, parseJSON = true): Promise<void> => {
    const data = parseJSON ? JSON.parse(<string> dataText) : dataText;
    await NotesService.Instance.setFileContent(data.notes);
    await AlertListService.Instance.setFileContent(data.alerts);
    await BookmarkService.Instance.setFileContent(data.bookmark);
    await PomodoroService.Instance.setFileContent(data.pomodoro);
    await ChannelMediaRSSCollectionExport.Instance.channelMediaCollection.youtubeRSS.setFileContent(data.youtube);
    await ConfigurationService.Instance.setFileContent(data.configuration);
    await ReadLaterMessagesRSS.setFileContent(data.readLaterRss);
  }

  // Como cliente, creo el fichero de sincronización y lo mando al servidor.
  clientUploadDataToUrl = async (url: string): Promise<void> => {
    const dataCollected = await this.collectAllData();
    const data = JSON.stringify(dataCollected, null, 2);
    await writeFile(pathJsonSyncronize, data);
    
    const formData = new FormData();
    const stream = createReadStream(pathJsonSyncronize);
    formData.append('file', stream);

    await fetch(url, {
      method: 'POST',
      body: formData as unknown as BodyInit | null | undefined,
    });
  }

  // Como cliente, me traigo un fichero de sincronización del servidor, me lo descargo y lo aplico a la aplicación.
  clientDownloadDataFromUrl = async (url: string): Promise<void> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
      },
    });
    const dataJson = await res.json();
    await this.setDataToApplication(dataJson, false);
  }

  // Como servidor, recibo un fichero de sincronización del cliente.
  serverDownloadDataFromUrl = async (pathData: string): Promise<void> => {
    console.log(`[SynchronizeService] SynchronizeService downloaded updated file in: ${pathData}`);
    const dataJson = await readJSONFile(pathData, "{}");
    await this.setDataToApplication(dataJson, false);
  }

  private sendFileResponse = (webResponse: any, fileRelativePath: string, options: any): Promise<void> => new Promise<void>(resolve => {
    webResponse.sendFile(fileRelativePath, options, (err: any) => {
      if (err) {
        console.error("[SynchronizeService] Received NO body text");
      } else {
        console.log(`[SynchronizeService] Sent: ${fileRelativePath}`);
      }
      resolve();
    });
  });

  // Como servidor, mando un fichero de sincronización al cliente.
  serverUploadDataToUrl = async (webResponse: any): Promise<void> => {
    const dataCollected = await this.collectAllData();
    const data = JSON.stringify(dataCollected, null, 2);
    await writeFile(pathJsonSyncronize, data);
    const options: {root: undefined | string} = {
      root: this.getAbsoluteRoot(),
    };
    await this.sendFileResponse(webResponse, pathJsonSyncronize, options);
  }

  private getAbsoluteRoot = (): string => {
    let absoluteRoot = path.join(__dirname);
    let isPathWindowsStyle = false;
    let absoluteRootSplitted = absoluteRoot.split('/');
    if (absoluteRootSplitted.length <= 1) {
      isPathWindowsStyle = true;
      absoluteRootSplitted = absoluteRoot.split('\\');
    }
    absoluteRootSplitted.pop();
    absoluteRootSplitted.pop();
    return absoluteRootSplitted.join(isPathWindowsStyle ? '\\' : '/');
  }
}
