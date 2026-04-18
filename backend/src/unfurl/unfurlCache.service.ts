import { awaitMilliseconds, readJSONFile, saveInAFilePromise } from "../utils";
import { UnfurlData } from "./unfurl";
import fetch from 'node-fetch';
import { readFile, writeFile, mkdir, unlink, stat } from 'fs/promises';
import { RecurrenceRule, scheduleJob } from 'node-schedule';

const cachePath       = 'data/cache/unfurl/unfurlSavedData.json';
const ytIndexPath     = 'data/cache/unfurl/unfurlCacheYTImages.json';
const imgCachePath    = 'data/cache/unfurl/img';

const MAX_CACHE_ITEM_SIZE = 3000;

export interface UnfurlCacheData extends UnfurlData {
  url: string;
  date: Date;
}

export class UnfurlCacheService {
  static _instance: UnfurlCacheService;

  static getInstance = () => {
    if (!UnfurlCacheService._instance) {
      console.log("Created Unfurl cache service");
      UnfurlCacheService._instance = new UnfurlCacheService();
    }
    return UnfurlCacheService._instance;
  }

  // ── Unfurl metadata cache ──────────────────────────────────────────────────
  public isLoadedUnfurlCache = false;
  public unfurlCache: UnfurlCacheData[] = [];

  // ── YouTube image index (in-memory hash: youtubeKey → filePath) ────────────
  private isLoadedYTImageIndex = false;
  private ytImageIndex = new Map<string, string>();

  constructor() {
    UnfurlCacheService._instance = this;

    // Save both caches every 24 hours
    const rule = new RecurrenceRule();
    const now = new Date();
    rule.hour   = now.getHours();
    rule.minute = now.getMinutes();
    scheduleJob('unfurl-cache-save', rule, () => {
      UnfurlCacheService.getInstance().saveCache();
    });
    console.log(`Unfurl cache save scheduled for every 24h at ${rule.hour}:${String(rule.minute).padStart(2, '0')}`);

    // Clean expired images on the 1st of each month at 00:00
    scheduleJob('unfurl-image-cleanup', { date: 1, hour: 0, minute: 0 }, () => {
      UnfurlCacheService.getInstance().cleanExpiredImages();
      console.log("[UNFURL] Cleaned unfurl image caché!");
    });
    console.log("Unfurl image cleanup scheduled for the 1st day of each month at 00:00");
  }

  // ── Unfurl metadata ────────────────────────────────────────────────────────

  cleanCacheOfExpired = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.unfurlCache = this.unfurlCache.filter(item => item.date > thirtyDaysAgo);
  }

  getDataFromUnfurlCache = async (url: string): Promise<UnfurlCacheData | undefined> => {
    if (!this.isLoadedUnfurlCache) {
      this.unfurlCache = await readJSONFile(cachePath, '[]');
      if (this.unfurlCache as any === '[]') {
        this.unfurlCache = [];
      }
      this.unfurlCache = this.unfurlCache.map(item => ({
        ...item,
        date: item.date ? new Date(item.date as unknown as string) : new Date(),
      }));
      // Enforce the size cap on load in case the file predates the limit
      if (this.unfurlCache.length > MAX_CACHE_ITEM_SIZE) {
        this.unfurlCache = this.unfurlCache.slice(this.unfurlCache.length - MAX_CACHE_ITEM_SIZE);
      }
      this.isLoadedUnfurlCache = true;
      console.log(`Loaded Unfurl cache service content (${this.unfurlCache.length} entries)`);
    }
    return this.unfurlCache.find(data => data.url === url);
  };

  /**
   * Reset all in-memory state so the next request re-reads from the (freshly synced) disk files.
   * Called by SynchronizeService after a zip import.
   */
  resetForSync = () => {
    this.isLoadedUnfurlCache   = false;
    this.unfurlCache           = [];
    this.isLoadedYTImageIndex  = false;
    this.ytImageIndex.clear();
    console.log('[UNFURL] Cache reset for sync — will reload from disk on next access.');
  };

  addDataToCache = (newData: UnfurlCacheData) => {
    const isAlreadyInCache = !!this.unfurlCache.find(({ url }) => newData.url === url);
    if (!isAlreadyInCache) {
      this.unfurlCache.push(newData);
      // Queue discipline: drop the oldest entry when the cap is exceeded
      if (this.unfurlCache.length > MAX_CACHE_ITEM_SIZE) {
        this.unfurlCache.shift();
      }
    }
  }

  saveCache = async () => {
    // Save unfurl metadata
    this.cleanCacheOfExpired();
    this.unfurlCache = this.unfurlCache.filter(
      ({ title, urlImage, description }) => title !== '' && urlImage !== '' && description !== ''
    );
    const unfurlCacheToJson = this.unfurlCache.map(item => ({
      ...item,
      date: item.date.toISOString(),
    }));
    await saveInAFilePromise(JSON.stringify(unfurlCacheToJson, null, 2), cachePath);

    // Save YT image index (only if it was ever loaded — no point writing an empty file otherwise)
    if (this.isLoadedYTImageIndex) {
      await this.saveYTImageIndex();
    }
    console.log("[UNFURL] Saved unfurl cache.")
  }

  // ── YouTube image index ────────────────────────────────────────────────────

  private ensureYTImageIndexLoaded = async (): Promise<void> => {
    if (this.isLoadedYTImageIndex) return;
    const raw = await readJSONFile(ytIndexPath, '{}');
    if (typeof raw === 'object' && raw !== null) {
      for (const [key, path] of Object.entries(raw as Record<string, string>)) {
        this.ytImageIndex.set(key, path);
      }
    }
    this.isLoadedYTImageIndex = true;
    console.log(`[UNFURL] Loaded YT image index: ${this.ytImageIndex.size} entries`);
  };

  private saveYTImageIndex = async (): Promise<void> => {
    const obj: Record<string, string> = {};
    this.ytImageIndex.forEach((path, key) => { obj[key] = path; });
    await saveInAFilePromise(JSON.stringify(obj, null, 2), ytIndexPath);
  };

  // ── YouTube image retrieval ────────────────────────────────────────────────

  getYoutubeImage = async (youtubeUrl: string, waitTime: number): Promise<Buffer | undefined> => {
    const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([\w-]{11})/);
    const youtubeKey = match ? match[1] : '';
    if (!youtubeKey) return undefined;

    await this.ensureYTImageIndexLoaded();

    // ── Fast path: key is in the in-memory index ──────────────────────────
    if (this.ytImageIndex.has(youtubeKey)) {
      const cachedPath = this.ytImageIndex.get(youtubeKey)!;
      try {
        const imageBuffer = await readFile(cachedPath);
        console.log(`[UNFURL] YouTube image served from index: ${youtubeKey}`);
        return imageBuffer;
      } catch (_) {
        // File was deleted externally — evict from index and re-download below
        console.log(`[UNFURL] Image ${youtubeKey} was in index but missing on disk; re-downloading…`);
        this.ytImageIndex.delete(youtubeKey);
      }
    }

    // ── Slow path: download from YouTube ─────────────────────────────────
    console.log(`[UNFURL] Downloading YouTube image for: ${youtubeKey}`);
    await awaitMilliseconds(waitTime);

    const imageUrl      = `https://img.youtube.com/vi/${youtubeKey}/maxresdefault.jpg`;
    const imageFilePath = `${imgCachePath}/${youtubeKey}.jpg`;

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error(`[UNFURL] Failed to download YouTube image: ${imageUrl}`);
        return undefined;
      }
      const imageBuffer = await response.buffer();
      await this.saveImageToCache(imageBuffer, imageFilePath);
      this.ytImageIndex.set(youtubeKey, imageFilePath);
      // await this.saveYTImageIndex();
      console.log(`[UNFURL] Saved YouTube image to cache: ${youtubeKey}`);
      return imageBuffer;
    } catch (err) {
      console.error(`[UNFURL] Error downloading YouTube image for ${youtubeKey}:`, err);
      return undefined;
    }
  }

  private saveImageToCache = async (buffer: Buffer, filePath: string): Promise<void> => {
    const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
    await mkdir(folderPath, { recursive: true });
    await writeFile(filePath, buffer as any);
  }

  // ── Periodic cleanup ───────────────────────────────────────────────────────

  cleanExpiredImages = async (): Promise<void> => {
    await this.ensureYTImageIndexLoaded();

    const oneMonthAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const keysToRemove: string[] = [];
    let deletedCount   = 0;
    let missingCount   = 0;

    for (const [key, filePath] of Array.from(this.ytImageIndex.entries())) {
      try {
        const fileStats = await stat(filePath);
        if (fileStats.mtime < oneMonthAgo) {
          await unlink(filePath);
          keysToRemove.push(key);
          deletedCount++;
          console.log(`[UNFURL] Deleted expired image: ${key}`);
        }
      } catch (_) {
        // File no longer exists on disk — remove from index, do not re-download
        keysToRemove.push(key);
        missingCount++;
        console.log(`[UNFURL] Image ${key} missing on disk; removed from index`);
      }
    }

    for (const key of keysToRemove) {
      this.ytImageIndex.delete(key);
    }

    if (keysToRemove.length > 0) {
      await this.saveYTImageIndex();
    }

    console.log(`[UNFURL] Image cleanup: deleted ${deletedCount} expired, removed ${missingCount} missing from index.`);
  }
}
