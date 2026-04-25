import { unfurl } from 'unfurl.js';
import { Metadata } from 'unfurl.js/dist/types';
import { awaitMilliseconds, readJSONFile, saveInAFilePromise } from '../utils';
import { UnfurlCacheData, UnfurlCacheService } from './unfurlCache.service';
export { UnfurlCacheData };
// import { ExtractorUtilities } from "../utils";

// const fetch = require("node-fetch");

export interface UnfurlData {
  title: string;
  urlImage: string;
  description: string;
}

// const getInformationOneContent = (content: string, tagContent: string): string => {
//   const info = ExtractorUtilities.cut(content, `${tagContent}" content="`, `"`);
//   return info ? info : ExtractorUtilities.cut(content, `${tagContent}' content='`, `'`);
// }

// const getInformation = (content: string, tagContent: string[]): string => {
//   let info: string = '';
//   for (let i = 0; i < tagContent.length; i++) {
//     info = getInformationOneContent(content, tagContent[i]);
//     if (info !== '') {
//       return info;
//     }
//   }
//   return info;
// }

const getInformation = (result: Metadata, unfurlType: 'title' | 'urlImage' | 'description'): string => {
  if (unfurlType === 'title') {
    return result.title ? result.title : (
      result.open_graph?.title ? result.open_graph?.title : (
        result.oEmbed?.title ? result.oEmbed?.title : (
          result.twitter_card?.title ? result.twitter_card?.title : ''
        )
      )
    ); 
  }
  if (unfurlType === 'description') {
    return result.description ? result.description : (
      result.open_graph?.description ? result.open_graph?.description : (
        result.twitter_card?.description ? result.twitter_card?.description : ''
      )
    ); 
  }
  if (unfurlType === 'urlImage') {
    return (result.open_graph && result.open_graph.images && result.open_graph.images.at(0) && result.open_graph.images.at(0)!.url) ? result.open_graph.images.at(0)!.url : (
        (result.twitter_card && result.twitter_card.images && result.twitter_card.images.at(0) && result.twitter_card.images.at(0)!.url) ? result.twitter_card.images.at(0)!.url : (
          (result.oEmbed && result.oEmbed.thumbnails && result.oEmbed.thumbnails.at(0) && result.oEmbed.thumbnails.at(0)!.url) ? result.oEmbed.thumbnails.at(0)!.url! : ''
        )
      )
    ; 
  }
  return '';
}

export const getUnfurl = (url: string): Promise<UnfurlData> => new Promise<UnfurlData>(resolve => {
  try {
    unfurl(url).then(result => {
      resolve({
        title: getInformation(result, 'title'),
        urlImage: getInformation(result, 'urlImage'),
        description: getInformation(result, 'description').substring(0, 400),
      });
    }).catch(reason => resolve({
      title: '',
      urlImage: '',
      description: '',
    }));
  } catch (e) {
    resolve({
      title: '',
      urlImage: '',
      description: '',
    });
  }
  // fetch(url).then((res: any) => res.text()).then((text: string) => {
  //   resolve({
  //     title: getInformation(text, ['og:title', 'twitter:title']),
  //     urlImage: getInformation(text, ['og:image', 'twitter:image']),
  //     description: getInformation(text, ['og:description', 'twitter:description']),
  //   });
  // });
});

export const isYoutubeUrl = (url: string) => url.toLowerCase().indexOf("youtube") > -1 || url.toLowerCase().indexOf("youtu.be") > -1;
const isUrlAFile = (url: string) => {
  const listOfExtensionFiles = [".pdf", ".xml", ".json", ".txt", ".doc", ".xlx", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mov", ".flv", ".mp4", ".mp3", ".tar.gz", ".zip", ".rar", ".7z"];
  const urlLower = url.toLowerCase();

  const typeExtensionIndex = listOfExtensionFiles.findIndex(extension => urlLower.indexOf(extension) > -1);
  return typeExtensionIndex > -1;
}

export const getUnfurlWithCache = async (urlList: string[], loadTime: number): Promise<UnfurlData[]> => {
  if (!urlList) return [{
    title: '',
    urlImage: '',
    description: '',
  }];
  if (urlList.length === 1) {
    const data = await getUnfurl(urlList[0]);
    // Include `url` and `date` so the frontend's RssMessage component can
    // display the thumbnail (it gates on `dataToShowInCard.url` being truthy).
    const result: UnfurlCacheData = { ...data, url: urlList[0], date: new Date() };
    return [result];
  }

  const urlListNotCached: string[] = [];
  const allData: UnfurlData[] = [];
  let dataCache: UnfurlData | undefined;
  let i = 0;
  let currentUrl;

  for (i = 0; i < urlList.length; i++) {
    currentUrl = urlList[i];
    dataCache = await UnfurlCacheService.getInstance().getDataFromUnfurlCache(currentUrl);
    if (!!dataCache) {
      allData.push(dataCache);
    } else {
      urlListNotCached.push(currentUrl);
    }
  }

  let data: UnfurlData;
  let dataToSend: UnfurlCacheData;
  
  for (i = 0; i < urlListNotCached.length; i++) {
    currentUrl = urlListNotCached[i];
    if (!isUrlAFile(currentUrl)) {
      console.log(`> Url to unfurl ${currentUrl}`);
      data = await getUnfurl(currentUrl);
    } else {
      data = {
        title: '',
        urlImage: '',
        description: '',
      };
    }
    console.log(`> Is youtube link? ${isYoutubeUrl(currentUrl)} (time = ${isYoutubeUrl(currentUrl) ? loadTime : 100})`);
    await awaitMilliseconds(isYoutubeUrl(currentUrl) ? loadTime : 100);
    dataToSend = {...data, date: new Date(), url: currentUrl};
    UnfurlCacheService.getInstance().addDataToCache(dataToSend);
    allData.push(dataToSend);
    console.log("Unfurled!");
  }

  return allData;
};

export const getUnfurlYoutubeImage = async (youtubeUrl: string, indexItem: number): Promise<string | undefined> => {
  const imageBuffer = await UnfurlCacheService.getInstance().getYoutubeImage(youtubeUrl, indexItem * 1000);
  console.log(`Get youtube image ${youtubeUrl} with time ${indexItem * 1000}`);
  if (!imageBuffer) {
    return undefined;
  }
  // Convertir Buffer a base64
  const base64Image = imageBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64Image}`;
};

export const forceToSaveUnfurlCache = async (): Promise<void> => {
  await UnfurlCacheService.getInstance().saveCache();
};
