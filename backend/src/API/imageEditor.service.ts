import sharp from 'sharp';
import path from 'path';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import PDFDocument from 'pdfkit';
import { ConfigurationService } from './configuration.service';

// ── Parameter interfaces ──────────────────────────────────────────────────────

export interface ResizeParams {
  inputPath: string;   // cloud-relative path, e.g. "cloud/images/photo.jpg"
  width: number;
  height: number;
  proportional: boolean;
  outputPath: string;  // cloud-relative path for output
}

export interface CanvasParams {
  inputPath: string;
  top: number;
  right: number;
  bottom: number;
  left: number;
  background: string;  // hex color, e.g. "#ffffff"
  outputPath: string;
}

export interface MosaicParams {
  inputPaths: string[];
  cols: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  background: string;
  outputPath: string;
}

export interface GrayscaleParams {
  inputPath: string;
  outputPath: string;
}

export interface A4Layer {
  cloudPath: string;
  x: number;       // position in frontend canvas pixels
  y: number;
  width: number;
  height: number;
}

export interface A4ExportParams {
  layers: A4Layer[];
  dpi: 150 | 300;
  background: string;
  outputPath: string;
  canvasWidth: number;   // frontend canvas display width (px)
  canvasHeight: number;  // frontend canvas display height (px)
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ImageEditorService {

  private resolve(cloudPath: string): string {
    return `${ConfigurationService.Instance.cloudRootPath}/${cloudPath}`;
  }

  private ensureDir(absPath: string): void {
    const dir = path.dirname(absPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  /**
   * Convert hex color string to a sharp-compatible RGBA object.
   * Accepts "#rrggbb" or "#rrggbbaa".
   */
  private hexToRgba(hex: string): { r: number; g: number; b: number; alpha: number } {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return {
      r:     isNaN(r) ? 255 : r,
      g:     isNaN(g) ? 255 : g,
      b:     isNaN(b) ? 255 : b,
      alpha: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }

  /**
   * Apply output format based on file extension.
   * BMP and ICO are not writable by sharp — they fall back to PNG.
   */
  private applyFormat(inst: sharp.Sharp, outputPath: string): sharp.Sharp {
    const ext = path.extname(outputPath).toLowerCase().slice(1);
    switch (ext) {
      case 'jpg':
      case 'jpeg': return inst.jpeg({ quality: 90, mozjpeg: false });
      case 'png':  return inst.png({ compressionLevel: 6 });
      case 'webp': return inst.webp({ quality: 85 });
      case 'gif':  return inst.gif();
      default:     return inst.png();  // bmp / ico / unknown → PNG
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  async getMetadata(cloudPath: string): Promise<{ width: number; height: number; format: string }> {
    const meta = await sharp(this.resolve(cloudPath)).metadata();
    return { width: meta.width ?? 0, height: meta.height ?? 0, format: meta.format ?? '' };
  }

  async resize(p: ResizeParams): Promise<void> {
    const absOut = this.resolve(p.outputPath);
    this.ensureDir(absOut);

    let inst = sharp(this.resolve(p.inputPath)).resize({
      width:  p.width,
      height: p.height,
      fit:    p.proportional ? 'inside' : 'fill',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    });
    await this.applyFormat(inst, absOut).toFile(absOut);
  }

  async extendCanvas(p: CanvasParams): Promise<void> {
    const absOut = this.resolve(p.outputPath);
    this.ensureDir(absOut);

    const bg = this.hexToRgba(p.background || '#ffffff');

    // Negative values mean crop; positive values mean extend.
    const cropLeft   = Math.max(0, -p.left);
    const cropTop    = Math.max(0, -p.top);
    const cropRight  = Math.max(0, -p.right);
    const cropBottom = Math.max(0, -p.bottom);
    const extTop    = Math.max(0, p.top);
    const extRight  = Math.max(0, p.right);
    const extBottom = Math.max(0, p.bottom);
    const extLeft   = Math.max(0, p.left);

    const meta  = await sharp(this.resolve(p.inputPath)).metadata();
    const srcW  = meta.width  ?? 0;
    const srcH  = meta.height ?? 0;

    let inst = sharp(this.resolve(p.inputPath));

    // Apply crop first if any side is negative.
    if (cropLeft > 0 || cropTop > 0 || cropRight > 0 || cropBottom > 0) {
      const extractW = Math.max(1, srcW - cropLeft - cropRight);
      const extractH = Math.max(1, srcH - cropTop - cropBottom);
      inst = inst.extract({ left: cropLeft, top: cropTop, width: extractW, height: extractH });
    }

    // Apply extend if any side is positive.
    if (extTop > 0 || extRight > 0 || extBottom > 0 || extLeft > 0) {
      inst = inst.extend({ top: extTop, right: extRight, bottom: extBottom, left: extLeft, background: bg });
    }

    await this.applyFormat(inst, absOut).toFile(absOut);
  }

  async mosaic(p: MosaicParams): Promise<void> {
    const absOut = this.resolve(p.outputPath);
    this.ensureDir(absOut);

    const { cols, cellWidth, cellHeight, gap } = p;
    const rows   = Math.ceil(p.inputPaths.length / cols);
    const totalW = cols * cellWidth  + Math.max(0, cols - 1)  * gap;
    const totalH = rows * cellHeight + Math.max(0, rows - 1) * gap;
    const bg     = this.hexToRgba(p.background || '#ffffff');

    // Composite each image into its cell (contain + centered background fill).
    const composites: sharp.OverlayOptions[] = [];
    for (let i = 0; i < p.inputPaths.length; i++) {
      const buf = await sharp(this.resolve(p.inputPaths[i]))
        .resize(cellWidth, cellHeight, { fit: 'contain', kernel: sharp.kernel.lanczos3, background: bg })
        .png()
        .toBuffer();
      const col = i % cols;
      const row = Math.floor(i / cols);
      composites.push({
        input: buf,
        left:  col * (cellWidth  + gap),
        top:   row * (cellHeight + gap),
      });
    }

    const base = sharp({
      create: { width: totalW, height: totalH, channels: 4, background: bg },
    }).composite(composites);

    await this.applyFormat(base, absOut).toFile(absOut);
  }

  async grayscale(p: GrayscaleParams): Promise<void> {
    const absOut = this.resolve(p.outputPath);
    this.ensureDir(absOut);
    await this.applyFormat(sharp(this.resolve(p.inputPath)).grayscale(), absOut).toFile(absOut);
  }

  async a4Export(p: A4ExportParams): Promise<void> {
    // Ensure output path ends in .pdf
    const outPath = p.outputPath.replace(/\.[^/.]+$/, '') + '.pdf';
    const absOut  = this.resolve(outPath);
    this.ensureDir(absOut);

    // A4 output dimensions (portrait).
    const A4_W = p.dpi === 300 ? 2480 : 1240;
    const A4_H = p.dpi === 300 ? 3508 : 1754;

    const scaleX = A4_W / p.canvasWidth;
    const scaleY = A4_H / p.canvasHeight;
    const bg     = this.hexToRgba(p.background || '#ffffff');

    // Composite all layers onto the A4 raster image.
    const composites: sharp.OverlayOptions[] = [];
    for (const layer of p.layers) {
      const outW = Math.max(1, Math.round(layer.width  * scaleX));
      const outH = Math.max(1, Math.round(layer.height * scaleY));
      const outX = Math.max(0, Math.round(layer.x      * scaleX));
      const outY = Math.max(0, Math.round(layer.y      * scaleY));

      // Clamp so the image doesn't extend beyond A4 bounds.
      if (outX >= A4_W || outY >= A4_H) continue;

      const buf = await sharp(this.resolve(layer.cloudPath))
        .resize(outW, outH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
        .png()
        .toBuffer();
      composites.push({ input: buf, left: outX, top: outY });
    }

    // Render the composited raster to a PNG buffer.
    const imageBuffer = await sharp({
      create: { width: A4_W, height: A4_H, channels: 4, background: bg },
    }).composite(composites).png().toBuffer();

    // Wrap the PNG buffer in a single-page A4 PDF.
    await new Promise<void>((resolve, reject) => {
      const doc    = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
      const stream = createWriteStream(absOut);
      doc.pipe(stream);
      // Stretch the raster to fill the full A4 page (595.28 × 841.89 pt).
      doc.image(imageBuffer, 0, 0, { width: doc.page.width, height: doc.page.height });
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Return the actual output path (with .pdf extension) so the caller can report it.
    // We mutate p.outputPath so api.service.ts can use it in the response.
    p.outputPath = outPath;
  }
}
