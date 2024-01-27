import { ChannelMediaRSSMessage } from "../channelMediaRSS";
import { WorkerChild } from "../workerModule/workersManager";

const fetch = require("node-fetch");

const youtubeAddDelay = 10;

const isAYouTubeShortText = (text: string): boolean => text.indexOf('youtube.com/shorts/') !== -1;

const isAYouTubeShortLink = (link: string, currentTry = 4): Promise<boolean> => new Promise<boolean>(resolve=> {
    const key = link.split('https://www.youtube.com/watch?v=')[1];
    fetch(`https://www.youtube.com/shorts/${key}`).then((res: any) => res.text()).then((text: string) => {
      resolve(isAYouTubeShortText(text));
    }).catch(() => {
      if (currentTry > 0) {
          setTimeout(() => isAYouTubeShortLink(link, currentTry - 1).then(data => resolve(data)), 100);
      } else {
          console.error(`Youtube link ${link} can be broken or deleted!`);
          resolve(false);
      }
    });
  });

const processRemoveYoutubeShorts = (allLastMessages: ChannelMediaRSSMessage[], accumulator: ChannelMediaRSSMessage[] = []): Promise<ChannelMediaRSSMessage[]> => new Promise<ChannelMediaRSSMessage[]>(resolve=> {
    if (allLastMessages.length === 0) {
      console.log('Filtered ends');
      resolve(accumulator);
    } else {
      isAYouTubeShortLink(allLastMessages[0].originalLink).then(isAShort => {
        if (!isAShort) {
          console.log(`Added ${allLastMessages[0].originalLink}`);
          // console.log(`Added ${allLastMessages[0].title}`);
          accumulator.push(allLastMessages[0]);
        // } else {
          // console.log(`IT'S A SHORT: Removed '${allLastMessages[0].title}'`);
        }
        setTimeout(
          () => processRemoveYoutubeShorts(allLastMessages.slice(1), accumulator).then((accumulatorResult) => resolve(accumulatorResult)),
          youtubeAddDelay
        );
      });
    }
  });

(function () {
  const worker = new WorkerChild();
  
  processRemoveYoutubeShorts(worker.dataGettedFromParent.allLastMessages).then(newMessagesFiltered => {
    worker.gatherSender(newMessagesFiltered);
  });
})();
