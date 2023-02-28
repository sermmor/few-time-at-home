import { readFile, writeFileSync } from 'fs';
import { NitterRSSMessageList } from './nitterRSSMessage';
import { TelegramBot } from './telegramBot';

const networksPath = 'build/networks.json';

const rssOptions = {
    normalization: false,
    descriptionMaxLen: 10000,
}

let nitterRSS: NitterRSSMessageList;

// TODO: Think about do a website with React to read this information (local RSS reader, with electron do desktop apps for Windows, iOS and Android)

readFile(networksPath, (err, data) => {
    if (err) throw err;
    const userData = JSON.parse(<string> <any> data);

    nitterRSS = new NitterRSSMessageList(userData, rssOptions);

    const bot = new TelegramBot(userData);
    bot.start(getMessagesFromNitter);
    
    console.log("> The bot is ready.");
});

const getMessagesFromNitter = (): Promise<string[]> => new Promise<string[]>(
    resolve => nitterRSS.updateRSSList().then(() =>
        resolve(nitterRSS.formatMessagesToTelegramTemplate())
    ));

const debugTweetsInFile = () => {
    // const strAllRss: string = JSON.stringify(nitterRSS.allMessages, null, 2); // TODO: COMMENT THIS, ONLY FOR DEBUG.
    // writeFileSync('allRss.json', strAllRss); // TODO: COMMENT THIS, ONLY FOR DEBUG.

    // console.log(`allTuits: ${numberOfResponses} vs messages: ${accTweets.length}`);
};
