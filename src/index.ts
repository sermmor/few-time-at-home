import { readFile, writeFileSync } from 'fs';
import { NitterRSSMessageList } from './nitterRSSMessage';
import { TelegramBot } from './telegramBot';
import { checkUntilConditionIsTrue } from './utils';

const networksPath = 'build/networks.json';

const rssOptions = {
    normalization: false,
    descriptionMaxLen: 10000,
}

let nitterRSS: NitterRSSMessageList;

// TODO: Think about do a website with React to read this information (local RSS reader, with electron do desktop apps for Windows, iOS and Android)

const worker = require('node:worker_threads');

let isTerminated1 = false;
let isTerminated2 = false;

const work = new worker.Worker('./build/worker-test.js', { workerData: {
    'hola': 123,
    'lista': [1, {'cosas': 'varias'}]
}});

work.on('message', (e: any) => {
    console.log('Hola soy el padre, aquí los datos de mi hijo: ', e);
    work.terminate();
});

work.on('error', (e: any) => {
    console.log('Error en hijo');
    work.terminate();
});

work.on('exit', (code:any) => {
    if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
    else console.log('Worker finished well');
    isTerminated1 = true;
});

const work2 = new worker.Worker('./build/worker-test.js', { workerData: {
    'hola': 123,
    'lista': [1, {'cosas': 'varias'}]
}});

work2.on('message', (e: any) => {
    console.log('Hola soy el padre, aquí los datos de mi hijo 2: ', e);
    work.terminate();
});

work2.on('error', (e: any) => {
    console.log('Error en hijo');
    work.terminate();
});

work2.on('exit', (code:any) => {
    if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
    else console.log('Worker finished well');
    isTerminated2 = true;
});

checkUntilConditionIsTrue(() => isTerminated1 && isTerminated2, () => console.log('Programa terminado'), 100);

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
