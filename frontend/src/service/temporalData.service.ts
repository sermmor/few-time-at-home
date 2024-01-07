export class TemporalData {
  static NotepadTextData: string = '';
  static EditorTextData: string = '';
  static LastPathInTextEditor: string = '';
  static TimeLeftPomodoro: { minutes: number, seconds: number } = { minutes: 0, seconds: 0 };

  private static formatToTwoDigits = (timeDigit: number): string => timeDigit < 10 ? `0${timeDigit}` : `${timeDigit}`;
  static getFormatTimeLeftPomodoro = (): string => `${
    TemporalData.formatToTwoDigits(TemporalData.TimeLeftPomodoro.minutes)
  }:${
    TemporalData.formatToTwoDigits(TemporalData.TimeLeftPomodoro.seconds)
  }`;
}
