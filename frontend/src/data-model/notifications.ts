export interface AlertData {
  timeToLaunch: string;
  message: string;
  isHappensEveryweek?: boolean;
  dayOfWeek?: number;
  isHappensEverymonth?: boolean;
  dayOfMonth?: number;
}

export interface NotificationsDataModel {
  alerts: AlertData[],
};