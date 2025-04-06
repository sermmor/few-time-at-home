import { Job, scheduleJob } from 'node-schedule';
import { parseFromAlertDateStringToDateObject, parseFromDateObjectToAlertDateString, readJSONFile, saveInAFile } from "../utils";
import { MailService } from './mail.service';

const pathNotesFile = 'data/alerts.json';

export interface Alert {
  timeToLaunch: Date;
  message: string;
  isHappensEveryweek?: boolean;
  dayOfWeek?: number;
  isHappensEverymonth?: boolean;
  dayOfMonth?: number;
}

export interface AlertFormated {
  timeToLaunch: string;
  message: string;
  isHappensEveryweek?: boolean;
  dayOfWeek?: number;
  isHappensEverymonth?: boolean;
  dayOfMonth?: number;
}

export class AlertListService {
  static Instance: AlertListService;
  alertList: Alert[];
  scheduleJobs: Job[];

  constructor() {
    this.alertList = [];
    this.scheduleJobs = [];
    AlertListService.Instance = this;
  }

  parseStringsToAlert = (alertString: AlertFormated): Alert => ({
    timeToLaunch: parseFromAlertDateStringToDateObject(alertString.timeToLaunch),
    message: alertString.message,
    isHappensEveryweek: !!alertString.isHappensEveryweek,
    dayOfWeek: alertString.dayOfWeek,
    isHappensEverymonth: !!alertString.isHappensEverymonth,
    dayOfMonth: alertString.dayOfMonth,
  });

  parseAlertToString = (alert: Alert): AlertFormated => ({
    timeToLaunch: parseFromDateObjectToAlertDateString(alert.timeToLaunch),
    message: alert.message,
    isHappensEveryweek: !!alert.isHappensEveryweek,
    dayOfWeek: alert.dayOfWeek,
    isHappensEverymonth: !!alert.isHappensEverymonth,
    dayOfMonth: alert.dayOfMonth,
  });

  parseStringsListToAlertList = (alertList: AlertFormated[]): Alert[] => alertList.map(alertString => this.parseStringsToAlert(alertString));

  parseAlertListToStringList = (alertList: Alert[]): AlertFormated[] => alertList.map(alert => this.parseAlertToString(alert));

  alertsToStillWaiting = (): Alert[] => {
    const today = new Date();
    return this.alertList.filter((alert: Alert) => (
      alert.timeToLaunch > today || alert.isHappensEverymonth || alert.isHappensEveryweek
    ));
  };

  clear = () => {
    this.alertList = this.alertsToStillWaiting();
    this.saveAlerts();
  };

  private sendEmail = (message: string) => MailService.Instance.sendMessageByEmail(message.substring(0, 50), message);

  private launchOneAlert = (alert: Alert, sendMessage: (message: string) => void) => {
    if (!alert.isHappensEveryweek && !alert.isHappensEverymonth) {
      // alert.timeToLaunch === UK HOUR
      this.scheduleJobs.push(scheduleJob(alert.message, alert.timeToLaunch, () => {
        sendMessage(alert.message);
        this.sendEmail(alert.message);
      }));
    } else if (alert.isHappensEveryweek) {
      this.scheduleJobs.push(scheduleJob(alert.message, {
        hour: alert.timeToLaunch.getDay(),
        minute: alert.timeToLaunch.getMinutes(),
        dayOfWeek: alert.dayOfWeek === undefined ? 1 : alert.dayOfWeek
      }, () => {
        sendMessage(alert.message);
        this.sendEmail(alert.message);
      }));
    } else if (alert.isHappensEverymonth) {
      this.scheduleJobs.push(scheduleJob(alert.message, `${
        alert.timeToLaunch.getMinutes()
      } ${
        alert.timeToLaunch.getHours()
      } ${
        alert.dayOfMonth === undefined ? 1 : alert.dayOfMonth
      } * *`, () => {
        sendMessage(alert.message);
        this.sendEmail(alert.message);
      }));
    }
  };

  launchAlerts = async(sendMessage: (message: string) => void, force = false): Promise<Alert[]> => {
    if (this.alertList.length > 0 && !force) return this.alertList;

    if (!force) {
      const alertStringList: AlertFormated[] = await readJSONFile(pathNotesFile, '[]');
      this.alertList = this.parseStringsListToAlertList(alertStringList);
    }
    
    this.alertList.forEach(alert => {
      this.launchOneAlert(alert, sendMessage);
    });
    return this.alertList;
  };

  getAlerts = async(sendMessage: (message: string) => void): Promise<Alert[]> => {
    if (this.alertList.length > 0) {
      return this.alertList;
    } else {
      return await this.launchAlerts(sendMessage);
    }
  };

  addAlerts = (newAlert: Alert, sendMessage: (message: string) => void): Promise<Alert[]> => new Promise<Alert[]>(resolve => {
    if (this.alertList.length > 0) {
      this.alertList.push(newAlert);
      this.launchOneAlert(newAlert, sendMessage);
      this.saveAlerts().then((alertList) => resolve(alertList));
    } else {
      this.getAlerts(sendMessage).then(() => {
        this.alertList.push(newAlert);
        this.launchOneAlert(newAlert, sendMessage);
        this.saveAlerts().then((newAlertList) => resolve(newAlertList));
      });
    }
  });

  updateAlerts = (alerts: Alert[], sendMessage: (message: string) => void): Promise<Alert[]> => new Promise<Alert[]>(resolve => {
    if (this.alertList.length > 0) {
      this.alertList = alerts;
      if (this.scheduleJobs.length > 0) this.scheduleJobs.forEach(job => job ? job.cancel() : undefined);
      this.scheduleJobs = [];
      this.launchAlerts(sendMessage, true).then(() => {
        this.saveAlerts().then((newNoteList) => resolve(newNoteList));
      });
    } else {
      this.getAlerts(sendMessage).then(() => {
        this.alertList = alerts;
        if (this.scheduleJobs.length > 0) this.scheduleJobs.forEach(job => job ? job.cancel() : undefined);
        this.scheduleJobs = [];
        this.launchAlerts(sendMessage, true).then(() => {
          this.saveAlerts().then((newAlertList) => resolve(newAlertList));
        });
      });
    }
  });

  saveAlerts = (): Promise<Alert[]> => new Promise<Alert[]>(resolve => {
    saveInAFile(JSON.stringify(this.parseAlertListToStringList(this.alertList), null, 2), pathNotesFile);
    resolve(this.alertList);
    console.log("> Alerts saved!");
  });

  fileContent = (): any => this.alertList;

  setFileContent = (data: any): Promise<void> => new Promise<void>(resolve => {
    this.alertList = this.parseStringsListToAlertList(data);
    this.saveAlerts().then(() => resolve());
  });
}
