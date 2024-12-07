export enum LogLevel {LOG = "log", INFO = "info", WARN = "warn", ERROR = "error"};

type FromLogLevelToConsoleFunct = {[key: string]: (message: string) => void};

const fromLogLevelToConsoleFunct: FromLogLevelToConsoleFunct = {
  log: (message: string) => console.log(message),
  info: (message: string) => console.info(message),
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
};

export class Logger {
  private static _instance: Logger;

  constructor(private isInDevMode: boolean) {

  }

  public static logOnlyInDevMode(message: string, level: LogLevel = LogLevel.LOG) {
    if (Logger._instance.isInDevMode) {
      fromLogLevelToConsoleFunct[level](message);
    }
  }
}