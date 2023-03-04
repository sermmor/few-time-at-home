const worker = require('node:worker_threads');

console.log(`Hola soy el hijo ${worker.threadId}, aquí datos de mi padre: `, worker.workerData);
worker.parentPort.postMessage({'datos': [1, {'hola': 'mundo'}], 'hijo número': worker.threadId});
