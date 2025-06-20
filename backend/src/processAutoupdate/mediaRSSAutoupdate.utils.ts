import { readJSONFile } from "../utils";

const mediaFilePath = 'data/config/media/mediaFilesContent.json';

export type MediaType = 'youtube' | 'mastodon' | 'blog';

export const getMediaFileContent = async (type: MediaType, tag: string = ''): Promise<any> => {
  try {
    const fileVoid = "{messagesMasto: [], messagesBlog: [], messagesYoutube: []}";
    let data = await readJSONFile(mediaFilePath, fileVoid);
    data = data === fileVoid ? { messagesMasto: [], messagesBlog: [], messagesYoutube: [] } : data;
    if (type === 'youtube' && tag) {
      let indexTag = data.messagesYoutube.findIndex((item: any) => item.tag === tag);
      if (indexTag === -1) {
        return [];
      }
      return data.messagesYoutube[indexTag].content || [];
    }
    if (type === 'mastodon') {
      return data.messagesMasto || [];
    }
    if (type === 'blog') {
      return data.messagesBlog || [];
    }
  } catch (error) {
    console.error(`Error reading media file ${mediaFilePath}:`, error);
    return null;
  }
};
