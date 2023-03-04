import Telegraf from "telegraf";
import { TelegrafContext } from "telegraf/typings/context";
import { extractTelegramData, TelegramData } from "./telegramData";

// const pathFinishedVideo = 'build/finished.mp4';
// const pathStartedVideo = 'build/start.mp4';
const maxMessagesToSendToTelegram = 1000;

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

    start(actionToDoWhenCallCommand: () => Promise<string[]>) {
        this.bot.start(ctx => {
            // ctx.replyWithVideo({ source: pathStartedVideo });
            ctx.reply(`I'm here!! :D`);
        });
        this.buildBotCommand(this.bot, this.telegramBotData, actionToDoWhenCallCommand);
        this.bot.launch();    
    }

    private buildBotCommand = (
        bot: Telegraf<TelegrafContext>,
        telegramBotData: TelegramData,
        actionToDoWhenCallCommand: () => Promise<string[]>,
    ) => {
        // TL commands.
        (Array.from(Array(maxMessagesToSendToTelegram).keys())).forEach(telegramNumberOfTweetsWithLinks => {
            bot.command(
                `${telegramBotData.bot_tuit_command}${telegramNumberOfTweetsWithLinks}`,
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
}


