import { ConfigurationService, TelegramBotCommand } from "../API";
import { readJSONFile, saveInAFilePromise } from "../utils";
import { YoutubeRSSUtils } from "../youtubeRSS/youtubeRSSUtils";
import * as fs from "fs/promises";

type FileMediaContentType = {messagesMasto: string[], messagesBlog: string[], messagesYoutube: {tag: string; content: string[]}[]};

const initialWebNumberOfMessagesWithLinks = 80;
const normalWebNumberOfMessagesWithLinks = 40;
const autoUpdateTimeInSeconds = 60 * 60; // 1 hour
const numMaxMessagesToSave = 1000;

const mediaFilePath = 'data/config/media/mediaFilesContent.json';
// TODO: GUARDAR ESTE LISTADO DE TAGS EN UN FICHERO JSON DE CONFIGURACIÓN.
const optionsTagsYoutube = ['null', 'sesionesMusica', 'politica', 'divulgacion', 'ingles', 'podcasts', 'abandonados'];

export class MediaRSSAutoupdate {
  constructor(private commands: TelegramBotCommand) {
    // TODO: DISMINUIR EL NÚMERO DE WORKERS A 2, como ya no habrá esperas para el usuario, priorizamos robustez.
    // TODO: Devolver el contenido de un fichero RSS a una llamada desde el bot de Telegram.
    // TODO: Salvar los UPDATES de RSS PREFERIDOS en un fichero aparte que se devolverá en una llamada aparte de la API.
    // TODO: LO DEL WEBSOCKET (QUE SE MUESTRE QUE ESTÁ ACTUALIZANDO EL RSS, O CUÁNTO TIEMPO QUEDA PARA QUE SE ACTUALICE).
    // TODO: BOTÓN DESDE EL FRONT QUE FUERCE A ACTUALIZAR EL FICHERO RSS.
    setTimeout(() => {
      console.log("Starting Media RSS Autoupdate...");
      this.doAllUpdates().then(() => {
        console.log("Media RSS Autoupdate completed successfully.");
      }).catch(err => {
        console.error("Error during Media RSS Autoupdate:", err);
      });
    }, 0); // 1 minute delay before starting the first update
    setInterval(() => {
      this.doAllUpdates().then(() => {
        console.log("Media RSS Autoupdate completed successfully.");
      }).catch(err => {
        console.error("Error during Media RSS Autoupdate:", err);
      });
    }, autoUpdateTimeInSeconds * 1000);
  }

  doAllUpdates = async() => {
    let webNumberOfMessagesWithLinks = initialWebNumberOfMessagesWithLinks;
    try {
      await fs.access(mediaFilePath);
      webNumberOfMessagesWithLinks = normalWebNumberOfMessagesWithLinks;
    } catch {
      webNumberOfMessagesWithLinks = initialWebNumberOfMessagesWithLinks;
    }

    let messages: string[];
    
    const messagesMasto = await this.updateMedia(this.commands.onCommandMasto, initialWebNumberOfMessagesWithLinks);

    const messagesBlog = await this.updateMedia(this.commands.onCommandBlog, initialWebNumberOfMessagesWithLinks);

    const messagesYoutube: {tag: string; content: string[]}[] = [];
    for (const tag of optionsTagsYoutube) {
      messages = await this.updateMedia(this.commands.onCommandYoutube, initialWebNumberOfMessagesWithLinks, tag, true);
      messagesYoutube.push({
        tag,
        content: messages,
      });
    }

    const waitMe: boolean = await this.saveMedia(messagesMasto, messagesBlog, messagesYoutube);
  };

  saveMedia = async (messagesMasto: string[], messagesBlog: string[], messagesYoutube: {tag: string; content: string[]}[]): Promise<boolean> => {
    const fileVoid = "{messagesMasto: [], messagesBlog: [], messagesYoutube: []}";
    const dataOrVoid: FileMediaContentType | string = await readJSONFile(
      mediaFilePath,
      "{messagesMasto: [], messagesBlog: [], messagesYoutube: []}"
    );
    const data: FileMediaContentType = dataOrVoid === fileVoid ?
     {messagesMasto: [], messagesBlog: [], messagesYoutube: []} : dataOrVoid as FileMediaContentType;

    data.messagesMasto = data.messagesMasto.concat(messagesMasto);
    // Remove duplicates from messagesMasto
    data.messagesMasto = data.messagesMasto.filter((item: any, index: number) => data.messagesMasto.indexOf(item) === index);
    // Limit the number of messages to save
    if (data.messagesMasto.length > numMaxMessagesToSave) {
      data.messagesMasto = data.messagesMasto.slice(data.messagesMasto.length - numMaxMessagesToSave);
    }

    data.messagesBlog = data.messagesBlog.concat(messagesBlog);
    data.messagesBlog = data.messagesBlog.filter((item: any, index: number) => data.messagesBlog.indexOf(item) === index);
    if (data.messagesBlog.length > numMaxMessagesToSave) {
      data.messagesBlog = data.messagesBlog.slice(data.messagesBlog.length - numMaxMessagesToSave);
    }

    data.messagesYoutube = data.messagesYoutube || [];
    for (const youtube of messagesYoutube) {
      const tag = youtube.tag;
      let indexTag = data.messagesYoutube.findIndex((item: any) => item.tag === tag);
      if (indexTag === -1) {
        data.messagesYoutube.push({ 
          tag: tag,
          content: [],
        });
        indexTag = data.messagesYoutube.length - 1;
      }
      data.messagesYoutube[indexTag].content = data.messagesYoutube[indexTag].content.concat(youtube.content);
      data.messagesYoutube[indexTag].content = data.messagesYoutube[indexTag].content.filter(
        (item: any, index: number) => data.messagesYoutube[indexTag].content.indexOf(item) === index
      );
      if (data.messagesYoutube[indexTag].content.length > numMaxMessagesToSave) {
        data.messagesYoutube[indexTag].content = data.messagesYoutube[indexTag].content.slice(
          data.messagesYoutube[indexTag].content.length - numMaxMessagesToSave
        );
      }
    }
    await saveInAFilePromise(JSON.stringify(data, null, 2), mediaFilePath);
    return true;
  };

  updateMedia = (
    rssCommand: () => Promise<string[]>,
    webNumberOfMessagesWithLinks: number,
    youtubeTag = "null",
    isYoutubeRSS = false,
  ): Promise<string[]> => new Promise<string[]>(resolve => {
    ConfigurationService.Instance.twitterData.numberOfMessages = webNumberOfMessagesWithLinks;
    if (isYoutubeRSS) {
      YoutubeRSSUtils.setTag(youtubeTag);
    }

    rssCommand().then(messagesToSend => {
        if (isYoutubeRSS) {
          // Remove shorts videos.
          YoutubeRSSUtils.filterYoutubeShorts(webNumberOfMessagesWithLinks).then(messages => {
            resolve(messages);
          });
        } else {
          const messages = messagesToSend.slice(messagesToSend.length - webNumberOfMessagesWithLinks);
          resolve(messages);
        }
    });
  });
}