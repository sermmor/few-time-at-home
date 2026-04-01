import { readJSONFile, saveInAFilePromise } from "../utils";
import { UnfurlData } from "./unfurl";

const cachePath = 'data/cache/unfurl/unfurlSavedData.json';

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
    
    const unfurlCacheToJson = this.unfurlCache.map(item => ({
      ...item,
      date: item.date.toISOString(),
    }));
    await saveInAFilePromise(JSON.stringify(unfurlCacheToJson, null, 2), cachePath);
  }
}