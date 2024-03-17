import { stat } from "fs";
import { readJSONFile, saveInAFile } from "../utils";

const pathPomodoroFile = 'data/pomodoro.json';

export interface TimerMode {
  name: string;
  chain: string[]; // If 0, then use countdown field content.
}

const LIST_BASE_MODE: TimerMode[] = [
  {
    name: 'One Countdown',
    chain: ['0'], // If 0, then use countdown field content.
  },
  {
    name: 'Pomodoro',
    chain: [
      '00:25:00', '00:05:00',
      '00:25:00', '00:05:00',
      '00:25:00', '00:05:00',
      '00:25:00', '00:05:00',
    ],
  },
];

export class PomodoroService {
  static Instance: PomodoroService;
  timeModeList: TimerMode[];

  constructor() {
    this.timeModeList = [];
    PomodoroService.Instance = this;
  }

  refleshTimerModeList = (): Promise<TimerMode[]> => new Promise<TimerMode[]>(resolve => {
    if (this.timeModeList.length > 0) {
      resolve(this.timeModeList);
    } else {
      stat(pathPomodoroFile, (err, stat) => {
        if (err !== null) {
          // The Pomodoro File doesn't exists => create it!
          saveInAFile(JSON.stringify(LIST_BASE_MODE, undefined, 2), pathPomodoroFile, () => {
            this.timeModeList = LIST_BASE_MODE;
            resolve(this.timeModeList);
          });
        } else {
          readJSONFile(pathPomodoroFile, '[]').then(dataJson => {
            this.timeModeList = dataJson;
            resolve(this.timeModeList);
          });
        }
      });
    }
  });

  setTimeModeList = (timerMode: TimerMode[]): Promise<TimerMode[]> => new Promise<TimerMode[]>(resolve => {
    this.timeModeList = timerMode;
    saveInAFile(JSON.stringify(this.timeModeList, undefined, 2), pathPomodoroFile, () => {
      resolve(this.timeModeList);
    });
  });

  addTimerMode = (timerMode: TimerMode): Promise<TimerMode[]> => new Promise<TimerMode[]>(resolve => {
    this.timeModeList.push(timerMode);
    saveInAFile(JSON.stringify(this.timeModeList, undefined, 2), pathPomodoroFile, () => {
      resolve(this.timeModeList);
    });
  });

  fileContent = (): string => JSON.stringify(this.timeModeList, undefined, 2);

  setFileContent = (data: any): Promise<void> => new Promise<void>(resolve => {
    this.timeModeList = data;
    this.setTimeModeList(this.timeModeList).then(() => resolve());
  });
};