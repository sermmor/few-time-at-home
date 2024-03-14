export type Bitrate =  96 | 112 | 128 | 144 | 160 | 192 | 224 | 256 | 320;
export type BitrateWithK = "96k" | "112k" | "128k" | "144k" | "160k" | "192k" | "224k" | "256k" | "320k";
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
