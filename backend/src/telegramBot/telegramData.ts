export interface TelegramData {
    telegram_bot_token: string;
}

export const extractTelegramData = (data: any): TelegramData => ({
    telegram_bot_token: data.telegram_bot_token,
});
