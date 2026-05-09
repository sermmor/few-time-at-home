export type ImageTool = 'resize' | 'canvas' | 'mosaic' | 'grayscale' | 'a4' | 'filter';

export interface A4CanvasLayer {
  id: string;
  cloudPath: string;    // e.g. "cloud/images/photo.jpg"
  previewUrl: string;   // result of cloudImageStreamUrl(cloudPath)
  x: number;            // position in canvas-display pixels
  y: number;
  width: number;
  height: number;
}

export const IMAGE_EXTS = ['jpg', 'jpeg', 'gif', 'png', 'ico', 'bmp', 'webp'];

/** Returns the suggested output filename by appending a suffix before the extension. */
export const suggestOutputName = (sourcePath: string, suffix: string): string => {
  const name = sourcePath.split('/').pop() ?? 'output.jpg';
  const dot  = name.lastIndexOf('.');
  if (dot === -1) return `${name}_${suffix}`;
  return `${name.slice(0, dot)}_${suffix}${name.slice(dot)}`;
};
