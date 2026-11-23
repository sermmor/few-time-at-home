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
// ── Pestaña "Pendrive del coche" ─────────────────────────────────────────────

export const carUsbBitrateList = [64, 96, 112, 128, 144, 160, 192, 224, 256, 320] as const;
export type CarUsbBitrate = typeof carUsbBitrateList[number];
export const CAR_USB_OUTPUT_FOLDER = 'cloud/01_CONVERTIDOS';

export type CarUsbState = 'idle' | 'scanning' | 'converting' | 'zipping' | 'done' | 'error' | 'cancelled';

export interface CarUsbProgress {
  type: 'car_usb_progress';
  state: CarUsbState;
  currentFile: string;
  /** 0-100 del fichero actual; -1 indeterminado. */
  currentPercent: number;
  done: number;
  total: number;
  errors: number;
  bitrate: number;
  /** Ruta del zip relativa a la raíz de la Cloud (`cloud/01_CONVERTIDOS/...zip`). */
  zipPath: string;
  message: string;
  /** Cambia con cada conversión; si cambia, el log se vuelve a pedir desde el principio. */
  jobId?: number;
}

export interface CarUsbStatus extends CarUsbProgress {
  log: string[];
  /** Índice a pedir en la siguiente consulta (`logFrom`). */
  logNext: number;
}

export interface CarUsbStartResponse {
  ok: boolean;
  message: string;
}
