export interface TelegramData {
    telegram_bot_token: string;
    username_client: string;
    token_pass: string;
    connect_to_telegram: boolean;
}

export const extractTelegramData = (data: any): TelegramData => ({
    telegram_bot_token: data.telegram_bot_token,
    username_client: data.username_client,
    token_pass: data.token_pass,
    connect_to_telegram: data.connect_to_telegram,
});
