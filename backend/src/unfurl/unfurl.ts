import { ExtractorUtilities } from "../utils";

const fetch = require("node-fetch");

export interface UnfurlData {
  title: string;
  urlImage: string;
  description: string;
}

const getInformationOneContent = (content: string, tagContent: string): string => {
  const info = ExtractorUtilities.cut(content, `${tagContent}" content="`, `"`);
  return info ? info : ExtractorUtilities.cut(content, `${tagContent}' content='`, `'`);
}

const getInformation = (content: string, tagContent: string[]): string => {
  let info: string = '';
  for (let i = 0; i < tagContent.length; i++) {
    info = getInformationOneContent(content, tagContent[i]);
    if (info !== '') {
      return info;
    }
  }
  return info;
}

export const unfurl = (url: string): Promise<UnfurlData> => new Promise<UnfurlData>(resolve => {
  fetch(url).then((res: any) => res.text()).then((text: string) => {
    resolve({
      title: getInformation(text, ['og:title', 'twitter:title']),
      urlImage: getInformation(text, ['og:image', 'twitter:image']),
      description: getInformation(text, ['og:description', 'twitter:description']),
    });
  });
})