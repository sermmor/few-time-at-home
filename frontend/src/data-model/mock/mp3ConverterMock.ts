import { AudioConverterDataModel, ConverterDataModel, VideoConverterDataModel } from '../mp3Converter';

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
