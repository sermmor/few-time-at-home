import { stat } from "fs/promises";
import { readJSONFile, saveInAFilePromise } from "../utils";

export type ReadLaterMessage = {id: number; message: string};

export class ReadLaterMessagesRSS {
  private static readLaterMessagesRSSPath = 'data/readLaterMessagesRSS.json';
  
  static getMessagesRSSSaved = async(amount: number): Promise<ReadLaterMessage[]> => {
    let messages: ReadLaterMessage[] = [];
    try {
        const stats = await stat(ReadLaterMessagesRSS.readLaterMessagesRSSPath);
        messages = await readJSONFile(ReadLaterMessagesRSS.readLaterMessagesRSSPath, '[]');
        messages = messages.reverse();
        if (messages.length > amount) {
          messages = messages.slice(0, amount);
        }
      } catch (err) {
        await saveInAFilePromise('[]', ReadLaterMessagesRSS.readLaterMessagesRSSPath);
        console.log(`File ${ReadLaterMessagesRSS.readLaterMessagesRSSPath} created correctly.`);
      }
    return messages;
  };

  private static searchNextIndexFree = (messages: ReadLaterMessage[]): number => {
    const allIndex: number[] = messages.map(({id}) => +id);
    const allIndexSorted = allIndex.sort((a, b) => a - b);
    let newIndex = 0;
    for (let i = 0; i < allIndexSorted.length; i++) {
      if (allIndexSorted[i] === newIndex) {
        newIndex++;
      } else {
        return newIndex;
      }
    }
    return newIndex;
  }
  
  static addMessageRSSToSavedList = async(messageToAdd: string): Promise<ReadLaterMessage> => {
    let messages: ReadLaterMessage[] = await readJSONFile(ReadLaterMessagesRSS.readLaterMessagesRSSPath, '[]');
    messages = typeof messages === 'string' ? [] : messages;
    const newMessage = {
      id: ReadLaterMessagesRSS.searchNextIndexFree(messages),
      message: messageToAdd,
    };
    messages.push(newMessage);
    await saveInAFilePromise(JSON.stringify(messages, null, 2), ReadLaterMessagesRSS.readLaterMessagesRSSPath);
    return newMessage;
  };
  
  static removeMessageRSSFromSavedList = async(idMessageToRemove: number): Promise<void> => {
    const messages: ReadLaterMessage[] = await readJSONFile(ReadLaterMessagesRSS.readLaterMessagesRSSPath, '[]');
    const newMessages = messages.filter(b => idMessageToRemove !== b.id);
    await saveInAFilePromise(JSON.stringify(newMessages, null, 2), ReadLaterMessagesRSS.readLaterMessagesRSSPath);
  };

  static fileContent = async(): Promise<any> => await readJSONFile(ReadLaterMessagesRSS.readLaterMessagesRSSPath, '[]');

  static setFileContent = async(data: any): Promise<void> => {
    await saveInAFilePromise(JSON.stringify(data, null, 2), ReadLaterMessagesRSS.readLaterMessagesRSSPath);
  };
}
