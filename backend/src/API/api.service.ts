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
import { CloudService, cloudDefaultPath } from './cloudV2.service';
import path from 'path';

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
  static configurationLaunchCommandEndpoint = "/configuration/launch-command";
  static notesEndpoint = "/notes";
  static alertsEndpoint = "/alerts";
  static alertIsReadyEndpoint = "/alerts-is-ready";
  static bookmarksEndpoint = "/bookmarks";
  static bookmarksPieceEndpoint = "/bookmarks-piece";
  static searchBookmarksEndpoint = "/search-bookmarks";
  static quoteEndpoint = "/random-quote";
  static unfurlEndpoint = "/unfurl";
  static sendToTelegramEndpoint = "/send-to-telegram";
  static cloudEndpointList = {
    getDrivesList: '/cloud/drives',
    getFolderContent: '/cloud/get-folder-content',
    createFolder: '/cloud/create-folder',
    moveItem: '/cloud/move-item',
    renameItem: '/cloud/rename-item',
    createBlankFile: '/cloud/create-blank-file',
    uploadFile: '/cloud/upload-file',
    downloadFile: '/cloud/download-file',
    searchInFolder: '/cloud/search-in-folder',
    deleteFileOrFolder: '/cloud/delete',
  };

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
    this.alertsService();
    this.bookmarksService();
    this.notepadService();
    this.cloudService();
    
    this.app.listen(ConfigurationService.Instance.apiPort, () => {
        console.log("> Server ready!");
    });
  }

  getRSS = (endpoint: string, rssCommand: () => Promise<string[]>) => {
    this.app.get(endpoint, (req, res) => {
        const webNumberOfMessagesWithLinks: number = req.query.amount ? +req.query.amount : 0;
        rssCommand().then(messagesToSend => {
            const messages = messagesToSend.slice(messagesToSend.length - webNumberOfMessagesWithLinks);
            res.send({ messages });
        });
    });
  }

  private configurationService() {
    this.app.post(APIService.configurationEndpoint, (req, res) => {
        if (!req.body) {
            console.error("Received NO body JSON");
            res.send(ConfigurationService.Instance.getConfigurationJson());
        } else {
            ConfigurationService.Instance.updateConfiguration(this.channelMediaCollection, req.body).then(() => {
              res.send(ConfigurationService.Instance.getConfigurationJson());
            });
        }
    });
    
    this.app.get(APIService.configurationEndpoint, (req, res) => {
      res.send(ConfigurationService.Instance.getConfigurationJson());
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
    const cloudService = new CloudService(); // TODO: Here can add more drives (FROM A FILE OR SOMETHING LIKE THAT)!!!

    this.app.get(APIService.cloudEndpointList.getDrivesList, (req, res) => {
      res.send({driveList: cloudService.getDrivesList()});
    });

    // body: drive, folderPath
    this.app.post(APIService.cloudEndpointList.getFolderContent, (req, res) => { // TODO: NEW ENDPOINT
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.getFolderContent(req.body.drive, req.body.folderPath).then(() => res.send({isUpdated: true}));
      }
    });

    // body: path
    this.app.post(APIService.cloudEndpointList.createFolder, (req, res) => { // TODO: ENDPOINT MODIFIED
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.createFolder(req.body.path).then(() => res.send({isUpdated: true}));
      }
    });

    // body: path
    this.app.post(APIService.cloudEndpointList.createBlankFile, (req, res) => { // TODO: ENDPOINT MODIFIED
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.createBlankFile(req.body.path).then(() => res.send({isUpdated: true}));
      }
    });

    // body: oldPath, newPath
    this.app.post(APIService.cloudEndpointList.moveItem, (req, res) => { // TODO: ENDPOINT MODIFIED
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.moveFileOrFolder(req.body.oldPath, req.body.newPath).then((message) => res.send({ message }));
      }
    });

    // body: oldPath, newPath
    this.app.post(APIService.cloudEndpointList.renameItem, (req, res) => { // TODO: ENDPOINT MODIFIED
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        cloudService.renameFileOrFolder(req.body.oldPath, req.body.newPath).then((message) => res.send({ message }));
      }
    });

    // body: req.body.pathToSave, req.body.numberOfFiles, req.file
    this.app.post(APIService.cloudEndpointList.uploadFile, upload.single('file'), (req, res) => { // TODO: ENDPOINT MODIFIED
      if (!req.body || !req.file) {
          console.error("Received NO body text");
      } else {
        const allFiles: Express.Multer.File = <Express.Multer.File> req.file;
        cloudService.uploadFile(allFiles.path, `${req.body.pathToSave.substring(1)}/${allFiles.originalname}`).then(message => {
          res.send({ message: 'All files are saved!' });
          });
      }
    });

    // body: req.body.nameDrive, req.body.folderPath, req.body.searchTokken
    this.app.post(APIService.cloudEndpointList.searchInFolder, (req, res) => { // TODO: NEW ENDPOINT
      if (!req.body) {
          console.error("Received NO body text");
      } else {
        const search = cloudService.searchCloudItemInDirectory(req.body.nameDrive, req.body.folderPath, req.body.searchTokken);
        res.send({ search });
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
          options.root = cloudService.getPathDrive(req.body.drive);
        }
        
        const fileRelativePath = (<string> req.body.path).split('/').slice(2).join('/'); // Remove '', and 'drive'.
        
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
}
