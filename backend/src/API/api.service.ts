import express, {Express, Request, Response} from 'express';
import { QuoteListUtilities } from '../quote/quoteList';
import { TelegramBot } from '../telegramBot/telegramBot';
import { getUnfurl } from '../unfurl/unfurl';
import { AlertListService } from './alertNotification.service';
import { Bookmark, BookmarkService } from './bookmark.service';
import { ConfigurationService } from './configuration.service';
import { ChannelMediaRSSCollection, TelegramBotCommand } from './messagesRSS.service';
import { NotesService } from './notes.service';
import Multer from 'multer';
import { CloudService, cloudDefaultPath } from './cloud.service';
import path from 'path';
import { YoutubeRSSUtils } from '../youtubeRSS/youtubeRSSUtils';
import { PomodoroService } from './pomodoro.service';
import { ConvertToMP3 } from '../convertToMp3/convertToMp3';
import { SynchronizeService } from './synchronize.service';
// import { NitterRSSMessageList } from '../nitterRSS';

const cors = require('cors');
// const multer = require("multer");
const upload: Multer.Multer = Multer({ dest: 'data/uploads/' });

export interface DataToSendInPieces {
  data: Bookmark[];
  pieceIndex: number;
  totalPieces: number;
  isFinished: boolean;
}

export class APIService {
  static getAllRssEndpoint  = "/rss/all"; // query: http://localhost:${port}/rss/all?amount=20
  static getRssMastoEndpoint  = "/rss/mastodon";
  static getRssTwitterEndpoint  = "/rss/twitter";
  static getRssBlogEndpoint  = "/rss/blog";
  static getRssYoutubeEndpoint  = "/rss/youtube";
  static configurationEndpoint = "/configuration";
  static configurationTypeEndpoint = "/configuration/type";
  static configurationListByTypeEndpoint = "/configuration/type/list";
  static configurationLaunchCommandEndpoint = "/configuration/launch-command";
  static notesEndpoint = "/notes";
  static pomodoroEndpoint = "/pomodoro";
  static alertsEndpoint = "/alerts";
  static alertIsReadyEndpoint = "/alerts-is-ready";
  static bookmarksEndpoint = "/bookmarks";
  static bookmarksPieceEndpoint = "/bookmarks-piece";
  static searchBookmarksEndpoint = "/search-bookmarks";
  static quoteEndpoint = "/random-quote";
  static unfurlEndpoint = "/unfurl";
  static sendToTelegramEndpoint = "/send-to-telegram";
  static videoToMp3ConverterEndpoint = "/video-to-mp3-converter";
  static audioToMp3ConverterEndpoint = "/audio-to-mp3-converter";
  static stillConverterEndpoint = "/still-converter";
  static cloudEndpointList = {
    getDrivesList: '/cloud/drives',
    getFolderContent: '/cloud/get-folder-content',
    createFolder: '/cloud/create-folder',
    moveItem: '/cloud/move-item',
    renameItem: '/cloud/rename-item',
    createBlankFile: '/cloud/create-blank-file',
    saveFile: '/cloud/save-file',
    uploadFile: '/cloud/upload-file',
    downloadFile: '/cloud/download-file',
    searchInFolder: '/cloud/search-in-folder',
    deleteFileOrFolder: '/cloud/delete',
    zipFolder: '/cloud/zip-folder',
  };
  static synchronize = {
    clientDownloadAppFile: '/synchronize/download',
    clientUploadAppFile: '/synchronize/upload',
    serverDownloadAppFile: '/synchronize/server/download',
    serverUploadAppFile: '/synchronize/server/upload',
  }

  app: Express;

  constructor(
    private channelMediaCollection: ChannelMediaRSSCollection,
    private commands: TelegramBotCommand,
  ) {
    this.app = express();
    this.app.use(express.json())
    this.app.use(cors());

    this.getRSS(APIService.getAllRssEndpoint, this.commands.onCommandAll);
    this.getRSS(APIService.getRssMastoEndpoint, this.commands.onCommandMasto);
    this.getRSS(APIService.getRssTwitterEndpoint, this.commands.onCommandNitter);
    this.getRSS(APIService.getRssBlogEndpoint, this.commands.onCommandBlog);
    this.getRSS(APIService.getRssYoutubeEndpoint, this.commands.onCommandYoutube);
    this.unfurlService();
    this.configurationService();
    this.getRandomQuoteService();
    this.notesService();
    this.pomodoroService();
    this.alertsService();
    this.bookmarksService();
    this.notepadService();
    this.converterToMp3Service();
    this.cloudService();
    this.synchronizeService();
    
    this.app.listen(ConfigurationService.Instance.apiPort, () => {
        console.log("> Server ready!");
    });
  }

  getRSS = (endpoint: string, rssCommand: () => Promise<string[]>) => {
    this.app.get(endpoint, (req, res) => {
        const webNumberOfMessagesWithLinks: number = req.query.amount ? +req.query.amount : 0;
        ConfigurationService.Instance.twitterData.numberOfMessages = webNumberOfMessagesWithLinks;
        rssCommand().then(messagesToSend => {
            if (endpoint === APIService.getRssYoutubeEndpoint) {
              // Remove shorts videos.
              YoutubeRSSUtils.filterYoutubeShorts(webNumberOfMessagesWithLinks).then(messages => {
                res.send({ messages });
              });
            } else {
              const messages = messagesToSend.slice(messagesToSend.length - webNumberOfMessagesWithLinks);
              res.send({ messages });
            }
        });
    });
  }

  private configurationService() {
    // { type: string, content: JSON }
    this.app.post(APIService.configurationEndpoint, (req, res) => {
        if (!req.body) {
            console.error("Received NO body JSON");
            res.send({response: 'OK'});
        } else {
            ConfigurationService.Instance.updateConfigurationByType(this.channelMediaCollection, req.body.type, req.body.content).then(() => {
              res.send({response: 'OK'});
            });
        }
    });
    
    // { type: string }, RETURNS Configuration list type in {data: }.
    this.app.post(APIService.configurationListByTypeEndpoint, (req, res) => {
      res.send({data: ConfigurationService.Instance.getConfigurationByType(req.body.type)});
    });

    this.app.get(APIService.configurationTypeEndpoint, (req, res) => {
      res.send({data: ConfigurationService.Instance.getConfigTypes()});
    });

    // body: commandLine
    this.app.post(APIService.configurationLaunchCommandEndpoint, (req, res) => {
        if (!req.body) {
            console.error("Received NO body JSON");
            res.send({ stdout: '', stderr: 'Received NO body JSON' });
        } else {
          ConfigurationService.Instance.launchCommandLine(req.body.commandLine).then((response) => {
            res.send(response);
          });
        }
    });
  }

  private notesService() {
    const notes = new NotesService();
    notes.getNotes();
    this.app.post(APIService.notesEndpoint, (req, res) => {
        if (!req.body) {
            console.error("Received NO body text");
        } else {
            NotesService.Instance.updateNotes(req.body.data).then(data => res.send({data}));
        }
    });

    this.app.get(APIService.notesEndpoint, (req, res) => {
      NotesService.Instance.getNotes().then(data => res.send({data}));
    });
  }

  private pomodoroService() {
    const pomodoro = new PomodoroService();
    pomodoro.refleshTimerModeList()
    // { data: { name: string; chain: string[]; }[] }, RETURNS New Pomodoro list.
    this.app.post(APIService.pomodoroEndpoint, (req, res) => {
        if (!req.body) {
            console.error("Received NO body text");
        } else {
          PomodoroService.Instance.setTimeModeList(req.body.data).then(data => res.send({data}));
        }
    });

    this.app.get(APIService.pomodoroEndpoint, (req, res) => {
      res.send({data: PomodoroService.Instance.timeModeList});
    });
  }

  private converterToMp3Service() {
    const converter = new ConvertToMP3();
    let messageQueue: string[] = [];
    let isFinishedConverter = true;

    const waitUntilQueueFill = (): Promise<string> => new Promise<string>(resolve => {
      if (messageQueue.length === 0) {
        setTimeout(() => waitUntilQueueFill().then(msg => resolve(msg)), 0);
      } else if (messageQueue.length === 1) {
        resolve(messageQueue.pop()!);
      } else {
        const allMessages = messageQueue.reduce((previous, current) => `${previous}\n${current}`, '');
        messageQueue = [];
        resolve(allMessages);
      }
    });

    // Returns {message: string, isFinished: boolean}
    this.app.post(APIService.stillConverterEndpoint, (req, res) => {
      if (isFinishedConverter) {
        res.send({ message: "FINISHED!", isFinished: isFinishedConverter});
      } else {
        waitUntilQueueFill().then((message) => res.send({message, isFinished: isFinishedConverter}));
      }
    });
    
    // { data: { folderFrom: string; folderTo: string; bitrate: BitrateWithK; } }, RETURNS message process.
    this.app.post(APIService.videoToMp3ConverterEndpoint, (req, res) => {
        if (!req.body) {
            console.error("Received NO body text");
        } else {
          const data = {
            ...req.body.data,
            folderFrom: CloudService.Instance.fromRelativePathToAbsolute(req.body.data.folderFrom),
            folderTo: CloudService.Instance.fromRelativePathToAbsolute(req.body.data.folderTo),
          }
          CloudService.Instance.isExistsAllPaths([data.folderFrom, data.folderTo]).then(isExistsPath => {
            if (isExistsPath) {
              isFinishedConverter = false;
              messageQueue = [];
              ConvertToMP3.Instance.convertAllVideosToMP3(
                data,
                msg => {
                  messageQueue.push(msg);
                },
                msg => {
                  isFinishedConverter = true;
                  messageQueue.push("FINISHED!");
                },
              );
              res.send({ message: "Ready!", isFinished: isFinishedConverter});
            } else {
              res.send({ message: "Some routes doesn't exists!", isFinished: isFinishedConverter});
            }
          });
        }
    });

    // { data: { folderFrom: string; folderTo: string; bitrateToConvertAudio: Bitrate; } }, RETURNS message process.
    this.app.post(APIService.audioToMp3ConverterEndpoint, (req, res) => {
        if (!req.body) {
            console.error("Received NO body text");
        } else {
          const data = {
            ...req.body.data,
            folderFrom: CloudService.Instance.fromRelativePathToAbsolute(req.body.data.folderFrom),
            folderTo: CloudService.Instance.fromRelativePathToAbsolute(req.body.data.folderTo),
          }
          CloudService.Instance.isExistsAllPaths([data.folderFrom, data.folderTo]).then(isExistsPath => {
            if (isExistsPath) {
              isFinishedConverter = false;
              messageQueue = [];
              ConvertToMP3.Instance.convertAllAudiosToMP3(
                data,
                msg => {
                  messageQueue.push(msg);
                },
                msg => {
                  isFinishedConverter = true;
                  messageQueue.push("FINISHED!");
                },
              );
              res.send({ message: "Ready!", isFinished: isFinishedConverter});
            } else {
              res.send({ message: "Some routes doesn't exists!", isFinished: isFinishedConverter});
            }
          });
        }
    });

  }

  private alertsService() {
    const alerts = new AlertListService();
    alerts.getAlerts();
    this.app.post(APIService.alertsEndpoint, (req, res) => {
        if (!req.body) {
            console.error("Received NO body text");
        } else {
          AlertListService.Instance.updateAlerts(AlertListService.Instance.parseStringsListToAlertList(req.body.alerts))
            .then(data => res.send({alerts: AlertListService.Instance.parseAlertListToStringList(data)}));
        }
    });

    this.app.get(APIService.alertsEndpoint, (req, res) => {
      AlertListService.Instance.getAlerts().then(data => res.send({alerts: AlertListService.Instance.parseAlertListToStringList(data)}));
    });

    this.app.get(APIService.alertIsReadyEndpoint, (req, res) => {
      res.send({isAlertReady: TelegramBot.IsBotReady()});
    });
  }

  private bookmarksService() {
    let bookmarkPostExecuting: Bookmark[] = [];
    let bookmarkGetExecuting: DataToSendInPieces[] = [];
    const bookmark = new BookmarkService();
    bookmark.getBookmarks();

    this.app.post(APIService.bookmarksEndpoint, (req, res) => {
        if (!req.body) {
          console.error("Received NO body text");
        } else {
          bookmarkPostExecuting = bookmarkPostExecuting.concat(req.body.data);
          if (req.body.isFinished) {
            BookmarkService.Instance.updateBookmarks(bookmarkPostExecuting).then(data => {
              bookmarkPostExecuting = [];
              res.send({response: 'OK'});
            });
          } else {
            res.send({response: 'Waiting'});
          }
        }
    });

    this.app.post(APIService.searchBookmarksEndpoint, (req, res) => {
        if (!req.body) {
          console.error("Received NO body text");
        } else {
          res.send({data: BookmarkService.Instance.searchInBookmark(req.body.data)});
        }
    });

    this.app.get(APIService.bookmarksEndpoint, (req, res) => {

      BookmarkService.Instance.getBookmarks().then(data => {
        bookmarkGetExecuting = this.prepareInPiecesDataModelToSend(data);
        
        const toSend = bookmarkGetExecuting.length > 0 ? bookmarkGetExecuting[0] : undefined;

        if (bookmarkGetExecuting.length > 1) {
          bookmarkGetExecuting = bookmarkGetExecuting.splice(1);
        }
        res.send({ data: toSend });
      });

    });

    this.app.get(APIService.bookmarksPieceEndpoint, (req, res) => {
      const toSend = bookmarkGetExecuting[0];
      bookmarkGetExecuting = bookmarkGetExecuting.splice(1);
      res.send({ data: toSend });
    });
  }

  private prepareInPiecesDataModelToSend = (bookmarks: Bookmark[], numberItemsPerPiece: number = 100): DataToSendInPieces[] => {
    const numberOfPieces = Math.ceil(bookmarks.length / numberItemsPerPiece);
    const dataToSend: DataToSendInPieces[] = [];
    let indexCurrent = 0;
  
    for (let i = 0; i < numberOfPieces; i++) {
      if (indexCurrent + numberItemsPerPiece < bookmarks.length) {
        dataToSend.push({
          data: bookmarks.slice(indexCurrent, indexCurrent + numberItemsPerPiece),
          pieceIndex: i + 1,
          totalPieces: numberOfPieces,
          isFinished: false,
        });
        indexCurrent = indexCurrent + numberItemsPerPiece;
      } else {
        dataToSend.push({
          data: bookmarks.slice(indexCurrent, bookmarks.length),
          pieceIndex: i + 1,
          totalPieces: numberOfPieces,
          isFinished: true,
        });
        indexCurrent = bookmarks.length;
      }
    }
    
    return dataToSend;
  }

  private getRandomQuoteService() {
    this.app.get(APIService.quoteEndpoint, (req, res) => {
      res.send(QuoteListUtilities.getAInspirationalQuote(ConfigurationService.Instance.quoteList));
    });
  }

  private unfurlService() {
    this.app.post(APIService.unfurlEndpoint, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
          getUnfurl(req.body.url).then(content => res.send(content));    
      }
    });
  }

  private notepadService() {
    this.app.post(APIService.sendToTelegramEndpoint, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        const success = TelegramBot.Instance().sendNotepadTextToTelegram(req.body.text);
        res.send({isSended: success});
      }
    });
  }

  private cloudService() {
    const cloudService = new CloudService();

    this.app.get(APIService.cloudEndpointList.getDrivesList, (req, res) => {
      res.send({driveList: cloudService.getDrivesList()});
    });

    // body: drive, folderPath
    this.app.post(APIService.cloudEndpointList.getFolderContent, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.getFolderContent(req.body.drive, req.body.folderPath).then(cloudItemList => res.send({data: cloudItemList}));
      }
    });

    // body: path
    this.app.post(APIService.cloudEndpointList.createFolder, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.createFolder(req.body.path).then((message) => res.send({message}));
      }
    });

    // body: path
    this.app.post(APIService.cloudEndpointList.createBlankFile, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.createBlankFile(req.body.path).then(() => res.send({isUpdated: true}));
      }
    });

    // body: filePath, textContent
    this.app.post(APIService.cloudEndpointList.saveFile, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.saveInFile(req.body.filePath, req.body.textContent).then(() => res.send({isUpdated: true}));
      }
    });

    // body: oldPathList, newPathList
    this.app.post(APIService.cloudEndpointList.moveItem, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.moveFileOrFolder(req.body.oldPathList, req.body.newPathList).then((message) => res.send({ message }));
      }
    });

    // body: oldPath, newPath
    this.app.post(APIService.cloudEndpointList.renameItem, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.renameFileOrFolder(req.body.oldPath, req.body.newPath).then((message) => res.send({ message }));
      }
    });

    // body: req.body.folderPathToSave, req.file
    this.app.post(APIService.cloudEndpointList.uploadFile, upload.single('file'), (req, res) => {
      if (!req.body || !req.file) {
          console.error("Received NO body text");
      } else {
        const allFiles: Express.Multer.File = <Express.Multer.File> req.file;
        cloudService.uploadFile(allFiles.path, `${req.body.folderPathToSave}/${allFiles.originalname}`).then(message => {
          res.send({ message });
          });
      }
    });

    // body: req.body.nameDrive, req.body.folderPath, req.body.searchTokken
    this.app.post(APIService.cloudEndpointList.searchInFolder, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.searchCloudItemInDirectory(req.body.nameDrive, req.body.folderPath, req.body.searchTokken).then(search => {
          res.send({ search });
        })
      }
    });

    // body: drive, path
    this.app.post(APIService.cloudEndpointList.deleteFileOrFolder, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.deleteFileOrFolder(req.body.drive, req.body.path).then((message) => res.send({message}));
      }
    });

    // body: {relativePathToZip: string, compression: 0 | 5 | 9}
    this.app.post(APIService.cloudEndpointList.zipFolder, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.zipFolder(req.body.relativePathToZip, req.body.compression).then((message) => res.send({message}));
      }
    });

    // body: drive, path
    this.app.post(APIService.cloudEndpointList.downloadFile, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        const options: {root: undefined | string} = {
          root: undefined
        };

        
        if (cloudDefaultPath === req.body.cloud) {
          options.root = path.join(__dirname);
        } else {
          options.root = `${ConfigurationService.Instance.cloudRootPath}/${cloudService.getPathDrive(req.body.drive)}`;
        }
        
        const fileRelativePath = (<string> req.body.path).split('/').slice(1).join('/'); // Remove 'drive'.
        
        res.sendFile(fileRelativePath, options, (err) => {
          if (err) {
            console.error("Received NO body text");
          } else {
            console.log(`Sent: ${fileRelativePath}`);
          }
        });
      }
    });
  }

  private synchronizeService = () => {
    const synchronizeService = new SynchronizeService();

    // ESTOY COMO CLIENTE, quiero descargar fichero del servidor.
    // body: req.url
    this.app.post(APIService.synchronize.clientDownloadAppFile, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        
        synchronizeService.clientDownloadDataFromUrl(`${req.body.url}${APIService.synchronize.serverUploadAppFile}`).then(() => {
          console.log("Configuración del cliente sincronizada.");
          res.send({message: "Configuración del cliente sincronizada."});
        });
      }
    });

    // ESTOY COMO CLIENTE, quiero subir fichero al servidor.
    // body: req.url
    this.app.post(APIService.synchronize.clientUploadAppFile, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        // console.log(`${req.body.url}${APIService.synchronize.serverDownloadAppFile}`)
        synchronizeService.clientUploadDataToUrl(`${req.body.url}${APIService.synchronize.serverDownloadAppFile}`).then(() => {
          console.log("Configuración sincronizada del cliente subida.");
          res.send({message: "Configuración sincronizada del cliente subida."});
        });
      }
    });

    // ESTOY COMO SERVIDOR, quiero descargar fichero del cliente.
    // body: req.file
    this.app.post(APIService.synchronize.serverDownloadAppFile, upload.single('file'), (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        const allFiles: Express.Multer.File = <Express.Multer.File> req.file;
        synchronizeService.serverDownloadDataFromUrl(allFiles.path).then(() => {
          console.log("Configuración del servidor sincronizada.");
          res.send({message: "Configuración del servidor sincronizada."});
        });
      }
    });

    // ESTOY COMO SERVIDOR, quiero subir fichero al cliente.
    this.app.post(APIService.synchronize.serverUploadAppFile, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        synchronizeService.serverUploadDataToUrl(res).then(() => {
          console.log("Configuración sincronizada del servidor subida al cliente.");
          res.send({message: "Configuración sincronizada del servidor subida al cliente."});
        });
      }
    });
  }
}
