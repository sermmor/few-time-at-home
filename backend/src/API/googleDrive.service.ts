import { google } from 'googleapis';
import { createReadStream } from 'fs';
import { basename } from 'path';
import { Readable } from 'stream';

const BACKUP_FOLDER_NAME = 'Few_time_at_home_backups';

export interface DriveItem {
  id:            string;
  name:          string;
  isFolder:      boolean;
  mimeType:      string;
  size?:         number;
  modifiedTime?: string;
}

/**
 * Uploads weekly backup .zip files to a folder in your personal Google Drive
 * using OAuth 2.0 (refresh token).
 *
 * ── One-time setup ───────────────────────────────────────────────────────────
 * 1. In Google Cloud Console → APIs & Services → Credentials:
 *    - Create an OAuth 2.0 Client ID of type "Desktop app"
 *    - Download the JSON — you need the client_id and client_secret values
 * 2. Run the authorisation script once:
 *      node setup-google-drive.js <CLIENT_ID> <CLIENT_SECRET>
 *    Then open the printed URL in your browser, grant access, and copy the
 *    three values it outputs into keys.json.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * keys.json fields used by this service:
 *   google_drive_client_id      — OAuth client ID
 *   google_drive_client_secret  — OAuth client secret
 *   google_drive_refresh_token  — long-lived refresh token (from setup script)
 *   google_drive_folder_id      — (optional) ID of an existing Drive folder to
 *                                  upload into; if absent the service creates
 *                                  "Few_time_at_home_backups" automatically.
 */
export class GoogleDriveService {
  static Instance: GoogleDriveService;

  private drive:          ReturnType<typeof google.drive> | null = null;
  private backupFolderId: string | null;

  constructor(
    clientId:          string,
    clientSecret:      string,
    refreshToken:      string,
    explicitFolderId?: string,
  ) {
    GoogleDriveService.Instance = this;
    this.backupFolderId = explicitFolderId ?? null;
    this._init(clientId, clientSecret, refreshToken);
  }

  isConfigured = (): boolean => this.drive !== null;

  // ── Upload ─────────────────────────────────────────────────────────────────
  uploadBackup = async (zipPath: string): Promise<void> => {
    if (!this.drive) {
      console.warn('[Drive] Not configured — skipping upload.');
      return;
    }

    try {
      const folderId = await this._getOrCreateFolder();
      if (!folderId) {
        console.error('[Drive] Could not resolve backup folder — aborting upload.');
        return;
      }

      const res = await this.drive.files.create({
        requestBody: {
          name:    basename(zipPath),
          parents: [folderId],
        },
        media: {
          mimeType: 'application/zip',
          body:     createReadStream(zipPath),
        },
        fields: 'id,name,size',
      });

      console.log(`[Drive] Backup uploaded — "${res.data.name}" (${res.data.size} bytes, id: ${res.data.id})`);
    } catch (err: any) {
      console.error('[Drive] Upload error:', err?.message ?? err);
    }
  };

  // ── Browse ────────────────────────────────────────────────────────────────
  listFolder = async (folderId?: string): Promise<DriveItem[]> => {
    if (!this.drive) return [];
    try {
      const q = folderId
        ? `'${folderId}' in parents and trashed=false`
        : `'root' in parents and trashed=false`;
      const res = await this.drive.files.list({
        q,
        fields: 'files(id,name,mimeType,size,modifiedTime)',
        orderBy: 'folder,name',
        pageSize: 1000,
      });
      return (res.data.files ?? []).map(f => ({
        id:           f.id!,
        name:         f.name!,
        isFolder:     f.mimeType === 'application/vnd.google-apps.folder',
        mimeType:     f.mimeType ?? '',
        size:         f.size !== undefined && f.size !== null ? Number(f.size) : undefined,
        modifiedTime: f.modifiedTime ?? undefined,
      }));
    } catch (err: any) {
      console.error('[Drive] listFolder error:', err?.message ?? err);
      return [];
    }
  };

  // ── Upload file (from in-memory buffer) ───────────────────────────────────
  uploadFileBuffer = async (
    name:            string,
    mimeType:        string,
    buffer:          Buffer,
    parentFolderId?: string,
  ): Promise<{ id: string; name: string }> => {
    if (!this.drive) throw new Error('Drive not configured');
    const body = Readable.from(buffer);
    const res = await this.drive.files.create({
      requestBody: {
        name,
        parents: parentFolderId ? [parentFolderId] : undefined,
      },
      media: { mimeType, body },
      fields: 'id,name',
    });
    return { id: res.data.id!, name: res.data.name! };
  };

  // ── Create folder ──────────────────────────────────────────────────────────
  createDriveFolder = async (
    name:            string,
    parentFolderId?: string,
  ): Promise<{ id: string; name: string }> => {
    if (!this.drive) throw new Error('Drive not configured');
    const res = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents:  parentFolderId ? [parentFolderId] : undefined,
      },
      fields: 'id,name',
    });
    return { id: res.data.id!, name: res.data.name! };
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  deleteItem = async (fileId: string): Promise<void> => {
    if (!this.drive) throw new Error('Drive not configured');
    await this.drive.files.delete({ fileId });
  };

  // ── Download stream ────────────────────────────────────────────────────────
  getDownloadStream = async (fileId: string): Promise<{
    stream:    NodeJS.ReadableStream;
    name:      string;
    mimeType:  string;
    size?:     string;
  }> => {
    if (!this.drive) throw new Error('Drive not configured');
    const meta = await this.drive.files.get({ fileId, fields: 'name,mimeType,size' });
    // responseType: 'stream' makes googleapis return the raw HTTP response body.
    const res = await (this.drive as any).files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    );
    return {
      stream:   res.data as NodeJS.ReadableStream,
      name:     meta.data.name!,
      mimeType: meta.data.mimeType ?? 'application/octet-stream',
      size:     meta.data.size ?? undefined,
    };
  };

  // ── Internals ──────────────────────────────────────────────────────────────
  private _init(clientId: string, clientSecret: string, refreshToken: string): void {
    if (!clientId || !clientSecret || !refreshToken) {
      console.log('[Drive] OAuth credentials missing in keys.json — Drive uploads disabled.');
      return;
    }
    try {
      const auth = new google.auth.OAuth2(clientId, clientSecret);
      auth.setCredentials({ refresh_token: refreshToken });
      this.drive = google.drive({ version: 'v3', auth });
      console.log('[Drive] Initialized successfully.');
    } catch (err: any) {
      console.error('[Drive] Initialization error:', err?.message ?? err);
    }
  }

  /**
   * Returns the folder ID to upload into.  On the first call the service
   * searches for an existing "Few_time_at_home_backups" folder in the user's
   * Drive; if none is found it creates one.  The result is cached so later
   * backups skip the API lookup entirely.
   */
  private _getOrCreateFolder = async (): Promise<string | null> => {
    if (this.backupFolderId) return this.backupFolderId;

    try {
      const list = await this.drive!.files.list({
        q:      `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name)',
        spaces: 'drive',
      });

      const existing = list.data.files?.[0];
      if (existing?.id) {
        console.log(`[Drive] Using existing folder "${BACKUP_FOLDER_NAME}" (${existing.id})`);
        this.backupFolderId = existing.id;
        return existing.id;
      }

      const created = await this.drive!.files.create({
        requestBody: {
          name:     BACKUP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });

      this.backupFolderId = created.data.id ?? null;
      console.log(`[Drive] Created folder "${BACKUP_FOLDER_NAME}" (${this.backupFolderId})`);
      return this.backupFolderId;
    } catch (err: any) {
      console.error('[Drive] Folder lookup/create error:', err?.message ?? err);
      return null;
    }
  };
}
