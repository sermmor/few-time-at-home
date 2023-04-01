import { readFile } from "fs";
import { parseFromAlertDateStringToDateObject, parseFromDateObjectToAlertDateString, saveInAFile } from "../utils";

const pathNotesFile = 'data/alerts.json';

export interface Alert {
  timeToLaunch: Date;
  message: string;
  isHappensEveryday?: boolean;
}

export interface AlertFormated {
  timeToLaunch: string;
  message: string;
  isHappensEveryday?: boolean;
}

export class AlertListService {
  static Instance: AlertListService;
  alertList: Alert[];

  constructor() {
    this.alertList = [];
    AlertListService.Instance = this;
  }
  
  updatedAlertIsHappensEveryday = () => {
    const today = new Date();
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
    let theNextDay, theNextDayInMilliseconds: number;

    this.alertList.forEach(alert => {
      while (alert.isHappensEveryday && alert.timeToLaunch < today) {
        theNextDayInMilliseconds = alert.timeToLaunch.getTime() + oneDayInMilliseconds;
        theNextDay = new Date(theNextDayInMilliseconds);
        alert.timeToLaunch = theNextDay;
      }
    });
  }

  parseStringsToAlert = (alertString: AlertFormated): Alert => ({
    timeToLaunch: parseFromAlertDateStringToDateObject(alertString.timeToLaunch),
    message: alertString.message,
    isHappensEveryday: !!alertString.isHappensEveryday,
  });

  parseAlertToString = (alert: Alert): AlertFormated => ({
    timeToLaunch: parseFromDateObjectToAlertDateString(alert.timeToLaunch),
    message: alert.message,
    isHappensEveryday: !!alert.isHappensEveryday,
  });

  parseStringsListToAlertList = (alertList: AlertFormated[]): Alert[] => alertList.map(alertString => this.parseStringsToAlert(alertString));

  parseAlertListToStringList = (alertList: Alert[]): AlertFormated[] => alertList.map(alert => this.parseAlertToString(alert));

  alertsToLaunchInTelegram = (): Alert[] => {
    this.updatedAlertIsHappensEveryday();
    const today = new Date();
    const todayNextHourTime = today.getTime() + 1 * 60 * 60 * 1000;
    const todayNextHour = new Date(todayNextHourTime);
    return this.alertList.filter((alert: Alert) => (alert.timeToLaunch < todayNextHour));
  };

  alertsToStillWaiting = (): Alert[] => {
    this.updatedAlertIsHappensEveryday();
    const today = new Date();
    return this.alertList.filter((alert: Alert) => (alert.timeToLaunch > today));
  };

  clear = () => {
    this.alertList = this.alertsToStillWaiting();
    this.saveAlerts();
  };

  getAlerts = (): Promise<Alert[]> => new Promise<Alert[]>(resolve => {
    if (this.alertList.length > 0) {
      resolve(this.alertList);
    } else {
      readFile(pathNotesFile, (err: any, data: any) => {
        if (err) throw err;
        const alertStringList = JSON.parse(<string> <any> data);
        this.alertList = this.parseStringsListToAlertList(alertStringList);
        resolve(this.alertList);
      });
    }
  });

  addAlerts = (newAlert: Alert): Promise<Alert[]> => new Promise<Alert[]>(resolve => {
    if (this.alertList.length > 0) {
      this.alertList.push(newAlert);
      this.saveAlerts().then((alertList) => resolve(alertList));
    } else {
      this.getAlerts().then(() => {
        this.alertList.push(newAlert);
        this.saveAlerts().then((newAlertList) => resolve(newAlertList));
      });
    }
  });

  updateAlerts = (alerts: Alert[]): Promise<Alert[]> => new Promise<Alert[]>(resolve => {
    if (this.alertList.length > 0) {
      this.alertList = alerts;
      this.saveAlerts().then((newNoteList) => resolve(newNoteList));
    } else {
      this.getAlerts().then(() => {
        this.alertList = alerts;
        this.saveAlerts().then((newAlertList) => resolve(newAlertList));
      });
    }
  });

  saveAlerts = (): Promise<Alert[]> => new Promise<Alert[]>(resolve => {
    this.updatedAlertIsHappensEveryday();
    saveInAFile(JSON.stringify(this.parseAlertListToStringList(this.alertList), null, 2), pathNotesFile);
    resolve(this.alertList);
    console.log("> Alerts saved!");
  });
}
