/**
 * Handles synchronisation of "remote" Desktop profiles with Google Drive.
 *
 * GDrive folder layout
 * ────────────────────
 * Few_Time_at_home_desktop/
 *   profileName.json              ← full profile config (JSON)
 *   profileName/
 *     assets/                     ← wallpapers + DesktopImage widget files
 *       1467665962890.jpg
 *       ...
 *     favicons/                   ← favicon files for DesktopLink widgets
 *       youtube.png
 *       ...
 *
 * Asset paths in the JSON always point to "cloud/desktop-remote/<filename>".
 * Whenever the user sets a wallpaper or image widget in a remote profile the
 * asset is automatically copied to that folder and the path is normalised
 * before the config is stored.  On pull, missing files are downloaded to the
 * same relative path so the profile works on any machine without reconfiguring.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join }  from 'path';
import { GoogleDriveService }       from './googleDrive.service';
import { DesktopProfilesService }   from './desktopProfiles.service';
import { CloudService }             from './cloud.service';
import { getFaviconFilePath }       from './favicon.service';

const DESKTOP_GDRIVE_FOLDER = 'Few_Time_at_home_desktop';
const FAVICON_DIR           = 'data/favicon';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data',  chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end',   ()    => resolve(Buffer.concat(chunks)));
    stream.on('error', err   => reject(err));
  });
}

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png',  gif:  'image/gif',
    webp: 'image/webp', bmp: 'image/bmp',
    svg: 'image/svg+xml', ico: 'image/x-icon',
  };
  return map[ext] ?? 'application/octet-stream';
}

/** Converts a cloud virtual path (e.g. "cloud/Imagenes/x.jpg") to the real
 *  absolute filesystem path using CloudService. */
function cloudToAbs(cloudPath: string): string {
  return CloudService.Instance.fromRelativePathToAbsolute(cloudPath);
}

// ── Service ───────────────────────────────────────────────────────────────────

export class DesktopRemoteService {
  /** Cached GDrive ID of the main desktop folder. */
  private static _mainFolderId: string | null              = null;
  /** In-flight promise for ensureMainFolder (prevents concurrent creation). */
  private static _pendingMainFolder: Promise<string | null> | null = null;
  /**
   * Cached GDrive IDs of subfolders.
   * Keys: `{profileName}`, `{profileName}/assets`, `{profileName}/favicons`
   */
  private static _subFolderIds:     Map<string, string>             = new Map();
  /**
   * In-flight promises for _ensureSubFolder.
   * Concurrent callers with the same key share one promise → no duplicate creation.
   */
  private static _pendingSubFolders: Map<string, Promise<string | null>> = new Map();
  /**
   * Profiles whose push is currently in progress.
   * A second concurrent pushProfile call for the same profile is dropped.
   */
  private static _activePushes:     Set<string>                     = new Set();

  // ── Folder helpers ─────────────────────────────────────────────────────────

  static ensureMainFolder = async (): Promise<string | null> => {
    if (DesktopRemoteService._mainFolderId) return DesktopRemoteService._mainFolderId;
    // Share in-flight promise so concurrent callers don't double-create
    if (DesktopRemoteService._pendingMainFolder) return DesktopRemoteService._pendingMainFolder;

    DesktopRemoteService._pendingMainFolder = (async () => {
      const drive = GoogleDriveService.Instance;
      if (!drive?.isConfigured()) return null;
      try {
        const items    = await drive.listFolder(undefined);
        const existing = items.find(it => it.isFolder && it.name === DESKTOP_GDRIVE_FOLDER);
        if (existing) {
          DesktopRemoteService._mainFolderId = existing.id;
          console.log(`[DesktopRemote] Using GDrive folder "${DESKTOP_GDRIVE_FOLDER}" (${existing.id})`);
          return existing.id;
        }
        const created = await drive.createDriveFolder(DESKTOP_GDRIVE_FOLDER);
        DesktopRemoteService._mainFolderId = created.id;
        console.log(`[DesktopRemote] Created GDrive folder "${DESKTOP_GDRIVE_FOLDER}" (${created.id})`);
        return created.id;
      } catch (e: any) {
        console.error('[DesktopRemote] ensureMainFolder error:', e?.message ?? e);
        return null;
      } finally {
        DesktopRemoteService._pendingMainFolder = null;
      }
    })();

    return DesktopRemoteService._pendingMainFolder;
  };

  /**
   * Returns (and caches) a GDrive subfolder ID, creating it when absent.
   * Concurrent calls with the same key share one in-flight promise so only
   * one folder is ever created even under heavy concurrency.
   * @param key      cache key, e.g. "myProfile/assets"
   * @param name     folder name to look up / create
   * @param parentId parent folder ID in GDrive
   */
  private static _ensureSubFolder = (
    key:      string,
    name:     string,
    parentId: string,
  ): Promise<string | null> => {
    // Already resolved → return synchronously wrapped
    if (DesktopRemoteService._subFolderIds.has(key))
      return Promise.resolve(DesktopRemoteService._subFolderIds.get(key)!);
    // Already in flight → share the same promise
    if (DesktopRemoteService._pendingSubFolders.has(key))
      return DesktopRemoteService._pendingSubFolders.get(key)!;

    const promise = (async () => {
      const drive = GoogleDriveService.Instance;
      if (!drive?.isConfigured()) return null;
      try {
        const items    = await drive.listFolder(parentId);
        const existing = items.find(it => it.isFolder && it.name === name);
        if (existing) {
          DesktopRemoteService._subFolderIds.set(key, existing.id);
          return existing.id;
        }
        const created = await drive.createDriveFolder(name, parentId);
        DesktopRemoteService._subFolderIds.set(key, created.id);
        return created.id;
      } catch (e: any) {
        console.error(`[DesktopRemote] _ensureSubFolder("${name}") error:`, e?.message ?? e);
        return null;
      } finally {
        DesktopRemoteService._pendingSubFolders.delete(key);
      }
    })();

    DesktopRemoteService._pendingSubFolders.set(key, promise);
    return promise;
  };

  private static _profileRootFolder = async (
    profileName:   string,
    mainFolderId:  string,
  ) => DesktopRemoteService._ensureSubFolder(profileName, profileName, mainFolderId);

  private static _assetsFolder = async (
    profileName:  string,
    profileRoot:  string,
  ) => DesktopRemoteService._ensureSubFolder(`${profileName}/assets`, 'assets', profileRoot);

  private static _faviconsFolder = async (
    profileName:  string,
    profileRoot:  string,
  ) => DesktopRemoteService._ensureSubFolder(`${profileName}/favicons`, 'favicons', profileRoot);

  // ── Collect assets from a config ──────────────────────────────────────────

  /**
   * Returns { assetPaths, faviconNames } extracted from a raw config object.
   * assetPaths: unique cloud-relative paths used as wallpapers or widget images.
   * faviconNames: unique favicon names (without extension) from link widgets.
   */
  private static _collectAssets = (config: any): {
    assetPaths:   string[];
    faviconNames: string[];
  } => {
    const assetSet   = new Set<string>();
    const faviconSet = new Set<string>();

    // Wallpapers
    for (const p of (config.wallpapers ?? []) as string[]) {
      if (p) assetSet.add(p);
    }
    // DesktopImage widget cloud paths
    for (const img of (config.images ?? []) as any[]) {
      if (img?.cloudPath) assetSet.add(img.cloudPath);
    }
    // DesktopLink favicons
    for (const link of (config.links ?? []) as any[]) {
      if (link?.favicon) faviconSet.add(link.favicon);
    }

    return {
      assetPaths:   [...assetSet],
      faviconNames: [...faviconSet],
    };
  };

  // ── Path normalisation (local copy → cloud/desktop-remote/) ─────────────────

  /**
   * Called whenever a remote profile's config is saved.
   *
   * Any wallpaper or image-widget path that is NOT already inside
   * "cloud/desktop-remote/" is copied there and the reference in the config
   * object is updated to the new canonical path.  This guarantees that all
   * machines running the app can locate the file under the same relative path.
   *
   * Returns a deep-cloned config with the normalised paths (the original is
   * never mutated).
   */
  static normalizeRemoteAssetPaths = (config: any): any => {
    const REMOTE_DIR    = 'cloud/desktop-remote';
    const absRemoteDir  = cloudToAbs(REMOTE_DIR);

    if (!existsSync(absRemoteDir)) {
      mkdirSync(absRemoteDir, { recursive: true });
      console.log(`[DesktopRemote] Created local asset directory "${REMOTE_DIR}"`);
    }

    const normalized = JSON.parse(JSON.stringify(config)) as any;

    const normalisePath = (cloudPath: string): string => {
      if (!cloudPath || cloudPath.startsWith(`${REMOTE_DIR}/`)) return cloudPath;

      const filename   = basename(cloudPath);
      const destRel    = `${REMOTE_DIR}/${filename}`;
      const srcAbs     = cloudToAbs(cloudPath);
      const destAbs    = cloudToAbs(destRel);

      if (!existsSync(srcAbs)) return cloudPath; // source missing — keep as-is

      if (!existsSync(destAbs)) {
        try {
          copyFileSync(srcAbs, destAbs);
          console.log(`[DesktopRemote] Copied asset to remote dir: ${filename}`);
        } catch (e: any) {
          console.error(`[DesktopRemote] Failed to copy "${cloudPath}" → remote dir:`, e?.message);
          return cloudPath; // keep original on error
        }
      }

      return destRel;
    };

    if (Array.isArray(normalized.wallpapers)) {
      normalized.wallpapers = (normalized.wallpapers as string[]).map(p => p ? normalisePath(p) : p);
    }

    if (Array.isArray(normalized.images)) {
      normalized.images = normalized.images.map((img: any) =>
        img?.cloudPath ? { ...img, cloudPath: normalisePath(img.cloudPath) } : img,
      );
    }

    return normalized;
  };

  // ── Push (local → GDrive) ─────────────────────────────────────────────────

  /**
   * Uploads the profile JSON, all referenced wallpapers, image widget files
   * and favicons to GDrive.  Files that already exist in GDrive are updated
   * (upsert) so they stay in sync.
   */
  static pushProfile = async (profileName: string, config: object): Promise<void> => {
    // Drop concurrent pushes for the same profile to avoid race conditions that
    // would create duplicate folders/files in GDrive (e.g. beforeunload + unmount
    // firing simultaneously).
    if (DesktopRemoteService._activePushes.has(profileName)) {
      console.log(`[DesktopRemote] Push already in progress for "${profileName}" — skipping duplicate`);
      return;
    }
    DesktopRemoteService._activePushes.add(profileName);
    const drive = GoogleDriveService.Instance;
    if (!drive?.isConfigured()) { DesktopRemoteService._activePushes.delete(profileName); return; }
    try {
      const mainFolderId = await DesktopRemoteService.ensureMainFolder();
      if (!mainFolderId) return;

      // 1. Upload / overwrite profile JSON
      const jsonBuf = Buffer.from(JSON.stringify(config, null, 2), 'utf8');
      await drive.upsertFile(`${profileName}.json`, 'application/json', jsonBuf, mainFolderId);
      console.log(`[DesktopRemote] Pushed JSON for "${profileName}"`);

      const { assetPaths, faviconNames } = DesktopRemoteService._collectAssets(config);

      // 2. Upload cloud-based assets (wallpapers + widget images)
      if (assetPaths.length > 0) {
        const profileRoot = await DesktopRemoteService._profileRootFolder(profileName, mainFolderId);
        if (profileRoot) {
          const assetsFolderId = await DesktopRemoteService._assetsFolder(profileName, profileRoot);
          if (assetsFolderId) {
            let uploaded = 0;
            for (const cloudPath of assetPaths) {
              const absPath = cloudToAbs(cloudPath);
              if (!existsSync(absPath)) continue;
              try {
                const filename = basename(cloudPath);
                const buffer   = readFileSync(absPath);
                await drive.upsertFile(filename, guessMimeType(filename), buffer, assetsFolderId);
                uploaded++;
              } catch (e: any) {
                console.error(`[DesktopRemote] Failed to upload asset "${cloudPath}":`, e?.message);
              }
            }
            if (uploaded > 0) {
              console.log(`[DesktopRemote] Pushed ${uploaded} asset(s) for "${profileName}"`);
            }
          }
        }
      }

      // 3. Upload favicons
      if (faviconNames.length > 0) {
        const profileRoot = await DesktopRemoteService._profileRootFolder(profileName, mainFolderId);
        if (profileRoot) {
          const faviconsFolderId = await DesktopRemoteService._faviconsFolder(profileName, profileRoot);
          if (faviconsFolderId) {
            let uploaded = 0;
            for (const name of faviconNames) {
              const absPath = getFaviconFilePath(name);
              if (!absPath) continue; // not cached locally
              try {
                const filename = basename(absPath); // e.g. "youtube.png"
                const buffer   = readFileSync(absPath);
                await drive.upsertFile(filename, guessMimeType(filename), buffer, faviconsFolderId);
                uploaded++;
              } catch (e: any) {
                console.error(`[DesktopRemote] Failed to upload favicon "${name}":`, e?.message);
              }
            }
            if (uploaded > 0) {
              console.log(`[DesktopRemote] Pushed ${uploaded} favicon(s) for "${profileName}"`);
            }
          }
        }
      }
    } catch (e: any) {
      console.error('[DesktopRemote] pushProfile error:', e?.message ?? e);
    } finally {
      DesktopRemoteService._activePushes.delete(profileName);
    }
  };

  // ── Pull (GDrive → local) ─────────────────────────────────────────────────

  /**
   * Downloads the profile JSON from GDrive and saves any missing assets
   * (wallpapers, widget images, favicons) to their expected local paths.
   * Returns the downloaded config, or null if unavailable.
   */
  static pullProfile = async (profileName: string): Promise<object | null> => {
    const drive = GoogleDriveService.Instance;
    if (!drive?.isConfigured()) return null;
    try {
      const mainFolderId = await DesktopRemoteService.ensureMainFolder();
      if (!mainFolderId) return null;

      // 1. Find and download profile JSON
      const mainItems = await drive.listFolder(mainFolderId);
      const jsonFile  = mainItems.find(it => !it.isFolder && it.name === `${profileName}.json`);
      if (!jsonFile) {
        console.warn(`[DesktopRemote] Profile "${profileName}" not found in GDrive`);
        return null;
      }
      const { stream } = await drive.getDownloadStream(jsonFile.id);
      const jsonBuf    = await streamToBuffer(stream);
      const config     = JSON.parse(jsonBuf.toString('utf8'));
      console.log(`[DesktopRemote] Pulled JSON for "${profileName}"`);

      // Find the profile root subfolder (may not exist if profile was just created)
      const profileRoot = mainItems.find(it => it.isFolder && it.name === profileName);
      if (!profileRoot) return config; // no assets uploaded yet → done

      const profileSubItems = await drive.listFolder(profileRoot.id);

      // 2. Download missing cloud-based assets (wallpapers + widget images)
      const { assetPaths, faviconNames } = DesktopRemoteService._collectAssets(config);

      const missingAssets = assetPaths.filter(p => !existsSync(cloudToAbs(p)));
      if (missingAssets.length > 0) {
        const assetsFolder = profileSubItems.find(it => it.isFolder && it.name === 'assets');
        if (assetsFolder) {
          const assetFiles = await drive.listFolder(assetsFolder.id);
          const assetMap   = new Map(assetFiles.map(f => [f.name, f.id]));

          let downloaded = 0;
          for (const cloudPath of missingAssets) {
            const filename = basename(cloudPath);
            const fileId   = assetMap.get(filename);
            if (!fileId) continue;
            try {
              const absPath = cloudToAbs(cloudPath);
              const dir     = dirname(absPath);
              if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
              const { stream: s } = await drive.getDownloadStream(fileId);
              writeFileSync(absPath, await streamToBuffer(s));
              downloaded++;
            } catch (e: any) {
              console.error(`[DesktopRemote] Failed to download asset "${cloudPath}":`, e?.message);
            }
          }
          if (downloaded > 0) {
            console.log(`[DesktopRemote] Downloaded ${downloaded} asset(s) for "${profileName}"`);
          }
        }
      }

      // 3. Download missing favicons
      const missingFavicons = faviconNames.filter(n => !getFaviconFilePath(n));
      if (missingFavicons.length > 0) {
        const faviconsFolder = profileSubItems.find(it => it.isFolder && it.name === 'favicons');
        if (faviconsFolder) {
          const faviconFiles = await drive.listFolder(faviconsFolder.id);

          let downloaded = 0;
          for (const name of missingFavicons) {
            // Find any GDrive file whose name starts with "{name}."
            const match = faviconFiles.find(f => f.name.startsWith(`${name}.`));
            if (!match) continue;
            try {
              if (!existsSync(FAVICON_DIR)) mkdirSync(FAVICON_DIR, { recursive: true });
              const localPath = join(FAVICON_DIR, match.name);
              const { stream: s } = await drive.getDownloadStream(match.id);
              writeFileSync(localPath, await streamToBuffer(s));
              downloaded++;
            } catch (e: any) {
              console.error(`[DesktopRemote] Failed to download favicon "${name}":`, e?.message);
            }
          }
          if (downloaded > 0) {
            console.log(`[DesktopRemote] Downloaded ${downloaded} favicon(s) for "${profileName}"`);
          }
        }
      }

      return config;
    } catch (e: any) {
      console.error('[DesktopRemote] pullProfile error:', e?.message ?? e);
      return null;
    }
  };

  // ── Discovery (startup) ───────────────────────────────────────────────────

  /**
   * Scans `Few_Time_at_home_desktop` in GDrive and imports any profiles that
   * are not yet known locally.  Called once at startup.
   */
  static discoverNewProfiles = async (): Promise<void> => {
    const drive = GoogleDriveService.Instance;
    if (!drive?.isConfigured()) return;
    try {
      const mainFolderId = await DesktopRemoteService.ensureMainFolder();
      if (!mainFolderId) return;

      const items     = await drive.listFolder(mainFolderId);
      const jsonFiles = items.filter(it => !it.isFolder && it.name.endsWith('.json'));
      const svc       = DesktopProfilesService.Instance;
      if (!svc) return;
      const existing  = new Set(svc.listProfiles());

      let discovered = 0;
      for (const file of jsonFiles) {
        const name = file.name.slice(0, -5);
        if (existing.has(name)) continue;

        const config = await DesktopRemoteService.pullProfile(name);
        if (!config) continue;

        svc.importProfile(name, config as any);
        discovered++;
      }

      if (discovered > 0) {
        console.log(`[DesktopRemote] Imported ${discovered} new remote profile(s).`);
      }
    } catch (e: any) {
      console.error('[DesktopRemote] discoverNewProfiles error:', e?.message ?? e);
    }
  };
}
