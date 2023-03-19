import Telegraf from "telegraf";
import { TelegrafContext } from "telegraf/typings/context";
import { ConfigurationService } from "../API";
import { TelegramBotCommand } from "../API/messagesRSS.service";
import { NotesService } from "../API/notes.service";
import { extractTelegramData, TelegramData } from "./telegramData";

// const pathFinishedVideo = 'build/finished.mp4';
// const pathStartedVideo = 'build/start.mp4';
const maxMessagesToSendToTelegram = 100;

export class TelegramBot {
    private telegramBotData: TelegramData;
    private bot: Telegraf<TelegrafContext>;

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
        });
        this.buildBotCommand(this.bot, ConfigurationService.Instance.listBotCommands.bot_all_command, commandList.onCommandAll);
        this.buildBotCommand(this.bot, ConfigurationService.Instance.listBotCommands.bot_nitter_command, commandList.onCommandNitter);
        this.buildBotCommand(this.bot, ConfigurationService.Instance.listBotCommands.bot_masto_command, commandList.onCommandMasto);
        this.buildBotCommand(this.bot, ConfigurationService.Instance.listBotCommands.bot_blog_command, commandList.onCommandBlog);
        this.bot.command(ConfigurationService.Instance.listBotCommands.bot_notes_command, this.sendAllNotesToTelegram);
        this.bot.launch();
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
                }
            );
        });
    };

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
      this.sendAllMessagesToTelegram(ctx, messagesToSend);
    }

    // TODO: Receive a note.
}


