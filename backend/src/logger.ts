export enum LogLevel {LOG = "log", INFO = "info", WARN = "warn", ERROR = "error"};

type FromLogLevelToConsoleFunct = {[key: string]: (message: any) => void};

const fromLogLevelToConsoleFunct: FromLogLevelToConsoleFunct = {
  log: (message: any) => console.log('[DEV]>', message),
  info: (message: any) => console.info('[DEV]>', message),
  warn: (message: any) => console.warn('[DEV]>', message),
  error: (message: any) => console.error('[DEV]>', message),
};

export class Logger {
  private static _instance: Logger;

  constructor(private isInDevMode: boolean) {
    Logger._instance = this;
  }

  public static logInDevMode(message: any, level: LogLevel = LogLevel.LOG) {
    if (Logger._instance.isInDevMode) {
      fromLogLevelToConsoleFunct[level](message);
    }
  }
}