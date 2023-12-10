import { writeFile, stat, mkdir, readFile, copyFile } from 'fs';
import { RecurrenceRule, scheduleJob } from 'node-schedule';
import { TelegramBot } from './telegramBot/telegramBot';

const nameMonths: {[key: string]: number} = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11, };

export const parseFromNitterDateStringToDateObject = (dateString : string): Date => {
    // Example date: 'Tue, 28 Feb 2023 12:00:17 GMT'
    const dateSplited = dateString.split(' ');
    const hourSplited = dateSplited[4].split(':');
    return new Date(+dateSplited[3], nameMonths[dateSplited[2]], +dateSplited[1], +hourSplited[0], +hourSplited[1], +hourSplited[2]);
}

export const parseFromBlogDateStringToDateObject = (dateString : string): Date => {
    // Example date: '2023-03-09T09:27:00.000Z'
    const dateSplited = dateString.split('T')[0].split('-');
    const hourSplited = dateString.split('T')[1].split(':');
    return new Date(+dateSplited[0], (+dateSplited[1]) - 1, +dateSplited[2], +hourSplited[0], +hourSplited[1], 0);
}

export const parseFromAlertDateStringToDateObject = (dateString : string): Date => {
  // TIME FORMAT: '2023-03-21T09:55:02.070Z'
 return new Date(Date.parse(dateString));
}
export const parseFromDateObjectToAlertDateString = (date : Date): string => {
  // TIME FORMAT: '2023-03-21T09:55:02.070Z'
  return date.toJSON();
}

export const checkUntilConditionIsTrue = (predicate: () => boolean, doWhenConditionIsTrue: () => void, timeToWait: number = 100) => {
    setTimeout(() => (predicate() ? doWhenConditionIsTrue() : checkUntilConditionIsTrue(predicate, doWhenConditionIsTrue, timeToWait)), timeToWait);
}

export const removeDuplicatesInStringArray = (listWithDuplicatesOrNot: string[]): string[] => {
    const onlyNotDuplicates: string[] = [];
    listWithDuplicatesOrNot.forEach(element => {
        if (onlyNotDuplicates.indexOf(element) < 0) {
            onlyNotDuplicates.push(element);
        }
    });
    return onlyNotDuplicates;
}

export const removeDuplicates = <T>(listWithDuplicatesOrNot: T[], isEqual: (a: T, b: T) => boolean): T[] => {
    const onlyNotDuplicates: T[] = [];
    let finded: boolean;
    listWithDuplicatesOrNot.forEach(element => {
        finded = !!onlyNotDuplicates.find((value) => {
            for (let i = 0; i < listWithDuplicatesOrNot.length; i++) {
                if (isEqual(element, value)) {
                    return true;
                }
            }
            return false;
        });
        if (!finded) {
            onlyNotDuplicates.push(element);
        }
    });
    return onlyNotDuplicates;
}

export const saveInAFile = (str: string, savePath: string = 'data/result.html', callback?: (str: string) => void): void => {
    const folderPathSplited = savePath.split("/");
    const folderPath = folderPathSplited.slice(0, folderPathSplited.length - 1).join("/");
    const saveFile = () => writeFile(savePath, str, () => {
        if (callback) {
            callback(str);
        }
    });

    stat(folderPath, (err, stat) => {
        if (err === null) {
            saveFile();
        } else {
            mkdir(folderPath, {recursive: true}, () => saveFile());
        }
    });
}

export const readJSONFile = (pathFile: string, contentByDefault: string): Promise<any> => new Promise<any>(resolve => {
  readFile(pathFile, (err: any, data: any) => {
    if (err) {
      saveInAFile(contentByDefault, pathFile, () => resolve({}));
    } else {
      try {
        const jsonData = JSON.parse(<string> <any> data);
        resolve(jsonData);
      } catch (ex) {
        saveInAFile(contentByDefault, pathFile, () => resolve({}));
      }
    }
  });
});

export class ExtractorUtilities {
  public static cut = (content: string, beginToCut: string, endToCut?: string): string => {
      const contentSpliter = content.split(beginToCut);
      if (endToCut && contentSpliter && contentSpliter.length > 1 && !!contentSpliter[1].split(endToCut) && contentSpliter[1].split(endToCut).length > 0) {
          return contentSpliter[1].split(endToCut)[0];
      } else if (contentSpliter && contentSpliter.length > 1 && contentSpliter.slice(1).length > 1) {
          return contentSpliter.slice(1).join(beginToCut);
      } else {
        return '';
      }
  }

  public static cutInnerHTML = (content: string): string => content.split(">")[1].split("<")[0];

  public static removeAllEndOfLine = (content: string): string => content.split("\n").join("");
};

const pathToCopyList = [
  'data/cloud/cloud.json',
  'data/notes.txt',
  'data/alerts.json',
  'data/bookmark.json',
  'allRss.json',
  'configuration.json',
  'keys.json'
];

const pathToPasteList = [
  'cloud.json',
  'notes.txt',
  'alerts.json',
  'bookmark.json',
  'allRss.json',
  'configuration.json',
  'keys.json'
]

const copyAFileToBackupFolder = (sourcePath: string, destinyPath: string): Promise<void> => {
  return new Promise<void>(resolve => copyFile(sourcePath, destinyPath, (err) => {
    if (err) throw err;
    resolve();
  }));
}

const runBackup = (pathRootToPaste: string, indexToCopy = 0, nameFolderDate = '') => {
  if (indexToCopy < pathToCopyList.length) {
    if (indexToCopy === 0) {
      const currentDate = new Date();
      nameFolderDate = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth()}-${currentDate.getUTCDate()}_${currentDate.getUTCHours()}-${currentDate.getUTCMinutes()}-${currentDate.getUTCSeconds()}-${currentDate.getUTCMilliseconds()}`;
      mkdir(`${pathRootToPaste}/${nameFolderDate}`, {recursive: true}, () => {
        copyAFileToBackupFolder(
          pathToCopyList[indexToCopy],
          `${pathRootToPaste}/${nameFolderDate}/${pathToPasteList[indexToCopy]}`)
        .then(() => runBackup(pathRootToPaste, indexToCopy + 1, nameFolderDate));
      });
    } else {
      copyAFileToBackupFolder(
        pathToCopyList[indexToCopy],
        `${pathRootToPaste}/${nameFolderDate}/${pathToPasteList[indexToCopy]}`)
      .then(() => runBackup(pathRootToPaste, indexToCopy + 1, nameFolderDate));
    }
  } else {
    console.log('> Backup created!');
  }
}

export const startBackupEveryWeek = (pathRootToPaste: string) => {
  scheduleJob('do a backup once a week', { hour: 12, minute: 0, dayOfWeek: 1}, () => {
    runBackup(pathRootToPaste);
    TelegramBot.Instance().sendNotepadTextToTelegram('Backup created today!');
  });
  runBackup(pathRootToPaste);
}
