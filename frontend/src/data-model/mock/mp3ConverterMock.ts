import { AudioConverterDataModel, CarUsbStatus, ConverterDataModel, VideoConverterDataModel } from '../mp3Converter';

export const videoConverterDataModelMock = (): {data: VideoConverterDataModel} => ({ data: {
  folderFrom: '/DESDE',
  folderTo: '/HASTA',
  bitrate: '192k',
}});

export const audioConverterDataModelMock = (): {data: AudioConverterDataModel} => ({ data: {
  folderFrom: '/DESDE',
  folderTo: '/HASTA',
  bitrateToConvertAudio: 192,
}});

export const converterDataModelMock = (): ConverterDataModel => ({
  message: "Ready",
  isFinished: false,
});

export const carUsbStatusMock = (): CarUsbStatus => ({
  type: 'car_usb_progress',
  state: 'idle',
  currentFile: '',
  currentPercent: 0,
  done: 0,
  total: 0,
  errors: 0,
  bitrate: 0,
  zipPath: '',
  message: '',
  jobId: 0,
  log: [],
  logNext: 0,
});
