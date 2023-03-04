// Worker Child for children.
export class WorkerChild {
    private childHandler: any;

    constructor() {
        this.childHandler = require('node:worker_threads');
    }

    get threadId() { return this.childHandler.threadId; };
    get dataGettedFromParent() { return this.childHandler.workerData; };

    sendMessageToParent = (jsonData: any) => this.childHandler.parentPort.postMessage(jsonData);
    receiveMessageFromParentAsync = (): Promise<any> => new Promise<any>(resolve => this.childHandler.parentPort.on('message', (message: any) => resolve(message)));

    scatterReceive = (): Promise<any> => new Promise<any>(resolve => this.childHandler.parentPort.on('message', (message: any) => {
        if (message.operation === 'scatter') {
            resolve(message.data);
        } else {
            // Normal receive.
            resolve(message.data);
        }
    }));

    gatherSender = (jsonData: any) => this.childHandler.parentPort.postMessage({operation: 'gather', data: jsonData});

}