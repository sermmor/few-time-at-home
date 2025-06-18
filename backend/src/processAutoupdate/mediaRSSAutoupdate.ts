import { ConfigurationService, TelegramBotCommand } from "../API";
import { YoutubeRSSUtils } from "../youtubeRSS/youtubeRSSUtils";

const autoUpdateTimeInSeconds = 60 * 60; // 1 hour

export class MediaRSSAutoupdate {
  constructor(private commands: TelegramBotCommand) {
    // TODO: call ALL commands with this.updateMedia 
    // TODO: webNumberOfMessagesWithLinks SI NO EXISTE FICHERO valdrá 80, SI EXISTE FICHERO VALDRÁ 40.
    // TODO: AUTOUPDATE MEDIA IN TIME autoUpdateTimeInSeconds
    // TODO: FUNCIONES de devolver contenido de un fichero RSS (NOTESÉ DE QUE HAY QUE USAR UNA CLASE INTERMEDIA PARA ESO, 
    //       PORQUE SI NO, DEPENDENCIA CÍRCULAR).
    // TODO: DISMINUIR EL NÚMERO DE WORKERS A 2, como ya no habrá esperas para el usuario, priorizamos robustez.
    // TODO: Devolver el contenido de un fichero RSS a una llamada desde el bot de Telegram.
    // TODO: Salvar los UPDATES de RSS PREFERIDOS en un fichero aparte que se devolverá en una llamada aparte de la API.
    // TODO: LO DEL WEBSOCKET (QUE SE MUESTRE QUE ESTÁ ACTUAIZANDO EL RSS).
  }

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