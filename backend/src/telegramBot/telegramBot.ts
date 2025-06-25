import Telegraf from "telegraf";
import { TelegrafContext } from "telegraf/typings/context";
import { ConfigurationService } from "../API";
import { Alert, AlertListService } from "../API/alertNotification.service";
import { BookmarkService } from "../API/bookmark.service";
import { TelegramBotCommand } from "../API/messagesRSS.service";
import { NotesService } from "../API/notes.service";
import { extractTelegramData, TelegramData } from "./telegramData";
import { CloudService, cloudDefaultPath } from "../API/cloud.service";
import { createWriteStream, existsSync, mkdir } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { MediaRSSAutoupdate } from "../processAutoupdate/mediaRSSAutoupdate";
import { ReadLaterMessagesRSS } from "../API/readLaterMessagesRSS.service";
import { getUnfurl } from "../unfurl/unfurl";

const fetch = require("node-fetch");

// const pathFinishedVideo = 'build/finished.mp4';
// const pathStartedVideo = 'build/start.mp4';
const maxMessagesToSendToTelegram = 100;

export class TelegramBot {
  private static _instance: TelegramBot;
  private static alertEnabled: boolean;

  private telegramBotData: TelegramData;
  private bot: Telegraf<TelegrafContext> | undefined;
  private userClient: string | undefined;
  private tokenPassGetUser: string = '';
  private context: TelegrafContext | undefined;
  private lastSearchInCloudPathList: string[] = [];
  private currentCloudDir: string = '/';

  constructor(userData: any, telegramBotData?: TelegramData, bot?: Telegraf<TelegrafContext>) {
    TelegramBot._instance = this;
    TelegramBot.alertEnabled = false;
    if (!telegramBotData) {
        this.telegramBotData = extractTelegramData(userData);
    } else {
        this.telegramBotData = telegramBotData;
    }
    if (this.telegramBotData.connect_to_telegram) {
      this.userClient = this.telegramBotData.username_client;
      if (!bot) {
          this.bot = new Telegraf(this.telegramBotData.telegram_bot_token) // Also you can use process.env.BOT_TOKEN here.
      } else {
          this.bot = bot;
      }
    }
  }

  public static Instance = (): TelegramBot => TelegramBot._instance;
  public static IsBotReady = (): boolean => TelegramBot.alertEnabled;

  private setContext(ctx: TelegrafContext) {
    if (!this.context) {
      this.context = ctx;
      this.launchAlertsToTelegram();
    }
  }

  private isUserClient = (ctx: TelegrafContext): boolean => {
    const condition = ctx.from?.username === this.userClient && this.telegramBotData.token_pass === this.tokenPassGetUser;
    if (condition) this.setContext(ctx);
    return condition;
  }

  start(commandList: TelegramBotCommand) {
    if (!this.telegramBotData.connect_to_telegram) return;
      this.bot!.start(ctx => {
          // ctx.replyWithVideo({ source: pathStartedVideo });
          if (!this.isUserClient(ctx)) return;
          const commandTextInfo = Object.values(ConfigurationService.Instance.listBotCommands).reduce((prev, current) => `${prev}\n> ${current}`);
          ctx.reply(`I'm here!! :D \nHere a list of commands:\n> ${commandTextInfo}`);
      });
      this.bot!.command(ConfigurationService.Instance.listBotCommands.bot_login, this.login);
      this.buildBotCommand(this.bot!, ConfigurationService.Instance.listBotCommands.bot_all_command, () => MediaRSSAutoupdate.getFavoritesYoutubeFileContent(20));
      this.buildBotCommand(this.bot!, ConfigurationService.Instance.listBotCommands.bot_get_save_list_command, this.getSaveListFromTelegram);
      this.buildBotCommand(this.bot!, ConfigurationService.Instance.listBotCommands.bot_nitter_command, commandList.onCommandNitter);
      this.buildBotCommand(this.bot!, ConfigurationService.Instance.listBotCommands.bot_masto_command, MediaRSSAutoupdate.getMastoFileContent);
      this.buildBotCommand(this.bot!, ConfigurationService.Instance.listBotCommands.bot_youtube_command, MediaRSSAutoupdate.getYoutubeFileContent('null'));
      this.buildBotCommand(this.bot!, ConfigurationService.Instance.listBotCommands.bot_blog_command, MediaRSSAutoupdate.getBlogFileContent);
      this.bot!.command(ConfigurationService.Instance.listBotCommands.bot_notes_command, this.sendAllNotesToTelegram);
      this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_add_notes_command, this.addNoteFromTelegram);
      this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_add_bookmark_command, this.addBookmarkFromTelegram);
      this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_search_bookmark_command, this.sendSearchBookmarksToTelegram);
      this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_to_save_list_command, this.addToSaveListFromTelegram);
      this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_search_file, this.searchFilesInCloud);
      this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_give_file_from_search, this.giveMeFileIndexInCloud);
      this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_cloud_cd_path, this.cdDirInCloud);
      this.bot!.command(ConfigurationService.Instance.listBotCommands.bot_cloud_ls_path, this.lsDirInCloud);
      this.bot!.command(ConfigurationService.Instance.listBotCommands.bot_cloud_return_path, this.returnToParentInCloud);
      this.bot!.command(ConfigurationService.Instance.listBotCommands.bot_cloud_get_current_path, this.getCurrentPathInCloud);
      this.bot!.command(ConfigurationService.Instance.listBotCommands.bot_cloud_download_folder, this.giveFolderContentInCloud);
      this.bot!.on('photo', this.uploadFileToCloud);
      this.bot!.on('audio', this.uploadFileToCloud);
      this.bot!.on('document', this.uploadFileToCloud);
      this.bot!.on('video', this.uploadFileToCloud);
      this.bot!.on('voice', this.uploadFileToCloud);
      this.bot!.on('animation', this.uploadFileToCloud);
      this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_add_alert, this.addAlertFromTelegram);
      this.launchAlertsToTelegram();
      this.bot!.launch();
      
      // setTimeout(() => this.context ? this.context.reply('Remember to a thing') : console.log('NO CONTEXT NO PARTY'), 30000); // TODO: Alert service.
  }

  sendNotepadTextToTelegram = (text: string): boolean => {
    if (!this.context) return false;

    this.context.reply(`${text}`);
    
    return true;
  }
  private buildBotCommand = (

      bot: Telegraf<TelegrafContext>,
      nameCommand: string,
      actionToDoWhenCallCommand: () => Promise<string[]>,
  ) => {
      // TL commands.
      (Array.from(Array(maxMessagesToSendToTelegram).keys())).forEach(telegramNumberOfTweetsWithLinks => {
          bot.command(
              `${nameCommand}${telegramNumberOfTweetsWithLinks}`,
              (ctx: TelegrafContext) => {
                  if (!this.isUserClient(ctx)) return;
                  console.log("Doing");
                  actionToDoWhenCallCommand().then(messagesToSend => {
                      this.sendAllMessagesToTelegram(ctx, messagesToSend.slice(messagesToSend.length - telegramNumberOfTweetsWithLinks));
                  });
              }
          );
      });
  };

  private buildBotCommandAndHear = (
    nameCommand: string,
    actionWithMessage: (ctx: TelegrafContext, message: string) => void
  ) => {
    this.bot!.command(nameCommand, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      if (ctx.message?.text) {
        const note = ctx.message.text.split(nameCommand)[1];
        // this.bot!.hears('hiii', (ctx) => ctx.reply('Hiiiiii'));
        actionWithMessage(ctx, note);
      }
    });
  }

  private sendAllMessagesToTelegram = (
      ctx: TelegrafContext,
      messagesToSend: string[],
  ) => {
      console.log("> The bot is going to launch a result.");
      // Send messages to Telegram (1 messages by second).
      const lastIndex = (messagesToSend && messagesToSend.length > 0) ? messagesToSend.length : 0;
      messagesToSend.forEach((message:string, index: number) => {
          setTimeout(() => ctx.reply(message), index * 1000);
      });
      setTimeout(() => {
          ctx.reply(`FINISHED!!!`);
          // ctx.replyWithVideo({ source: pathFinishedVideo });
      }, lastIndex * 1000);
  }

  private sendAllNotesToTelegram = (ctx: TelegrafContext) => {
    if (!this.isUserClient(ctx)) return;
    console.log("> The bot is going to send the notes.");
    const notesPerMessage = 10;
    const numberOfMessages = Math.ceil(NotesService.Instance.notes.length / notesPerMessage);
    const messagesToSend = [];
    let message = '';
    
    for (let i = 0; i < numberOfMessages; i++) {
      message = '';
      for (let j = notesPerMessage * i; j < notesPerMessage * (i + 1) && j < NotesService.Instance.notes.length; j++) {
        message = message === '' ? `- ${NotesService.Instance.notes[j]}` : `${message}\n- ${NotesService.Instance.notes[j]}`;
      }
      messagesToSend.push(message);
    }
    this.sendAllMessagesToTelegram(ctx, messagesToSend);
  }

  private login = (ctx: TelegrafContext) => {
    if (ctx.message?.text) {
      const passWithSpaces = ctx.message.text.split(ConfigurationService.Instance.listBotCommands.bot_login)[1];
      this.tokenPassGetUser = passWithSpaces.substring(1);
      if (this.isUserClient(ctx)) {
        ctx.reply(`Usuario logueado correctamente. :D`);
      };
    }
  }

  private addNoteFromTelegram = (ctx: TelegrafContext, note: string) => {
    if (!this.isUserClient(ctx)) return;
    NotesService.Instance.addNotes(note).then(() => {
      ctx.reply(`La nota se ha añadido correctamente.`);
    });
  }

  private sendSearchBookmarksToTelegram = async(ctx: TelegrafContext, wordToSearch: string) => {
    if (!this.isUserClient(ctx)) return;
    console.log("> The bot is going to send the bookmark searched.");
    const searchResult = await BookmarkService.Instance.searchInBookmark(wordToSearch);
    const bookmarksStrings = searchResult.map(bm => `${bm.title}\n${bm.url}`);
    const bookmarksPerMessage = 10;
    const numberOfMessages = Math.ceil(bookmarksStrings.length / bookmarksPerMessage);
    const messagesToSend = [];
    let message = '';
    
    for (let i = 0; i < numberOfMessages; i++) {
      message = '';
      for (let j = bookmarksPerMessage * i; j < bookmarksPerMessage * (i + 1) && j < bookmarksStrings.length; j++) {
        message = message === '' ? `- ${bookmarksStrings[j]}` : `${message}\n- ${bookmarksStrings[j]}`;
      }
      messagesToSend.push(message);
    }
    this.sendAllMessagesToTelegram(ctx, messagesToSend);
  }

  private addBookmarkFromTelegram = (ctx: TelegrafContext, urlBookmark: string) => {
    if (!this.isUserClient(ctx)) return;
    BookmarkService.Instance.addBookmark(urlBookmark).then(() => {
      ctx.reply(`El marcador se ha añadido correctamente.`);
    });
  }

  private addToSaveListFromTelegram = (ctx: TelegrafContext, urlToSaveList: string) => {
    if (!this.isUserClient(ctx)) return;
    getUnfurl(urlToSaveList).then(({title}) =>{
      const message = `${title}
Automatico - ${(new Date(Date.now())).toLocaleString()}

${urlToSaveList}`;
      ReadLaterMessagesRSS.addMessageRSSToSavedList(message).then(() => {
        ctx.reply(`El marcador se ha añadido correctamente.`);
      });
    });
  };

  private getSaveListFromTelegram = async (): Promise<string[]> => {
    const messages = await ReadLaterMessagesRSS.getMessagesRSSSaved(20);
    return messages.map(value => value.message);
  };

  cdDirInCloud = (ctx: TelegrafContext, message: string) => {
    if (!this.isUserClient(ctx)) return;
    const candidate = (this.currentCloudDir === '/') ? `${message.substring(1)}` : `${this.currentCloudDir}/${message.substring(1)}`;
    CloudService.Instance.lsDirOperation(cloudDefaultPath, candidate).then(listItems => {
      if (listItems.length > 0) {
        // Exists, then we can change of dir.
        this.currentCloudDir = candidate;
        ctx.reply(`Cambio al path '${this.currentCloudDir}'.`);
      } else {
        ctx.reply(`Error al cambiar al path '${candidate}'.`);
      }
    }).catch(err => {
      ctx.reply(`Error al cambiar al path '${candidate}'.`);
    });
  }

  lsDirInCloud = (ctx: TelegrafContext) => {
    if (!this.isUserClient(ctx)) return;
    if (this.currentCloudDir === '/') {
      ctx.reply(`${cloudDefaultPath}`);
      return;
    }

    CloudService.Instance.lsDirOperation(cloudDefaultPath, this.currentCloudDir).then(pathList => {
      const bookmarksPerMessage = 10;
      const numberOfMessages = Math.ceil(pathList.length / bookmarksPerMessage);
      const messagesToSend = [];
      let indexItem = 0;
      let message = '';
      
      for (let i = 0; i < numberOfMessages; i++) {
        message = '';
        for (let j = bookmarksPerMessage * i; j < bookmarksPerMessage * (i + 1) && j < pathList.length; j++) {
          message = message === '' ? `${indexItem}. - ${pathList[j]}` : `${message}\n${indexItem}. - ${pathList[j]}`;
          indexItem++;
        }
        messagesToSend.push(message);
      }
      this.sendAllMessagesToTelegram(ctx, messagesToSend);
    });
  }

  returnToParentInCloud = (ctx: TelegrafContext) => {
    if (!this.isUserClient(ctx)) return;
    if (this.currentCloudDir === '/') {
      return;
    }
    const splittedPath = this.currentCloudDir.split('/');
    splittedPath.pop();
    this.currentCloudDir = splittedPath.join('/');
    if (this.currentCloudDir.length === 0) {
      this.currentCloudDir = '/';
    }
    ctx.reply(`Cambio al path '${this.currentCloudDir}'.`);
  }

  getCurrentPathInCloud = (ctx: TelegrafContext) => {
    if (!this.isUserClient(ctx)) return;
    ctx.reply(`El path actual es: '${this.currentCloudDir}'.`);
  }
  
  private getItemIdFromTelegram = (ctx: TelegrafContext) => (ctx.message?.photo && ctx.message?.photo[0].file_id) || ctx.message?.audio?.file_id || ctx.message?.document?.file_id || ctx.message?.video?.file_id || ctx.message?.voice?.file_id || ctx.message?.animation?.file_id;
  private getNameFromTelegram = (ctx: TelegrafContext) => ctx.message?.audio?.title || ctx.message?.document?.file_name || ctx.message?.animation?.file_name;

  private saveFileInCloud = (ctx: TelegrafContext, response: any, tempDirectory: string, nameFile: string, extensionFile: string) => {
    const tempPath = `${tempDirectory}/${nameFile}`;
    const definitivePath = `${this.currentCloudDir}/${nameFile}.${extensionFile}`;
    const body = Readable.Readable.from(response.body);
    const download_write_stream = createWriteStream(tempPath);
    finished(body.pipe(download_write_stream)).then(() => {
      CloudService.Instance.uploadFile(tempPath, definitivePath);
      console.log(`Downloaded from telegram file '${nameFile}' in '${definitivePath}`);
      ctx.reply(`Saved file '${definitivePath}'`);
    });
  }

  uploadFileToCloud = (ctx: TelegrafContext) => {
    if (!this.isUserClient(ctx)) return;

    if (this.currentCloudDir === '/' || this.currentCloudDir === '') {
      ctx.reply(`No se puede subir un fichero a la raíz. Cambia a un directorio hijo.`);
      return;
    }
    
    if (ctx.message?.photo || ctx.message?.audio || ctx.message?.document || ctx.message?.caption || ctx.message?.video || ctx.message?.voice || ctx.message?.animation) {
      const fileItemId = this.getItemIdFromTelegram(ctx);
      console.log(`fileItemId: ${fileItemId}`);
      if (fileItemId) {
        const tempDirectory = 'temp_telegram';
        this.bot!.telegram.getFile(fileItemId).then(file => {
          const nameFile = this.getNameFromTelegram(ctx) || fileItemId;
          const filePathSplitted = file.file_path?.split('.');
          const extensionFile = filePathSplitted ? filePathSplitted[filePathSplitted.length - 1] : '';
          console.log(`nameFile: ${nameFile}`);
          console.log(`extension file: ${extensionFile}`);
          this.bot!.telegram.getFileLink(fileItemId).then(linkFile => {
            console.log(`linkFile: ${linkFile}`);
            fetch(linkFile).then((response: any) => {
              if (!existsSync(tempDirectory)) {
                mkdir(tempDirectory, () => {
                  this.saveFileInCloud(ctx, response, tempDirectory, nameFile, extensionFile);
                });
              } else {
                this.saveFileInCloud(ctx, response, tempDirectory, nameFile, extensionFile);
              }
            });
          }) 
        }).catch(rejected => {
          console.log(rejected);
          ctx.reply(`No se puede subir el fichero a la cloud. Es demasiado grande para Telegram!!`);
        })
      }
    }
  }

  giveMeFileIndexInCloud = (ctx: TelegrafContext, index: string) => {
    if (!this.isUserClient(ctx)) return;
    const i = +index;
    if (i !== undefined && this.lastSearchInCloudPathList && this.lastSearchInCloudPathList.length > 0 && i < this.lastSearchInCloudPathList.length) {
      ctx.reply(`Enviando el fichero '${this.lastSearchInCloudPathList[i]}'. Paciencia.`);
      ctx.replyWithDocument({source: CloudService.Instance.giveMeRealPathFile(this.lastSearchInCloudPathList[i])}).catch(rejected => {
        console.log(rejected);
        ctx.reply(`No se puede descargar el fichero de la cloud. Es demasiado grande para Telegram!!`);
      });
    }
  }

  private giveFolderContentInCloudOneToOne = (ctx: TelegrafContext, listPathFilesToSend: string[], index: number = 0) => {
    if (index >= listPathFilesToSend.length) {
      ctx.reply(`Enviados todos los ficheros`);
    } else {
      ctx.reply(`Enviando el fichero '${listPathFilesToSend[index]}'. Paciencia.`);
      ctx.replyWithDocument({source: listPathFilesToSend[index]}).then(() => {
        this.giveFolderContentInCloudOneToOne(ctx, listPathFilesToSend, index + 1);
      }).catch(rejected => {
        console.log(rejected);
        ctx.reply(`No se puede descargar el fichero de la cloud. Es demasiado grande para Telegram!!`);
        this.giveFolderContentInCloudOneToOne(ctx, listPathFilesToSend, index + 1);
      });
    }
  }

  giveFolderContentInCloud = (ctx: TelegrafContext) => {
    if (!this.isUserClient(ctx)) return;
    const maxFiles = 30;
    CloudService.Instance.getListFolderFiles(cloudDefaultPath, this.currentCloudDir).then(listFilesComplete => {
      this.giveFolderContentInCloudOneToOne(ctx, listFilesComplete.slice(0, maxFiles), 0);
    });
  }

  searchFilesInCloud = (ctx: TelegrafContext, wordToSearch: string) => {
    if (!this.isUserClient(ctx)) return;
    CloudService.Instance.searchCloudItemInDirectory(cloudDefaultPath, this.currentCloudDir, wordToSearch).then(searchResult => {
      this.lastSearchInCloudPathList = searchResult.map(item => item.path);
      const bookmarksPerMessage = 10;
      const numberOfMessages = Math.ceil(this.lastSearchInCloudPathList.length / bookmarksPerMessage);
      const messagesToSend = [];
      let indexItem = 0;
      let message = '';
      
      for (let i = 0; i < numberOfMessages; i++) {
        message = '';
        for (let j = bookmarksPerMessage * i; j < bookmarksPerMessage * (i + 1) && j < this.lastSearchInCloudPathList.length; j++) {
          message = message === '' ? `${indexItem}. - ${this.lastSearchInCloudPathList[j]}` : `${message}\n${indexItem}. - ${this.lastSearchInCloudPathList[j]}`;
          indexItem++;
        }
        messagesToSend.push(message);
      }
      this.sendAllMessagesToTelegram(ctx, messagesToSend);
    });
  }

  public sendMessageToTelegram = (message: string) => {
    if (this.context) {
      this.context!.reply(message);
      // this.context!.reply(alertList[index].message);
      AlertListService.Instance.clear();
    }
  };

  private addAlertFromTelegram = (ctx: TelegrafContext, message: string) => {
    // FORMAT message: DD/MM/YYYY HH:MM MESSAGE
    if (!this.isUserClient(ctx)) return;
    
    const helpMessage = 'Formato de notificación incorrecta. Debe ser el siguiente: \'DD/MM/YYYY HH:MM MESSAGE\'.';
    const splitDateHourMessage = message.split(' ').slice(1);

    if (splitDateHourMessage.length > 2) {
      const splitDate = splitDateHourMessage[0].split('/');
      if (splitDate.length > 2) {
        const splitHour = splitDateHourMessage[1].split(':');
        if (splitHour.length > 1) {
          const messageToSend = splitDateHourMessage.slice(2).join(' ');
          const timeToLaunch = new Date(+splitDate[2], (+splitDate[1]) - 1, +splitDate[0], +splitHour[0], +splitHour[1]);
          AlertListService.Instance.addAlerts({ timeToLaunch, message: messageToSend }, this.sendMessageToTelegram).then(alertData => {
            this.launchAlertsToTelegram(false);
            ctx.reply(`La notificación se ha añadido correctamente.`);
          });
        } else {
          console.log(splitDateHourMessage, splitDate, splitHour)
          ctx.reply(helpMessage);
        }
      } else {
        console.log(splitDateHourMessage, splitDate)
        ctx.reply(helpMessage);
      }
    } else {
      console.log(splitDateHourMessage)
      ctx.reply(helpMessage);
    }
  }

  private launchAlertsToTelegram = (launchTimeout: boolean = true) => {
    if (this.context) {
      // Check alerts and prepared.
      AlertListService.Instance.launchAlerts(this.sendMessageToTelegram);
      TelegramBot.alertEnabled = true;
    }
  }
}


