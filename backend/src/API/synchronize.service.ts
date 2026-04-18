/**
 * SynchronizeService
 *
 * Exports / imports the entire `data/` directory as a zip archive.
 *
 *   GET  /synchronize/export    — packages data/ into a zip and streams it to the caller
 *   POST /synchronize/download  — client: fetches the zip from a remote URL, extracts it
 *                                          over data/, then reloads all in-memory service state
 *
 * Temporary zip files are placed at the backend root (NOT inside data/) so they are never
 * accidentally included inside the archive itself.
 *
 * Files NOT transferred (they live at the backend root, outside data/):
 *   • configuration.json  (instance-specific ports, paths, …)
 *   • keys.json           (secrets / tokens)
 */

import { zip } from 'zip-a-folder';
import { exec }  from 'child_process';
import path from 'path';
import { writeFile, unlink } from 'fs/promises';
import { NotesService }         from './notes.service';
import { AlertListService }     from './alertNotification.service';
import { PomodoroService }      from './pomodoro.service';
import { ConfigurationService } from './configuration.service';
import { MediaRSSAutoupdate }   from '../processAutoupdate/mediaRSSAutoupdate';
import { UnfurlCacheService }   from '../unfurl/unfurlCache.service';

const fetch = require('node-fetch');

const DATA_DIR   = 'data';
const EXPORT_ZIP = 'sync_export.zip';  // backend root — never inside data/
const IMPORT_ZIP = 'sync_import.zip';  // backend root — never inside data/

export class SynchronizeService {

  // ─── Export ─────────────────────────────────────────────────────────────────

  /** Zip data/ with zip-a-folder and stream it to the HTTP response. */
  exportDataAsZip = async (webResponse: any): Promise<void> => {
    await zip(DATA_DIR, EXPORT_ZIP);

    return new Promise<void>((resolve, reject) => {
      webResponse.download(path.resolve(EXPORT_ZIP), 'sync_export.zip', (err: any) => {
        unlink(EXPORT_ZIP).catch(() => {}); // clean up temp file (best-effort)
        if (err) reject(err); else resolve();
      });
    });
  };

  // ─── Import ─────────────────────────────────────────────────────────────────

  /**
   * Extract a zip over data/ and reload all in-memory service state.
   *
   * Extraction is delegated to the OS zip tool for reliability:
   *   Linux / macOS → unzip  (pre-installed on most systems; apt install unzip if needed)
   *   Windows       → PowerShell Expand-Archive  (available on Win 10+)
   *
   * The zip created by zip-a-folder stores files WITHOUT the top-level folder name,
   * so extracting into data/ correctly rebuilds the directory tree.
   */
  importDataFromZip = async (zipPath: string): Promise<void> => {
    await this.extractZip(path.resolve(zipPath), path.resolve(DATA_DIR));
    await this.reloadAllServices();
    await unlink(zipPath).catch(() => {}); // clean up import zip (best-effort)
  };

  private extractZip = (absZipPath: string, absDestDir: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const isWin = process.platform === 'win32';
      const cmd   = isWin
        ? `powershell.exe -Command "Expand-Archive -Path '${absZipPath}' -DestinationPath '${absDestDir}' -Force"`
        : `unzip -o "${absZipPath}" -d "${absDestDir}"`;

      exec(cmd, (err, _stdout, stderr) => {
        if (err) {
          console.error('[Sync] Extraction error:', stderr);
          reject(err);
        } else {
          resolve();
        }
      });
    });

  // ─── Client download ─────────────────────────────────────────────────────────

  /** Fetch the zip from a remote instance's export endpoint and apply it locally. */
  clientDownloadFromUrl = async (url: string): Promise<void> => {
    const exportUrl = url.replace(/\/$/, '') + '/synchronize/export';
    console.log(`[Sync] Fetching from: ${exportUrl}`);

    const res = await fetch(exportUrl);
    if (!res.ok) throw new Error(`Remote returned HTTP ${res.status}`);

    const buffer: Buffer = await res.buffer();
    await writeFile(IMPORT_ZIP, buffer);
    console.log(`[Sync] Zip downloaded (${buffer.length} bytes). Extracting…`);

    await this.importDataFromZip(IMPORT_ZIP);
    console.log('[Sync] Import complete.');
  };

  // ─── Service reload ──────────────────────────────────────────────────────────

  /**
   * After zip extraction the files on disk are fresh.
   * Reset in-memory caches so every service picks up the new data on next access.
   */
  private reloadAllServices = async (): Promise<void> => {
    // ── Notes ── reset array → will re-read lazily on next getNotes()
    NotesService.Instance.notes = [];

    // ── Alerts ── cancel all scheduled jobs, empty the list
    //   AlertListService re-reads from disk and re-schedules on next launchAlerts() call
    AlertListService.Instance.scheduleJobs.forEach(job => job.cancel());
    AlertListService.Instance.alertList   = [];
    AlertListService.Instance.scheduleJobs = [];

    // ── Pomodoro ── reset → will re-read lazily on next refleshTimerModeList()
    PomodoroService.Instance.timeModeList = [];

    // ── Configuration sub-configs (data/config/*.json) ──
    //   Root configuration.json (ports, paths, secrets) is intentionally NOT touched.
    await ConfigurationService.Instance.reloadSubConfigsFromDisk();

    // ── RSS message cache (data/config/media/*.json) ──
    await MediaRSSAutoupdate.instance.reloadFromDisk();

    // ── Unfurl cache (data/cache/unfurl/) ──
    //   Reset lazy-load flags → will re-read from the extracted files on next request.
    UnfurlCacheService.getInstance().resetForSync();

    // ReadLaterMessagesRSS — static, always reads from disk; no action needed.
    // BookmarkService      — reads from disk on every operation; no action needed.

    console.log('[Sync] All services reloaded from disk.');
  };
}
