import { readFile, writeFileSync } from 'fs';
import { ChannelMediaRSSMessageList } from './channelMediaRSS';
import { MastodonRSSMessageList } from './mastodonRSS/mastodonRSSMessageList';
import { NitterRSSMessageList } from './nitterRSS';
import { TelegramBot } from './telegramBot/telegramBot';

const keysPath = 'build/keys.json';
const configurationPath = 'build/configuration.json';

let nitterRSS: NitterRSSMessageList;
let mastodonRSS: MastodonRSSMessageList;

// TODO: Refactor mastodonRSSMessageList and nitterRSSMessageList to channelMediaRSSMessageList
// TODO: Add configuration.json to README.md (update README.md with all the details).
// TODO: Refactor nitterRSSWorker and mastodonRSSWorker.

// TODO: Add any RSS blog or news content!! (PUT IN THIS CASE THE normalization: true)
// TODO: Think about do a website with React to read this information (local RSS reader, with electron do desktop apps for Windows, iOS and Android)

readFile(keysPath, (err, data) => {
    if (err) throw err;
    const keyData = JSON.parse(<string> <any> data);
    readFile(configurationPath, (err, data) => {
        if (err) throw err;
        const configurationData = JSON.parse(<string> <any> data);

        nitterRSS = new NitterRSSMessageList(configurationData);
        mastodonRSS = new MastodonRSSMessageList(configurationData);

        const bot = new TelegramBot(keyData);
        bot.start(getMessagesFromNitter);
        
        console.log("> The bot is ready.");
    });
});

const getMessagesFromNitter = (): Promise<string[]> => new Promise<string[]>(
    resolve => nitterRSS.updateRSSList().then(() =>
        mastodonRSS.updateRSSList().then(() => {
            resolve(ChannelMediaRSSMessageList.formatListMessagesToTelegramTemplate([
                nitterRSS,
                mastodonRSS,
            ]));
        })));

const debugTweetsInFile = () => {
    // const strAllRss: string = JSON.stringify(nitterRSS.allMessages, null, 2); // TODO: COMMENT THIS, ONLY FOR DEBUG.
    // writeFileSync('allRss.json', strAllRss); // TODO: COMMENT THIS, ONLY FOR DEBUG.

    // console.log(`allTuits: ${numberOfResponses} vs messages: ${accTweets.length}`);
};
