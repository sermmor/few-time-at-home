export interface NotificationsDataModel {
  alerts: {
    timeToLaunch: string;
    message: string;
    isHappensEveryday: boolean;
  }[],
};