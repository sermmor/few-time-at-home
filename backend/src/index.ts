import { readFile, writeFileSync } from 'fs';
import { APIService, ChannelMediaRSSCollection, ConfigurationService, getAllMessageCommands, TelegramBotCommand } from './API';
import { BlogRSSMessageList } from './blogRSS';
import { MastodonRSSMessageList } from './mastodonRSS/mastodonRSSMessageList';
import { NitterRSSMessageList } from './nitterRSS';
import { TelegramBot } from './telegramBot/telegramBot';
import { YoutubeRSSMessageList } from './youtubeRSS';

const keysPath = 'build/keys.json';
const configurationPath = 'build/configuration.json';

let channelMediaCollection: ChannelMediaRSSCollection;
let apiService: APIService;

// TODO: Add configuration.json to README.md (update README.md with all the details).

// TODO: Poder crear un comando personalizado por API y asociarlo a un conjunto de RSS (pueden ser de Twitter, Mastodon o blogs), al lanzarlo dará los recursos RSS.
// TODO: ^ sería como un ChannelMediaRSSMessageList que sería una colección de listas personalizadas de ChannelMediaRSSMessageList. 

readFile(keysPath, (err, data) => {
    if (err) throw err;
    const keyData = JSON.parse(<string> <any> data);

    readFile(configurationPath, (err, data) => {
        if (err) throw err;
        const configurationService = new ConfigurationService(JSON.parse(<string> <any> data));

        channelMediaCollection = {
            nitterRSS: new NitterRSSMessageList(),
            mastodonRSS: new MastodonRSSMessageList(),
            blogRSS: new BlogRSSMessageList(),
            youtubeRSS: new YoutubeRSSMessageList()
        };

        const bot = new TelegramBot(keyData);
        const commands: TelegramBotCommand = getAllMessageCommands(channelMediaCollection);
        bot.start(commands);

        apiService = new APIService(channelMediaCollection, commands);
        
        console.log("> The bot is ready.");
    });
});

const debugTweetsInFile = () => {
    // const strAllRss: string = JSON.stringify(nitterRSS.allMessages, null, 2); // TODO: COMMENT THIS, ONLY FOR DEBUG.
    // writeFileSync('allRss.json', strAllRss); // TODO: COMMENT THIS, ONLY FOR DEBUG.

    // console.log(`allTuits: ${numberOfResponses} vs messages: ${accTweets.length}`);
};
