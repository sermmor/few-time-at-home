import { ConfigurationService } from "../API";
import { ChannelMediaRSSMessage } from "../channelMediaRSS";
import { WorkerChildParentHandleData, WorkerManager } from "../workerModule/workersManager";

export class YoutubeRSSUtils {
  static allLastMessages: ChannelMediaRSSMessage[] = [];
  static tag: string = 'null';
  
  static setTag = (newTag: string | undefined) => YoutubeRSSUtils.tag = newTag || 'null';

  static createWorkerData(messagesToSend: ChannelMediaRSSMessage[][], indexWorker: number): WorkerChildParentHandleData {
    return {
      id: `youtubeAntiShorts ${indexWorker}`,
      workerScriptPath: './build/youtubeRSS/youtubeFilterShortWorker.js',
      workerDataObject: {
        allLastMessages: messagesToSend[indexWorker],
      },
    }
  }

  static launchAntiShortsWorkers = (messagesToCheck: ChannelMediaRSSMessage[]): Promise<ChannelMediaRSSMessage[]> => new Promise<ChannelMediaRSSMessage[]>(resolve=> {
    const messagesToSend: ChannelMediaRSSMessage[][] = WorkerManager.divideArrayInNumberOfWorkers(messagesToCheck, ConfigurationService.Instance.numberOfWorkers);
    const dataWorkerList: WorkerChildParentHandleData[] = [];
    
    for (let i = 0; i < ConfigurationService.Instance.numberOfWorkers; i++) {
      dataWorkerList.push(YoutubeRSSUtils.createWorkerData(messagesToSend, i));
    }

    const workerManager = new WorkerManager(dataWorkerList);

    workerManager.gatherReceive().then(allNewMessagesFiltered => {
      const newMessagesFiltered = allNewMessagesFiltered
          .reduce((previous, current) => previous.concat(current))
          .sort((messageA: any, messageB: any) => messageA.date < messageB.date ? 1 : -1);
      workerManager.exitAllChilds();
      resolve(newMessagesFiltered);
    });
  });

  static getCurrentAmountToCheckShort = (totalAmount: number) => totalAmount + Math.ceil(totalAmount * 0.25);

  static filterYoutubeShortProcess = (allLastMessages: ChannelMediaRSSMessage[], totalMessagesToSend: number, accumulator: ChannelMediaRSSMessage[] = []): Promise<ChannelMediaRSSMessage[]> => new Promise<ChannelMediaRSSMessage[]>(resolve=> {
    if (allLastMessages.length === 0) {
      resolve(accumulator);
    } else {
      const totalAmount = totalMessagesToSend - accumulator.length;
      const amountToCheckShort = YoutubeRSSUtils.getCurrentAmountToCheckShort(totalAmount);
      const messagesToCheck = allLastMessages.slice(0, amountToCheckShort < allLastMessages.length ? amountToCheckShort : undefined);

      YoutubeRSSUtils.launchAntiShortsWorkers(messagesToCheck).then(newMessagesFiltered => {
        const newAccumulator = accumulator.concat(newMessagesFiltered);
        console.log(`Filtered loop result: ${newAccumulator.length} youtube not short urls`);
        console.log(`${newAccumulator.length} >= ${totalMessagesToSend}`);
        if (newAccumulator.length >= totalMessagesToSend) {
          resolve(newAccumulator);
        } else {
          const newMessagesToCheck = amountToCheckShort < allLastMessages.length ? allLastMessages.slice(amountToCheckShort) : [];
          setTimeout(
            () => YoutubeRSSUtils.filterYoutubeShortProcess(newMessagesToCheck, totalMessagesToSend, newAccumulator).then(finalAccumulator =>
              resolve(finalAccumulator)
            ),
            0
          );
        }
      });
    }
  });

  static filterYoutubeShorts = (totalAmount: number): Promise<string[]> => new Promise<string[]>(resolve=> {
    const reverseAllLastMessages = YoutubeRSSUtils.allLastMessages.reverse();

    YoutubeRSSUtils.filterYoutubeShortProcess(reverseAllLastMessages, totalAmount).then((allFilteredMessages: ChannelMediaRSSMessage[]) => {
      resolve(allFilteredMessages.slice(0, totalAmount < allFilteredMessages.length ? totalAmount : undefined).reverse().map(
        message =>`${message.title}
${message.author} - ${message.date.toDateString()}
${message.content}
${message.originalLink}`
          ))
    });
  });
}
