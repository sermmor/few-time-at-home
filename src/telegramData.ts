export interface TelegramData {
    telegram_bot_token: string;
    bot_tuit_command: string;
}

export const extractTelegramData = (data: any): TelegramData => ({
    telegram_bot_token: data.telegram_bot_token,
    bot_tuit_command: data.bot_tuit_command,
});
