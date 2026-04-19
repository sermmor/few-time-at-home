export interface AlertData {
  timeToLaunch: string;
  message: string;
  isHappensEveryweek?: boolean;
  dayOfWeek?: number;
  isHappensEverymonth?: boolean;
  dayOfMonth?: number;
}

export interface NotificationsDataModel {
  alerts: AlertData[];
}

export interface BirthdayData {
  name:         string;
  day:          number;  // 1–31
  month:        number;  // 1–12
  year?:        number;  // optional birth year (to show age)
  reminderHour: number;  // 0–23
}

export interface BirthdaysDataModel {
  birthdays: BirthdayData[];
}