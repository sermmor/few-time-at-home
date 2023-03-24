import Telegraf from "telegraf";
import { TelegrafContext } from "telegraf/typings/context";
import { ConfigurationService } from "../API";
import { Alert, AlertListService } from "../API/alertNotification.service";
import { BookmarkService } from "../API/bookmark.service";
import { TelegramBotCommand } from "../API/messagesRSS.service";
import { NotesService } from "../API/notes.service";
import { extractTelegramData, TelegramData } from "./telegramData";

// const pathFinishedVideo = 'build/finished.mp4';
// const pathStartedVideo = 'build/start.mp4';
const maxMessagesToSendToTelegram = 100;

export class TelegramBot {
    private telegramBotData: TelegramData;
    private bot: Telegraf<TelegrafContext>;
    private context: TelegrafContext | undefined;

    constructor(userData: any, telegramBotData?: TelegramData, bot?: Telegraf<TelegrafContext>) {
        if (!telegramBotData) {
            this.telegramBotData = extractTelegramData(userData);
        } else {
            this.telegramBotData = telegramBotData;
        }
        if (!bot) {
            this.bot = new Telegraf(this.telegramBotData.telegram_bot_token) // Also you can use process.env.BOT_TOKEN here.
        } else {
            this.bot = bot;
        }
    }

    start(commandList: TelegramBotCommand) {
        this.bot.start(ctx => {
            // ctx.replyWithVideo({ source: pathStartedVideo });
            ctx.reply(`I'm here!! :D`);
            this.context = ctx;
        });
        this.buildBotCommand(this.bot, ConfigurationService.Instance.listBotCommands.bot_all_command, commandList.onCommandAll);
        this.buildBotCommand(this.bot, ConfigurationService.Instance.listBotCommands.bot_nitter_command, commandList.onCommandNitter);
        this.buildBotCommand(this.bot, ConfigurationService.Instance.listBotCommands.bot_masto_command, commandList.onCommandMasto);
        this.buildBotCommand(this.bot, ConfigurationService.Instance.listBotCommands.bot_youtube_command, commandList.onCommandYoutube);
        this.buildBotCommand(this.bot, ConfigurationService.Instance.listBotCommands.bot_blog_command, commandList.onCommandBlog);
        this.bot.command(ConfigurationService.Instance.listBotCommands.bot_notes_command, this.sendAllNotesToTelegram);
        this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_add_notes_command, this.addNoteFromTelegram);
        this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_add_bookmark_command, this.addBookmarkFromTelegram);
        this.buildBotCommandAndHear(ConfigurationService.Instance.listBotCommands.bot_search_bookmark_command, this.sendSearchBookmarksToTelegram);
        this.launchAlertsToTelegram();
        this.bot.launch();
        // setTimeout(() => this.context ? this.context.reply('Remember to a thing') : console.log('NO CONTEXT NO PARTY'), 30000); // TODO: Alert service.
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
                    console.log("Doing");
                    actionToDoWhenCallCommand().then(messagesToSend => {
                        this.sendAllMessagesToTelegram(ctx, messagesToSend.slice(messagesToSend.length - telegramNumberOfTweetsWithLinks));
                    });
                    this.context = ctx;
                }
            );
        });
    };

    private buildBotCommandAndHear = (
      nameCommand: string,
      actionWithMessage: (ctx: TelegrafContext, message: string) => void
    ) => {
      this.bot.command(nameCommand, (ctx) => {
        if (ctx.message?.text) {
          const note = ctx.message.text.split(nameCommand)[1];
          // this.bot.hears('hiii', (ctx) => ctx.reply('Hiiiiii'));
          actionWithMessage(ctx, note);
          this.context = ctx;
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
      this.context = ctx;
      this.sendAllMessagesToTelegram(ctx, messagesToSend);
    }

    private addNoteFromTelegram = (ctx: TelegrafContext, note: string) => {
      NotesService.Instance.addNotes(note).then(() => {
        ctx.reply(`La nota se ha añadido correctamente.`);
      });
    }

    private sendSearchBookmarksToTelegram = (ctx: TelegrafContext, wordToSearch: string) => {
      console.log("> The bot is going to send the bookmark searched.");
      const bookmarksStrings = BookmarkService.Instance.searchInBookmark(wordToSearch).map(bm => `${bm.title}\n${bm.url}`);
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
      this.context = ctx;
      this.sendAllMessagesToTelegram(ctx, messagesToSend);
    }

    private addBookmarkFromTelegram = (ctx: TelegrafContext, urlBookmark: string) => {
      BookmarkService.Instance.addBookmark(urlBookmark).then(() => {
        ctx.reply(`El marcador se ha añadido correctamente.`);
      });
    }

    private launchAlertsToTelegram = () => {
      if (!this.context) {
        setTimeout(this.launchAlertsToTelegram, 15 * 60 * 1000);
      } else {
        // Check alerts and prepared.
        const alertList: Alert[] = AlertListService.Instance.alertsToLaunchInTelegram();
        if (alertList && alertList.length > 0) {
          const today = new Date();
          const minutesLeftByAlert = alertList.map(alert => (alert.timeToLaunch.getTime() - today.getTime())/(60 * 1000));
          minutesLeftByAlert.forEach((minutes, index) => {
            if (minutes > 0) {
              console.log(`The notification ${alertList[index].message} is going to launch in ${minutes} minutes.`);
              setTimeout(() => {
                  this.context!.reply(alertList[index].message);
                  AlertListService.Instance.clear();
                },
                minutes * 60 * 1000,
              );
            }
          });
        }
        setTimeout(this.launchAlertsToTelegram, 1 * 60 * 60 * 1000); // Check the next hour.
      }
    }
}


