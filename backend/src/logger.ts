export enum LogLevel {LOG = "log", INFO = "info", WARN = "warn", ERROR = "error"};

type FromLogLevelToConsoleFunct = {[key: string]: (message: string) => void};

const fromLogLevelToConsoleFunct: FromLogLevelToConsoleFunct = {
  log: (message: string) => console.log(`[DEV]> ${message}`),
  info: (message: string) => console.info(`[DEV]> ${message}`),
  warn: (message: string) => console.warn(`[DEV]> ${message}`),
  error: (message: string) => console.error(`[DEV]> ${message}`),
};

export class Logger {
  private static _instance: Logger;

  constructor(private isInDevMode: boolean) {
    Logger._instance = this;
  }

  public static logInDevMode(message: string, level: LogLevel = LogLevel.LOG) {
    if (Logger._instance.isInDevMode) {
      fromLogLevelToConsoleFunct[level](message);
    }
  }
}