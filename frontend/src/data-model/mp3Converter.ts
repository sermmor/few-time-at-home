export type Bitrate =  96 | 112 | 128 | 144 | 160 | 192 | 224 | 256 | 320;
export type BitrateWithK = "96k" | "112k" | "128k" | "144k" | "160k" | "192k" | "224k" | "256k" | "320k";
export const bitrateList: Bitrate[] =  [96, 112, 128, 144, 160, 192, 224, 256, 320];
export const bitrateWithKList: BitrateWithK[] = bitrateList.map(b => `${b}k`) as BitrateWithK[];
export const videosOrAudioFormat = [".mp4", ".MP4", ".avi", ".AVI", ".flv", ".FLV", ".mov", ".MOV", ".mpeg", ".MPEG", ".wav", ".WAV", ".mp3", ".MP3"];

export interface VideoConverterDataModel {
  folderFrom: string;
  folderTo: string;
  bitrate: BitrateWithK;
}

export interface AudioConverterDataModel {
  folderFrom: string;
  folderTo: string;
  bitrateToConvertAudio: Bitrate;
}

export interface ConverterDataModel {
  message: string;
  isFinished: boolean;
}