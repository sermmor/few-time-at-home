import { YoutubeRSSMessageList } from "../youtubeRSS";
import { AlertListService } from "./alertNotification.service";
import { BookmarkService } from "./bookmark.service";
import { ConfigurationService } from "./configuration.service";
import { NotesService } from "./notes.service"
import { PomodoroService } from "./pomodoro.service";

export class SynchronizeService {
  constructor() {

  }

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

  uploadDataToUrl = (data: string, url: string) => {

  }

  downloadDataFromUrl = (url: string) => {

  }

  saveDataFromClient = async (data: string): Promise<void> => {
    return await this.setDataToApplication(data);
  }
}