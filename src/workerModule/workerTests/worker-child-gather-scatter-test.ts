import { WorkerChild } from "../workersManager/workerChild";

(function () {
    const worker = new WorkerChild();

    if (worker.threadId == 1) {
        worker.gatherSender({'datoAAAs111': [1, {'hola': 'mundo'}], 'hijo número': 1});
    } else if (worker.threadId == 2) {
        worker.gatherSender({'datoOOOs222': [222, {'h0l4': 'mund0'}], 'hijo número': 2});
    }

    worker.scatterReceive().then(message => {
        console.log(`> Soy el hijo ${worker.threadId}, el mensaje que me ha enviado mi padre es: `, message);
    });
})();

