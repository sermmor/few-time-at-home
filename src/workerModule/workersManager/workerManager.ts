import { checkUntilConditionIsTrue } from "../../utils";
import { WorkerChildParentHandle, WorkerChildParentHandleData } from "./workerChildParentHandle";

// WorkerManager for parent.
export class WorkerManager {
    private parentHandler: any;
    private childrenHandlerList: WorkerChildParentHandle[] = [];

    public static divideArrayInNumberOfWorkers = (array: any[], numberOfWorkers: number): string[][] => {
        const urlProfilesByWorker = Math.floor(array.length / numberOfWorkers);
        const urlsProfilesToSend: string[][] = [];
        for (let i = 0; i < numberOfWorkers; i++) {
            urlsProfilesToSend.push(array.slice(i * urlProfilesByWorker, (i + 1) * urlProfilesByWorker));
        }

        // Divide the rest.
        const initIndex = urlProfilesByWorker * numberOfWorkers; // + 1;
        const urlProfilesRest = (array.length % numberOfWorkers);
        for (let i = 0; i < urlProfilesRest; i++) {
            urlsProfilesToSend[i].push(array[initIndex + i]);
        }

        return urlsProfilesToSend;
    }

    constructor(workerChildDataList: WorkerChildParentHandleData[]) {
        this.parentHandler = require('node:worker_threads');

        workerChildDataList.forEach((dataChild) => {
            this.childrenHandlerList.push(
                new WorkerChildParentHandle(this.parentHandler, dataChild, () => this.removeChildById(dataChild.id))
            );
        });
    }

    private removeChildById = (id: string) => {
        const childToExit = this.getChildParentHandlerById(id);
        if (childToExit) {
            const indexChild = this.childrenHandlerList.indexOf(childToExit);
            this.childrenHandlerList.splice(indexChild, 1);
        }
    };

    createNewChild = (dataChild: WorkerChildParentHandleData) => {
        this.childrenHandlerList.push(
            new WorkerChildParentHandle(this.parentHandler, dataChild, () => this.removeChildById(dataChild.id))
        );
    };

    getChildParentHandlerById = (id: string): WorkerChildParentHandle | undefined => this.childrenHandlerList.find(child => child.id === id);

    sendMessageToChild = (id: string, jsonData: any) => {
        const childToSendMessage = this.getChildParentHandlerById(id);
        if (childToSendMessage) {
            childToSendMessage.sendMessageToChild(jsonData);
        } else {
            console.error(`Child with id ${id} doesn't exist.`);
        }
    };
    
    receiveMessageFromChildAsync = (id: string): Promise<any> => {
        const childToReceiveMessage = this.getChildParentHandlerById(id);
        if (childToReceiveMessage) {
            return childToReceiveMessage.receiveMessageFromChildAsync();
        } else {
            return new Promise<any>(resolve => {
                console.error(`Child with id ${id} doesn't exist.`);
                resolve(id);
            });
        }
    };

    // If you don't understand scatter and gatter, see this https://mpitutorial.com/tutorials/mpi-scatter-gather-and-allgather/

    scatterSender = (messageJsonDataList: any[]) => {
        if (messageJsonDataList.length === this.childrenHandlerList.length) {
            this.childrenHandlerList.forEach((handleChild, index) => {
                handleChild.sendMessageToChild({
                    operation: 'scatter',
                    data: messageJsonDataList[index],
                });
            });
        } else {
            console.error(`Message list has a diferent length (${messageJsonDataList.length}) to number of children length (${this.childrenHandlerList.length}).`);
        }
    };

    gatherReceive = (): Promise<any[]> => {
        const allMessages: any[] = [];
        let childWaiting = this.childrenHandlerList.length;
        return new Promise<any>(resolve => {
            this.childrenHandlerList.forEach((handleChild) => {
                handleChild.receiveMessageFromChildAsync().then(message => {
                    if (message.operation === 'gather') {
                        allMessages.push(message.data);
                    }
                    childWaiting--;
                });
            });
            checkUntilConditionIsTrue(() => childWaiting <= 0, () => resolve(allMessages), 0);
        });
    };

    exitChild = (id: string) => {
        const childToExit = this.getChildParentHandlerById(id);
        if (childToExit) {
            childToExit.exit();
        } else {
            console.error(`Child with id ${id} doesn't exist.`);
        }
    };

    exitAllChilds = () => {
        this.childrenHandlerList.forEach(handler => handler.exit());
    }
}