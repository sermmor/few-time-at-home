import { unfurl } from 'unfurl.js';
import { Metadata } from 'unfurl.js/dist/types';
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
