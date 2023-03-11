export interface TelegramData {
    telegram_bot_token: string;
    bot_all_command: string;
    bot_masto_command: string;
    bot_nitter_command: string;
    bot_blog_command: string;
}

export const extractTelegramData = (data: any): TelegramData => ({
    telegram_bot_token: data.telegram_bot_token,
    bot_all_command: data.bot_all_command,
    bot_masto_command: data.bot_masto_command,
    bot_nitter_command: data.bot_nitter_command,
    bot_blog_command: data.bot_blog_command,
});
