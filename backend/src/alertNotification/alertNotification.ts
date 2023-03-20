export interface Alert {
  timeToLaunch: Date;
  message: string;
}

export class AlertUtilities {
  // TODO QUIT STATIC, QUIT IN CONFIGURATION, THIS SHOULD BE A DIFERENT ENDPOINT OF CONFIGURATION (AND THIS IS USING IN TELEGRAM THINK THE WAY).
  static parseStringsToAlert = (alertList: {timeToLaunch: string; message: string}[]): Alert[] => {
    return [];
  }

  static parseAlertToString = (alertList: Alert[]): {timeToLaunch: string; message: string}[] => {
    return [];
  }

  static alertsToLaunch = (alertList: Alert[]): Alert[] => {
    const today = new Date();
    return alertList.filter((alert: Alert) => (alert.timeToLaunch < today));
  }

  static alertsToStill = (alertList: Alert[]): Alert[] => {
    const today = new Date();
    return alertList.filter((alert: Alert) => (alert.timeToLaunch > today));
  }
}