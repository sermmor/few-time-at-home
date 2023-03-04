import { checkUntilConditionIsTrue } from "../../utils";
import { WorkerManager } from "../workersManager";

export const workerTest = () => {
    const idWorker1 = 'worker test 1';
    const idWorker2 = 'worker test 2';
    let isTerminated1 = false;
    let isTerminated2 = false;

    const workerManager = new WorkerManager([
        {
            id: idWorker1,
            workerScriptPath: './build/workerModule/workerTests/worker-child-test.js',
            workerDataObject: { 'hola': 123, 'lista': [1, {'cosas': 'varias'} ] },
            onError: e => console.log('Error en hijo 1'),
            onExit: e => {
                console.log('Worker 1 finished well');
                isTerminated1 = true;
            }
        },
        {
            id: idWorker2,
            workerScriptPath: './build/workerModule/workerTests/worker-child-test.js',
            workerDataObject: { 'hola': 123, 'lista': [2, {'cosas11': 'varias11'} ] },
            onError: e => console.log('Error en hijo 2'),
            onExit: e => {
                console.log('Worker 2 finished well');
                isTerminated2 = true;
            }
        }
    ]);

    // TEST ENVIAR-HIJO/RECIBIR-PADRE NORMAL: INICIO
    // workerManager.receiveMessageFromChildAsync(idWorker1).then((e: any) => {
    //     console.log('Hola soy el padre, aquí los datos de mi hijo 1: ', e);
    //     workerManager.exitChild(idWorker1);
    // });

    // workerManager.receiveMessageFromChildAsync(idWorker2).then((e: any) => {
    //     console.log('Hola soy el padre, aquí los datos de mi hijo 2: ', e);
    //     workerManager.exitChild(idWorker2);
    // });
    // TEST ENVIAR-HIJO/RECIBIR-PADRE NORMAL: FIN

    // TEST GATHER
    workerManager.gatherReceive().then(allMessages => {
        console.log('Hola soy el padre, aquí los datos de mi hijo 1: ', allMessages[0]);
        console.log('Hola soy el padre, aquí los datos de mi hijo 2: ', allMessages[1]);
        workerManager.exitAllChilds();
    });

    // TEST SCATTER
    workerManager.scatterSender([
        {'datos hijo 1': [1234, {'hola': 'mensaje del padre al hijo 1'}]},
        {'dat000s 2222': [1234, {'hola': 'mensaje del padre al hijo 2'}]},
    ])

    // TEST ENVIAR-PADRE/RECIBIR-HIJO NORMAL
    // workerManager.sendMessageToChild(idWorker2, {'datos': [1234, {'hola': 'mensaje del padre al hijo'}]});

    checkUntilConditionIsTrue(() => isTerminated1 && isTerminated2, () => console.log('Programa terminado'), 100);
}