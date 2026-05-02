/**
 * AudioEditorService
 *
 * Backend support for the AudioWave editor page.
 *
 *   POST /audio-editor/upload-temp   — receives a WAV blob via multipart upload,
 *                                      stores it in data/uploads/audio-editor/,
 *                                      returns { id: string }
 *
 *   GET  /audio-editor/download-export?id=&filename=&format=
 *                                    — converts the temp WAV to the requested
 *                                      format (mp3 | flac | wav) with ffmpeg and
 *                                      streams it back as a file download
 *
 * Temp files live in data/uploads/audio-editor/ (inside data/ so they are
 * included in sync exports, but that is acceptable for transient blobs).
 */

import path from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const UPLOAD_DIR = path.join('data', 'uploads', 'audio-editor');

export class AudioEditorService {

  private static _instance: AudioEditorService;

  static get Instance(): AudioEditorService {
    if (!AudioEditorService._instance) {
      AudioEditorService._instance = new AudioEditorService();
    }
    return AudioEditorService._instance;
  }

  constructor() {
    // Ensure upload directory exists on startup
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  /** Absolute path to the upload directory — used to configure multer. */
  getUploadDir(): string {
    return UPLOAD_DIR;
  }

  /** Absolute path to a temp WAV file identified by multer's filename (the `id`). */
  getTempFilePath(id: string): string {
    return path.join(UPLOAD_DIR, id);
  }

  /** Absolute path to the converted output file. */
  getTempOutputPath(id: string, format: string): string {
    return path.join(UPLOAD_DIR, `${id}_out.${format}`);
  }

  /** True when the temp WAV for a given id exists on disk. */
  fileExists(id: string): boolean {
    return existsSync(this.getTempFilePath(id));
  }

  private cleanupFile(filePath: string): void {
    try {
      if (existsSync(filePath)) unlinkSync(filePath);
    } catch (_e) {
      // best-effort — ignore errors during cleanup
    }
  }

  /**
   * Stream the temp WAV directly to the response (no conversion needed).
   * Cleans up the temp file after the download completes.
   */
  sendWavFile(
    tempWavPath: string,
    finalFilename: string,
    webResponse: any,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      webResponse.download(path.resolve(tempWavPath), finalFilename, (err: any) => {
        this.cleanupFile(tempWavPath);
        if (err) reject(err); else resolve();
      });
    });
  }

  /**
   * Convert the temp WAV to the requested format with ffmpeg and stream the
   * result to the response.  Cleans up both temp files when done.
   */
  convertAndStream(
    tempWavPath: string,
    tempOutputPath: string,
    format: string,
    finalFilename: string,
    webResponse: any,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(tempWavPath)
        .toFormat(format)
        .on('end', () => {
          this.cleanupFile(tempWavPath);
          webResponse.download(path.resolve(tempOutputPath), finalFilename, (err: any) => {
            this.cleanupFile(tempOutputPath);
            if (err) reject(err); else resolve();
          });
        })
        .on('error', (err: Error) => {
          console.error('[AudioEditor] FFmpeg conversion error:', err.message);
          this.cleanupFile(tempWavPath);
          this.cleanupFile(tempOutputPath);
          reject(err);
        })
        .save(tempOutputPath);
    });
  }
}
