import { readJSONFile } from "../utils";

const mediaFilePath = 'data/config/media/mediaFilesContent.json';
const favoriteYoutubeFilePath = 'data/config/media/youtubeFavoritesArchive.json';

export type MediaType = 'youtube' | 'mastodon' | 'blog';

export const getMastoFileContent = async (): Promise<string[]> => getMediaFileContent('mastodon');
export const getYoutubeFileContent = (tag: string = '') => (): Promise<string[]> => getMediaFileContent('youtube', tag);
export const getBlogFileContent = async (): Promise<string[]> => getMediaFileContent('blog');

export const getMediaFileContent = async (type: MediaType, tag: string = ''): Promise<string[]> => {
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
    return [];
  }
  return [];
};

export const getFavoritesYoutubeFileContent = async (amount: number): Promise<string[]> => {
  try {
    const dataOrVoid: string[] | string = await readJSONFile(favoriteYoutubeFilePath, "[]");
    let messages = dataOrVoid === "[]" ? [] : (dataOrVoid as string[]);
    messages = messages.reverse();
    if (messages.length > amount) {
      messages = messages.slice(0, amount);
    }
    return messages;
  } catch (error) {
    return [];
  }
};
