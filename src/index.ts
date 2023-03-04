import { readFile, writeFileSync } from 'fs';
import { NitterRSSMessageList } from './nitterRSS/nitterRSSMessage';
import { TelegramBot } from './telegramBot/telegramBot';
import { workerTest } from './workerModule/workerTests/worker-parent-test';

const networksPath = 'build/networks.json'; // TODO: DIVIDE IN TWO FILES: 'data.json' (Nitter instances and Twitter users list) and 'keys.json'.

const rssOptions = { // TODO: This has to be in NitterRSSMessage
    normalization: false,
    descriptionMaxLen: 10000,
}

let nitterRSS: NitterRSSMessageList;

// TODO: Think about do a website with React to read this information (local RSS reader, with electron do desktop apps for Windows, iOS and Android)
workerTest();

// -----------------------------------------------------------------------------------------------------------------

// readFile(networksPath, (err, data) => {
//     if (err) throw err;
//     const userData = JSON.parse(<string> <any> data);

//     nitterRSS = new NitterRSSMessageList(userData, rssOptions);

//     const bot = new TelegramBot(userData);
//     bot.start(getMessagesFromNitter);
    
//     console.log("> The bot is ready.");
// });

// const getMessagesFromNitter = (): Promise<string[]> => new Promise<string[]>(
//     resolve => nitterRSS.updateRSSList().then(() =>
//         resolve(nitterRSS.formatMessagesToTelegramTemplate())
//     ));

const debugTweetsInFile = () => {
    // const strAllRss: string = JSON.stringify(nitterRSS.allMessages, null, 2); // TODO: COMMENT THIS, ONLY FOR DEBUG.
    // writeFileSync('allRss.json', strAllRss); // TODO: COMMENT THIS, ONLY FOR DEBUG.

    // console.log(`allTuits: ${numberOfResponses} vs messages: ${accTweets.length}`);
};
