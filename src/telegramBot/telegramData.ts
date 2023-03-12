export interface TelegramData {
    telegram_bot_token: string;
    bot_all_command: string;
    bot_masto_command: string;
    bot_nitter_command: string;
    bot_blog_command: string;
}

export const extractTelegramData = (data: any, configurationData: any): TelegramData => ({
    telegram_bot_token: data.telegram_bot_token,
    bot_all_command: configurationData.listBotCommands.bot_all_command,
    bot_masto_command: configurationData.listBotCommands.bot_masto_command,
    bot_nitter_command: configurationData.listBotCommands.bot_nitter_command,
    bot_blog_command: configurationData.listBotCommands.bot_blog_command,
});
