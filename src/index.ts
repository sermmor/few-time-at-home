import { readFile, writeFileSync } from 'fs';
import { APIService, ChannelMediaRSSCollection, getAllMessageCommands, TelegramBotCommand } from './API';
import { BlogRSSMessageList } from './blogRSS';
import { MastodonRSSMessageList } from './mastodonRSS/mastodonRSSMessageList';
import { NitterRSSMessageList } from './nitterRSS';
import { TelegramBot } from './telegramBot/telegramBot';

const keysPath = 'build/keys.json';
const configurationPath = 'build/configuration.json';

let channelMediaCollection: ChannelMediaRSSCollection;
let apiService: APIService;

// TODO: Add configuration.json to README.md (update README.md with all the details).

// TODO: Nitter command for any Twitter profile (?)  
// TODO: Create API.
// TODO: Think about do a front end website with React to read this information and edit configuration and rss list (local RSS reader, with electron do desktop apps for Windows, iOS and Android)

readFile(keysPath, (err, data) => {
    if (err) throw err;
    const keyData = JSON.parse(<string> <any> data);
    readFile(configurationPath, (err, data) => {
        if (err) throw err;
        const configurationData = JSON.parse(<string> <any> data);

        channelMediaCollection = {
            nitterRSS: new NitterRSSMessageList(configurationData),
            mastodonRSS: new MastodonRSSMessageList(configurationData),
            blogRSS: new BlogRSSMessageList(configurationData),
        };

        const bot = new TelegramBot(keyData);
        const commands: TelegramBotCommand = getAllMessageCommands(channelMediaCollection);
        bot.start(commands);

        apiService = new APIService(channelMediaCollection, commands, +configurationData.apiPort);
        
        console.log("> The bot is ready.");
    });
});

const debugTweetsInFile = () => {
    // const strAllRss: string = JSON.stringify(nitterRSS.allMessages, null, 2); // TODO: COMMENT THIS, ONLY FOR DEBUG.
    // writeFileSync('allRss.json', strAllRss); // TODO: COMMENT THIS, ONLY FOR DEBUG.

    // console.log(`allTuits: ${numberOfResponses} vs messages: ${accTweets.length}`);
};
