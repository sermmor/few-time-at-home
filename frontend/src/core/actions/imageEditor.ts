import {
  imageEditorMetadataEndpoint,
  imageEditorResizeEndpoint,
  imageEditorCanvasEndpoint,
  imageEditorMosaicEndpoint,
  imageEditorGrayscaleEndpoint,
  imageEditorA4ExportEndpoint,
} from '../urls-and-end-points';
import { fetchJsonReceive, fetchJsonSendAndReceive } from '../fetch-utils';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
}

export interface A4Layer {
  cloudPath: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const mock = { ok: false, outputPath: '' };

export const ImageEditorActions = {

  getMetadata: (cloudPath: string): Promise<ImageMetadata> =>
    fetchJsonReceive<ImageMetadata>(
      `${imageEditorMetadataEndpoint()}?path=${encodeURIComponent(cloudPath)}`,
      { width: 0, height: 0, format: '' },
    ),

  resize: (params: {
    inputPath: string; width: number; height: number;
    proportional: boolean; outputPath: string;
  }) => fetchJsonSendAndReceive<{ ok: boolean; outputPath: string }>(
    imageEditorResizeEndpoint(), params, mock,
  ),

  canvas: (params: {
    inputPath: string; top: number; right: number;
    bottom: number; left: number; background: string; outputPath: string;
  }) => fetchJsonSendAndReceive<{ ok: boolean; outputPath: string }>(
    imageEditorCanvasEndpoint(), params, mock,
  ),

  mosaic: (params: {
    inputPaths: string[]; cols: number; cellWidth: number;
    cellHeight: number; gap: number; background: string; outputPath: string;
  }) => fetchJsonSendAndReceive<{ ok: boolean; outputPath: string }>(
    imageEditorMosaicEndpoint(), params, mock,
  ),

  grayscale: (params: {
    inputPath: string; outputPath: string;
  }) => fetchJsonSendAndReceive<{ ok: boolean; outputPath: string }>(
    imageEditorGrayscaleEndpoint(), params, mock,
  ),

  a4Export: (params: {
    layers: A4Layer[]; dpi: 150 | 300; background: string;
    outputPath: string; canvasWidth: number; canvasHeight: number;
  }) => fetchJsonSendAndReceive<{ ok: boolean; outputPath: string }>(
    imageEditorA4ExportEndpoint(), params, mock,
  ),
};
