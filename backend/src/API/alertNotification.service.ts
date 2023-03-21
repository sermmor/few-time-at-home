import { readFile } from "fs";
import { parseFromAlertDateStringToDateObject, parseFromDateObjectToAlertDateString, saveInAFile } from "../utils";

const pathNotesFile = 'data/alerts.json';

export interface Alert {
  timeToLaunch: Date;
  message: string;
}

export class AlertListService {
  static Instance: AlertListService;
  alertList: Alert[];

  constructor() {
    this.alertList = [];
    AlertListService.Instance = this;
  }
  
  // TODO THIS SHOULD BE A DIFERENT ENDPOINT OF CONFIGURATION (AND THIS IS USING IN TELEGRAM BOT THINK THE WAY).
  // TODO ADD ALERTS THAT HAPPENS EVERYDAY (Never delete this alert automately)

  parseStringsToAlert = (alertString: {timeToLaunch: string; message: string}): Alert => ({
    timeToLaunch: parseFromAlertDateStringToDateObject(alertString.timeToLaunch),
    message: alertString.message
  });

  parseAlertToString = (alert: Alert): {timeToLaunch: string; message: string} => ({
    timeToLaunch: parseFromDateObjectToAlertDateString(alert.timeToLaunch),
    message: alert.message
  });

  parseStringsListToAlertList = (alertList: {timeToLaunch: string; message: string}[]): Alert[] => alertList.map(alertString => this.parseStringsToAlert(alertString));

  parseAlertListToStringList = (alertList: Alert[]): {timeToLaunch: string; message: string}[] => alertList.map(alert => this.parseAlertToString(alert));

  alertsToLaunchInTelegram = (): Alert[] => {
    const today = new Date();
    const todayNextHourTime = today.getTime() + 1 * 60 * 60 * 1000;
    const todayNextHour = new Date(todayNextHourTime);
    return this.alertList.filter((alert: Alert) => (alert.timeToLaunch < todayNextHour));
  };

  alertsToStillWaiting = (): Alert[] => {
    const today = new Date();
    return this.alertList.filter((alert: Alert) => (alert.timeToLaunch > today));
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
    saveInAFile(JSON.stringify(this.parseAlertListToStringList(this.alertList), null, 2), pathNotesFile);
    resolve(this.alertList);
    console.log("> Alerts saved!");
  });
}
