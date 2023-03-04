import { readFile, writeFileSync } from 'fs';
import { NitterRSSMessageList } from './nitterRSS/nitterRSSMessage';
import { TelegramBot } from './telegramBot/telegramBot';
import { checkUntilConditionIsTrue } from './utils';
import { WorkerChildParentHandle } from './workersManager/workerChildParentHandle';
import { WorkerManager } from './workersManager';

const networksPath = 'build/networks.json'; // TODO: DIVIDE IN TWO FILES: 'data.json' (Nitter instances and Twitter users list) and 'keys.json'.

const rssOptions = { // TODO: This has to be in NitterRSSMessage
    normalization: false,
    descriptionMaxLen: 10000,
}

let nitterRSS: NitterRSSMessageList;

// TODO: Think about do a website with React to read this information (local RSS reader, with electron do desktop apps for Windows, iOS and Android)

const idWorker1 = 'worker test 1';
const idWorker2 = 'worker test 2';
let isTerminated1 = false;
let isTerminated2 = false;

const workerManager = new WorkerManager([
    {
        id: idWorker1,
        workerScriptPath: './build/worker-test.js',
        workerDataObject: { 'hola': 123, 'lista': [1, {'cosas': 'varias'} ] },
        onError: e => console.log('Error en hijo 1'),
        onExit: e => {
            console.log('Worker 1 finished well');
            isTerminated1 = true;
        }
    },
    {
        id: idWorker2,
        workerScriptPath: './build/worker-test.js',
        workerDataObject: { 'hola': 123, 'lista': [2, {'cosas11': 'varias11'} ] },
        onError: e => console.log('Error en hijo 2'),
        onExit: e => {
            console.log('Worker 2 finished well');
            isTerminated2 = true;
        }
    }
]);

workerManager.receiveMessageFromChildAsync(idWorker1).then((e: any) => {
    console.log('Hola soy el padre, aquí los datos de mi hijo 1: ', e);
    workerManager.exitChild(idWorker1);
});

workerManager.receiveMessageFromChildAsync(idWorker2).then((e: any) => {
    console.log('Hola soy el padre, aquí los datos de mi hijo 2: ', e);
    workerManager.exitChild(idWorker2);
});

workerManager.sendMessageToChild(idWorker2, {'datos': [1234, {'hola': 'mensaje del padre al hijo'}]});

checkUntilConditionIsTrue(() => isTerminated1 && isTerminated2, () => console.log('Programa terminado'), 100);

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
