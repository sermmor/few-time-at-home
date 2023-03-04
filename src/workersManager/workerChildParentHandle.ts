export interface WorkerChildParentHandleData {
    id: string;
    workerScriptPath: string;
    workerDataObject: any;
    onError?: (e: any) => void;
    onExit?: (e: any) => void;
}

export class WorkerChildParentHandle {
    private idWorker: string;
    private childHandle: any;

    constructor(parentHandler: any, childData: WorkerChildParentHandleData) {
        this.idWorker = childData.id;
        this.childHandle = new parentHandler.Worker(
            childData.workerScriptPath,
            { workerData: childData.workerDataObject }
        );
        this.childHandle.on('error', (e: any) => {
            if (childData.onError) childData.onError(e);
            console.error(e);
            this.exit();
        });
        
        this.childHandle.on('exit', (exitCode: any) => {
            if (exitCode !== 0) console.error(`Worker stopped with exit code ${exitCode}`);
            if (childData.onExit) childData.onExit(exitCode);
        });
    }

    get id() { return this.idWorker; }

    sendMessageToChild = (jsonData: any) => this.childHandle.postMessage(jsonData);

    receiveMessageFromChildAsync = (): Promise<any> => new Promise<any>(resolve => this.childHandle.on('message', (message: any) => resolve(message)));

    exit = () => this.childHandle.terminate();
}