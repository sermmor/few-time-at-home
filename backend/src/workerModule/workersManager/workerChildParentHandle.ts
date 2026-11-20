export interface WorkerChildParentHandleData {
    id: string;
    workerScriptPath: string;
    workerDataObject: any;
    onError?: (e: any) => void;
    onExit?: (e: any) => void;
}

export class WorkerChildParentHandle {
    /** Workers vivos ahora mismo (lo lee el monitor de memoria). */
    static liveWorkers = 0;

    private idWorker: string;
    private childHandle: any;

    constructor(parentHandler: any, childData: WorkerChildParentHandleData, onExit: () => void) {
        this.idWorker = childData.id;
        this.childHandle = new parentHandler.Worker(
            childData.workerScriptPath,
            { workerData: childData.workerDataObject }
        );
        WorkerChildParentHandle.liveWorkers++;
        this.childHandle.on('error', (e: any) => {
            if (childData.onError) childData.onError(e);
            console.error(e);
            this.exit();
        });
        
        this.childHandle.on('exit', (exitCode: any) => {
            WorkerChildParentHandle.liveWorkers--;
            if (exitCode !== 0) console.error(`Worker stopped with exit code ${exitCode}`);
            if (childData.onExit) childData.onExit(exitCode);
            onExit();
        });
    }

    get id() { return this.idWorker; }

    sendMessageToChild = (jsonData: any) => this.childHandle.postMessage(jsonData);

    receiveMessageFromChildAsync = (): Promise<any> => new Promise<any>(resolve => this.childHandle.on('message', (message: any) => resolve(message)));

    exit = () => this.childHandle.terminate();
}