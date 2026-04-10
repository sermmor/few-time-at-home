import { awaitMilliseconds, readJSONFile, saveInAFilePromise } from "../utils";
import { UnfurlData } from "./unfurl";
import fetch from 'node-fetch';
import { readFile, mkdir, readdir, unlink, stat } from 'fs/promises';
import { writeFile } from 'fs';
import { RecurrenceRule, scheduleJob } from 'node-schedule';

const cachePath = 'data/cache/unfurl/unfurlSavedData.json';
const timeInHoursToSaveCacheDataInFiles = 24; // 1 time in a day

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

  constructor(public isLoadedUnfurlCache = false, public unfurlCache: UnfurlCacheData[] = [] ) {
    UnfurlCacheService._instance = this;
    
    // Schedule cache save to run every 24 hours using node-schedule
    const rule = new RecurrenceRule();
    const now = new Date();
    rule.hour = now.getHours();
    rule.minute = now.getMinutes();
    
    scheduleJob('unfurl-cache-save', rule, () => {
      UnfurlCacheService.getInstance().saveCache();
    });
    console.log(`Unfurl cache save scheduled for every 24h at ${rule.hour}:${String(rule.minute).padStart(2, '0')}`);

    // Schedule image cleanup to run once a month on the 1st day at 00:00
    scheduleJob('unfurl-image-cleanup', { date: 1, hour: 0, minute: 0 }, () => {
      UnfurlCacheService.getInstance().cleanExpiredImages();
      console.log("[UNFURL] Cleaned unfurl image caché!");
    });
    console.log("Unfurl image cleanup scheduled for the 1st day of each month at 00:00");
  }

  cleanCacheOfExpired = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    this.unfurlCache = this.unfurlCache.filter(item => item.date > thirtyDaysAgo);
  }

  getDataFromUnfurlCache = async(url: string): Promise<UnfurlCacheData | undefined> => {
    if (!this.isLoadedUnfurlCache) {
      this.unfurlCache = await readJSONFile(cachePath, '[]');
      if (this.unfurlCache as any === '[]') {
        this.unfurlCache = [];
      }
      this.unfurlCache = this.unfurlCache.map(item => ({
        ...item,
        date: item.date ? new Date(item.date as unknown as string) : new Date(),
      }));
      this.isLoadedUnfurlCache = true;

      console.log("Loaded Unfurl cache service content");
    }
    return this.unfurlCache.find(data => data.url === url);
  };

  addDataToCache = (newData: UnfurlCacheData) => {
    const isAlreadyInCache = !!this.unfurlCache.find(({url: urlInCache}) => newData.url === urlInCache);
    if (!isAlreadyInCache) {
      this.unfurlCache.push(newData);
    }
  }

  saveCache = async () => {
    this.cleanCacheOfExpired();
    this.unfurlCache = this.unfurlCache.filter(({title, urlImage, description}) => title !== '' && urlImage !== '' && description !== '');
    const unfurlCacheToJson = this.unfurlCache.map(item => ({
      ...item,
      date: item.date.toISOString(),
    }));
    await saveInAFilePromise(JSON.stringify(unfurlCacheToJson, null, 2), cachePath);
  }

  getYoutubeImage = async (youtubeUrl: string, waitTime: number): Promise<Buffer | undefined> => {
    const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([\w-]{11})/);
    const youtubeKey = match ? match[1] : '';
    
    if (!youtubeKey) {
      return undefined;
    }

    const imgCachePath = 'data/cache/unfurl/img';
    const imageFilePath = `${imgCachePath}/${youtubeKey}.jpg`;

    try {
      // Crear la carpeta si no existe
      await mkdir(imgCachePath, { recursive: true });

      // Intentar leer el archivo si existe
      try {
        const imageBuffer = await readFile(imageFilePath);
        console.log(`Loaded YouTube image from cache: ${youtubeKey}`);
        return imageBuffer;
      } catch (err) {
        // Si el archivo no existe, descargarlo
        console.log(`Downloading YouTube image for: ${youtubeKey}`);
        await awaitMilliseconds(waitTime);
        
        const imageUrl = `https://img.youtube.com/vi/${youtubeKey}/maxresdefault.jpg`;
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
          console.error(`Failed to download YouTube image: ${imageUrl}`);
          return undefined;
        }

        const imageBuffer = await response.buffer();
        
        // Guardar la imagen en caché
        await this.saveImageToCache(imageBuffer, imageFilePath);
        console.log(`Saved YouTube image to cache: ${youtubeKey}`);
        
        return imageBuffer;
      }
    } catch (err) {
      console.error(`Error in getYoutubeImage for ${youtubeKey}:`, err);
      return undefined;
    }
  }

  private saveImageToCache = async (buffer: Buffer, filePath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
        mkdir(folderPath, { recursive: true }).then(() => {
          writeFile(filePath, buffer as any, (err: any) => {
            if (err) {
              console.error(`Error saving image to cache at ${filePath}:`, err);
              reject(err);
            } else {
              resolve();
            }
          });
        }).catch((err: any) => {
          console.error(`Error creating cache directory at ${folderPath}:`, err);
          reject(err);
        });
      } catch (err) {
        console.error(`Error saving image to cache at ${filePath}:`, err);
        reject(err);
      }
    });
  }

  private cleanExpiredImages = async (): Promise<void> => {
    try {
      const imgCachePath = 'data/cache/unfurl/img';
      const files = await readdir(imgCachePath);
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      let deletedCount = 0;

      for (const file of files) {
        const filePath = `${imgCachePath}/${file}`;
        try {
          const fileStats = await stat(filePath);
          if (fileStats.mtime < oneMonthAgo) {
            await unlink(filePath);
            console.log(`Deleted expired image: ${file}`);
            deletedCount++;
          }
        } catch (err) {
          console.error(`Error processing file ${filePath}:`, err);
        }
      }

      console.log(`Image cleanup completed. Deleted ${deletedCount} expired images.`);
    } catch (err) {
      console.error("Error during image cleanup:", err);
    }
  }
}