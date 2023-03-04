import { WorkerChild } from "../workersManager/workerChild";

(function () {
    const worker = new WorkerChild();

    console.log(`Hola soy el hijo ${worker.threadId}, aquí datos iniciales de mi padre: `, worker.dataGettedFromParent);

    // TEST SEND-CHILD/RECEIVE-PARENT NORMAL
    // worker.sendMessageToParent({'datos': [1, {'hola': 'mundo'}], 'hijo número': worker.threadId});

    // TEST GATHER: START
    if (worker.threadId == 1) {
        worker.gatherSender({'datoAAAs111': [1, {'hola': 'mundo'}], 'hijo número': 1});
    } else if (worker.threadId == 2) {
        worker.gatherSender({'datoOOOs222': [222, {'h0l4': 'mund0'}], 'hijo número': 2});
    }
    // TEST GATHER: END

    // TEST SCATTER: START
    worker.scatterReceive().then(message => {
        console.log(`> Soy el hijo ${worker.threadId}, el mensaje que me ha enviado mi padre es: `, message);
    });
    // TEST SCATTER: END

    // TEST SEND-PADRE/RECEIVE-CHILD NORMAL: START
    // worker.receiveMessageFromParentAsync().then((e: any) => {
    //     console.log('> Te he dicho que soy el hijo 2: ', e);
    // });
    // TEST SEND-PADRE/RECEIVE-CHILD NORMAL: END
})();

