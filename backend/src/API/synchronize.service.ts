import { readFile, writeFile } from "fs/promises";
import { YoutubeRSSMessageList } from "../youtubeRSS";
import { AlertListService } from "./alertNotification.service";
import { BookmarkService } from "./bookmark.service";
import { ConfigurationService } from "./configuration.service";
import { NotesService } from "./notes.service"
import { PomodoroService } from "./pomodoro.service";
import path from "path";

const pathJsonSyncronize = 'data/synchronize.json';

export class SynchronizeService {
  constructor() {}

  private collectAllData = () => ({
    notes: NotesService.Instance.fileContent(),
    alerts: AlertListService.Instance.fileContent(),
    bookmark: BookmarkService.Instance.fileContent(),
    pomodoro: PomodoroService.Instance.fileContent(),
    youtube: YoutubeRSSMessageList.fileContent(),
    configuration: ConfigurationService.Instance.fileContent(),
  });

  private setDataToApplication = async (dataText: string): Promise<void> => {
    const data = JSON.parse(<string> dataText);
    await NotesService.Instance.setFileContent(data.notes);
    await AlertListService.Instance.setFileContent(data.alerts);
    await BookmarkService.Instance.setFileContent(data.bookmark);
    await PomodoroService.Instance.setFileContent(data.pomodoro);
    await YoutubeRSSMessageList.setFileContent(data.youtube);
    await ConfigurationService.Instance.setFileContent(data.configuration);
  }

  // Como cliente, creo el fichero de sincronización y lo mando al servidor.
  clientUploadDataToUrl = async (url: string): Promise<void> => {
    const data = JSON.stringify(this.collectAllData(), null, 2);
    const file = new File([data], 'synchronize.json');
    const formData = new FormData();
    formData.append('file', file);

    await fetch(url, {
      method: 'POST',
      body: formData,
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
    await this.setDataToApplication(dataJson);
  }

  // Como servidor, recibo un fichero de sincronización del cliente.
  serverDownloadDataFromUrl = async (pathData: string): Promise<void> => {
    console.log(`[SynchronizeService] SynchronizeService downloaded updated file in: ${pathData}`);
    const data = await readFile(pathData);
    const dataJson = JSON.parse(<string> <any> data);
    await this.setDataToApplication(dataJson);
    
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
    const data = JSON.stringify(this.collectAllData(), null, 2);
    await writeFile(pathJsonSyncronize, data);
    const options: {root: undefined | string} = {
      root: path.join(__dirname),
    };
    await this.sendFileResponse(webResponse, pathJsonSyncronize, options);
  }
}
