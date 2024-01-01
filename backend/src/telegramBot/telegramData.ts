export interface TelegramData {
    telegram_bot_token: string;
    username_client: string;
}

export const extractTelegramData = (data: any): TelegramData => ({
    telegram_bot_token: data.telegram_bot_token,
    username_client: data.username_client,
});
