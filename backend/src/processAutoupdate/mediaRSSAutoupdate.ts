import { ConfigurationService, TelegramBotCommand } from "../API";
import { readJSONFile, saveInAFilePromise } from "../utils";
import { YoutubeRSSUtils } from "../youtubeRSS/youtubeRSSUtils";
import * as fs from "fs/promises";

const initialWebNumberOfMessagesWithLinks = 80;
const normalWebNumberOfMessagesWithLinks = 40;
const autoUpdateTimeInSeconds = 60 * 60; // 1 hour

const mediaFiles = {
  youtube: (tag: string) => `data/config/media/youtubeMedia${tag}.json`,
  nitter: () => "data/config/media/nitterMedia.json",
  mastodon: () => "data/config/media/mastodonMedia.json",
  blog: () => "data/config/media/blogMedia.json",
};

const optionsTagsYoutube = ['null', 'sesionesMusica', 'politica', 'divulgacion', 'ingles', 'podcasts', 'abandonados'];

export class MediaRSSAutoupdate {
  constructor(private commands: TelegramBotCommand) {
    // TODO: FUNCIONES de devolver contenido de un fichero RSS (NOTESÉ DE QUE HAY QUE USAR UNA CLASE INTERMEDIA PARA ESO, 
    //       PORQUE SI NO, DEPENDENCIA CÍRCULAR).
    // TODO: DISMINUIR EL NÚMERO DE WORKERS A 2, como ya no habrá esperas para el usuario, priorizamos robustez.
    // TODO: Devolver el contenido de un fichero RSS a una llamada desde el bot de Telegram.
    // TODO: Salvar los UPDATES de RSS PREFERIDOS en un fichero aparte que se devolverá en una llamada aparte de la API.
    // TODO: LO DEL WEBSOCKET (QUE SE MUESTRE QUE ESTÁ ACTUAIZANDO EL RSS).
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
    const nitterMediaFile = mediaFiles.nitter();
    const mastodonMediaFile = mediaFiles.mastodon();
    const blogMediaFile = mediaFiles.blog();

    let webNumberOfMessagesWithLinks = initialWebNumberOfMessagesWithLinks;
    try {
      await fs.access(nitterMediaFile);
      webNumberOfMessagesWithLinks = normalWebNumberOfMessagesWithLinks;
    } catch {
      webNumberOfMessagesWithLinks = initialWebNumberOfMessagesWithLinks;
    }

    // Update Nitter RSS
    let messages: string[];
    let waitMe: boolean;
    try {
      messages = await this.updateMedia(this.commands.onCommandNitter, initialWebNumberOfMessagesWithLinks)
      waitMe = await this.saveMedia(messages, nitterMediaFile);
    } catch (error) {
        console.error("Error updating Nitter RSS:", error);
    }
    
    messages = await this.updateMedia(this.commands.onCommandMasto, initialWebNumberOfMessagesWithLinks);
    waitMe = await this.saveMedia(messages, mastodonMediaFile);

    messages = await this.updateMedia(this.commands.onCommandBlog, initialWebNumberOfMessagesWithLinks);
    waitMe = await this.saveMedia(messages, blogMediaFile);

    for (const tag of optionsTagsYoutube) {
      const youtubeMediaFile = mediaFiles.youtube(tag);
      messages = await this.updateMedia(this.commands.onCommandYoutube, initialWebNumberOfMessagesWithLinks, tag, true);
      waitMe = await this.saveMedia(messages, youtubeMediaFile);
    }
  };

  saveMedia = async (result: string[], fileName: string): Promise<boolean> => {
    let data = await readJSONFile(fileName, "[]");
    data = data === "[]" ? [] : data;
    data = data.concat(result);
    await saveInAFilePromise(JSON.stringify(data, null, 2), fileName);
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