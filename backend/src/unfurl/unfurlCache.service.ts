import { awaitMilliseconds, readJSONFile, saveInAFilePromise } from "../utils";
import { UnfurlData } from "./unfurl";

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
    setInterval(() => {
      UnfurlCacheService.getInstance().saveCache();
    }, timeInHoursToSaveCacheDataInFiles * 60 * 60 * 1000);
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

  getYoutubeImage = async (youtubeUrl: string, waitTime: number): Promise<string | undefined> => {
    let split: string[];
    const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([\w-]{11})/);
    const youtubeKey = match ? match[1] : '';
    // TODO: En el caso de que YouTube bloqueé también esto, deberá de devolver un BLOB de la imagen que la tenemos descargada en la caché.
    await awaitMilliseconds(waitTime);
    return this.unfurlCache.find(data => data.url.includes(youtubeKey))?.urlImage;
  }
}