import { WorkerChild } from "../workersManager/workerChild";

(function () {
    const worker = new WorkerChild();

    console.log(`Hola soy el hijo ${worker.threadId}, aquí datos iniciales de mi padre: `, worker.dataGettedFromParent);

    worker.sendMessageToParent({'datos': [1, {'hola': 'mundo'}], 'hijo número': worker.threadId});

    worker.receiveMessageFromParentAsync().then((e: any) => {
        console.log('> Te he dicho que soy el hijo 2: ', e);
    });
})();

