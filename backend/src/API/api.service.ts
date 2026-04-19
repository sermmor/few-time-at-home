import express, {Express, Request, Response} from 'express';
import { QuoteListUtilities } from '../quote/quoteList';
import { TelegramBot } from '../telegramBot/telegramBot';
import { getUnfurl, getUnfurlWithCache, getUnfurlYoutubeImage } from '../unfurl/unfurl';
import { AlertListService } from './alertNotification.service';
import { Bookmark, BookmarkService } from './bookmark.service';
import { ConfigurationService } from './configuration.service';
import { ChannelMediaRSSCollection, TelegramBotCommand } from './messagesRSS.service';
import { NotesService } from './notes.service';
import Multer from 'multer';
import { CloudService, cloudDefaultPath } from './cloud.service';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
const ffmpegPath: string = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
import { PomodoroService } from './pomodoro.service';
import { ConvertToMP3 } from '../convertToMp3/convertToMp3';
import { SynchronizeService } from './synchronize.service';
import { PlaylistExportService } from './playlistExport.service';
import { ReadLaterMessagesRSS } from './readLaterMessagesRSS.service';
import { discoverUpnpServers, browseUpnpServer } from './upnp.service';
import * as http from 'http';
import * as https from 'https';
import { MediaRSSAutoupdate, MediaType } from '../processAutoupdate/mediaRSSAutoupdate';
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
  static getRssMastoEndpoint  = "/rss/mastodon"; // query: http://localhost:${port}/mastodon/all?amount=20
  static getRssBlogEndpoint  = "/rss/blog";
  static getRssNewsEndpoint  = "/rss/news";
  static getRssYoutubeEndpoint  = "/rss/youtube";
  static getRssFavoritesEndpoint  = "/rss/favorites";
  static getRssForceUpdateEndpoint = "/rss/force-update";
  static readLaterRSSEndpoint = {
    getMessages: "/readLaterRSS/get-messages",
    getRandomMessages: "/readLaterRSS/get-random-messages",
    addMessages: "/readLaterRSS/add-messages",
    removeMessages: "/readLaterRSS/remove-messages",
  }
  static configurationEndpoint = "/configuration";
  static configurationTypeEndpoint = "/configuration/type";
  static configurationListByTypeEndpoint = "/configuration/type/list";
  static configurationLaunchCommandEndpoint = "/configuration/launch-command";
  static notesEndpoint = "/notes";
  static pomodoroEndpoint = "/pomodoro";
  static alertsEndpoint = "/alerts";
  static alertIsReadyEndpoint = "/alerts-is-ready";
  static bookmarksEndpoint = {
    getPathList: "/bookmarks/path",
    getTrashList: "/bookmarks/trash",
    search: "/bookmarks/search",
    searchInTrash: "/bookmarks/search-in-trash",
    addBookmark: "/bookmarks/add-bookmark",
    addFolder: "/bookmarks/add-folder",
    removeBookmark: "/bookmarks/remove-bookmark",
    removeFolder: "/bookmarks/remove-folder",
    removeInTrash: "/bookmarks/remove-in-trash",
    editBookmark: "/bookmarks/edit-bookmark",
    editFolder: "/bookmarks/edit-folder",
    move: "/bookmarks/move",
  };
  static quoteEndpoint = "/random-quote";
  static unfurlEndpoint = "/unfurl";
  static unfurlYoutubeImageEndpoint = "/unfurl-youtube-image";
  static sendToTelegramEndpoint = "/send-to-telegram";
  static sendFileToTelegramEndpoint = "/send-file-to-telegram";
  static videoToMp3ConverterEndpoint = "/video-to-mp3-converter";
  static audioToMp3ConverterEndpoint = "/audio-to-mp3-converter";
  static stillConverterEndpoint = "/still-converter";
  static backgroundImageEndpoint = "/background";
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
    streamFile: '/cloud/stream-file',
    searchInFolder: '/cloud/search-in-folder',
    searchInFolderDeep: '/cloud/search-in-folder-deep',
    deleteFileOrFolder: '/cloud/delete',
    zipFolder: '/cloud/zip-folder',
  };
  static synchronize = {
    export:         '/synchronize/export',    // GET  — server packages data/ as zip
    clientDownload: '/synchronize/download',  // POST — client fetches from remote URL
  }
  static playlist = {
    youtubeOAuthStart:    '/playlist/oauth/youtube/start',
    youtubeOAuthCallback: '/playlist/oauth/youtube/callback',
    spotifyOAuthStart:    '/playlist/oauth/spotify/start',
    spotifyOAuthCallback: '/playlist/oauth/spotify/callback',
    create:               '/playlist/create',
  }
  static networkEndpointList = {
    discover: '/network/upnp-discover',
    browse:   '/network/upnp-browse',
    stream:   '/network/upnp-stream',
  };

  app: Express;

  constructor(
    private keyData: any,
    private channelMediaCollection: ChannelMediaRSSCollection,
    private commands: TelegramBotCommand,
  ) {
    this.app = express();
    this.app.use(express.json())
    this.app.use(cors());

    this.getRSS(APIService.getRssMastoEndpoint, 'mastodon');
    this.getRSS(APIService.getRssBlogEndpoint, 'blog');
    this.getRSS(APIService.getRssNewsEndpoint, 'news');
    this.getRSS(APIService.getRssYoutubeEndpoint, 'youtube');
    this.getReadLaterRSSService();
    this.getFavoritesRSSService();
    this.forceUpdateRSS();
    this.unfurlService();
    this.unfurlYoutubeImageService();
    this.configurationService();
    this.getRandomQuoteService();
    this.notesService();
    this.pomodoroService();
    this.alertsService();
    this.bookmarksService();
    this.notepadService();
    this.converterToMp3Service();
    this.backgroundImageService();
    this.cloudService();
    this.synchronizeService();
    this.playlistExportService();
    this.upnpNetworkService();

    this.app.listen(ConfigurationService.Instance.apiPort, () => {
        console.log("> Server ready!");
    });
  }

  getRSS = (endpoint: string, type: MediaType) => {
    this.app.get(endpoint, (req, res) => {
      const tag = (endpoint === APIService.getRssYoutubeEndpoint) ? req.query.tag as string : '';
      MediaRSSAutoupdate.getMediaFileContent(type, tag).then(messagesToSend => {
        const webNumberOfMessagesWithLinks: number = req.query.amount ? +req.query.amount : 0;
        if (messagesToSend.length <= webNumberOfMessagesWithLinks) {
          res.send({ messages: messagesToSend });
        } else {
          res.send({ messages: messagesToSend.slice(messagesToSend.length - webNumberOfMessagesWithLinks)});
        }
      });
    });
  }

  private getReadLaterRSSService() {
    this.app.post(APIService.readLaterRSSEndpoint.getMessages, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        ReadLaterMessagesRSS.getMessagesRSSSaved(req.body.amount).then(data => {
          res.send({ data });
        });
      }
    });
    this.app.post(APIService.readLaterRSSEndpoint.getRandomMessages, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        ReadLaterMessagesRSS.getRandomMessagesRSSSaved(req.body.amount).then(data => {
          res.send({ data });
        });
      }
    });
    this.app.post(APIService.readLaterRSSEndpoint.addMessages, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        ReadLaterMessagesRSS.addMessageRSSToSavedList(req.body.message).then(data => {
          res.send({ data });
        });
      }
    });
    this.app.post(APIService.readLaterRSSEndpoint.removeMessages, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        ReadLaterMessagesRSS.removeMessageRSSFromSavedList(req.body.id).then(() => {
          res.send({ response: 'OK' });
        });
      }
    });
  }

  private getFavoritesRSSService() {
    this.app.get(APIService.getRssFavoritesEndpoint, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        MediaRSSAutoupdate.getFavoritesYoutubeFileContent(req.query.amount ? +req.query.amount : 0).then(data => {
          res.send({ messages: data });
        });
      }
    });
  }

  private forceUpdateRSS() {
    this.app.get(APIService.getRssForceUpdateEndpoint, (req, res) => {
      MediaRSSAutoupdate.instance.update(true).then(() => {
        res.send({ response: 'OK' });
      }).catch(err => {
        console.error("Error during force update RSS:", err);
        res.status(500).send({ error: 'Failed to force update RSS' });
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
    alerts.getAlerts(TelegramBot.Instance().sendMessageToTelegram);
    this.app.post(APIService.alertsEndpoint, (req, res) => {
        if (!req.body) {
            console.error("Received NO body text");
        } else {
          AlertListService.Instance.updateAlerts(
            AlertListService.Instance.parseStringsListToAlertList(req.body.alerts),
            TelegramBot.Instance().sendMessageToTelegram
          )
            .then(data => res.send({alerts: AlertListService.Instance.parseAlertListToStringList(data)}));
        }
    });

    this.app.get(APIService.alertsEndpoint, (req, res) => {
      AlertListService.Instance.getAlerts(TelegramBot.Instance().sendMessageToTelegram).then(
        data => res.send({alerts: AlertListService.Instance.parseAlertListToStringList(data)}));
    });

    this.app.get(APIService.alertIsReadyEndpoint, (req, res) => {
      res.send({isAlertReady: TelegramBot.IsBotReady()});
    });
  }

  private bookmarksService() {
    const bookmark = new BookmarkService();
    bookmark.getBookmarks();
    
    this.app.post(APIService.bookmarksEndpoint.getPathList, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.getBookmarks(req.body.path).then(data => {
          res.send({ data });
        });
      }
    });

    this.app.post(APIService.bookmarksEndpoint.getTrashList, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.getBookmarkInTrash(req.body.bookmarksByPage, req.body.currentPage).then(data => {
          res.send({ ...data });
        });
      }
    });

    this.app.post(APIService.bookmarksEndpoint.search, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.searchInBookmark(req.body.data).then(data => res.send({ data }));
      }
    });

    this.app.post(APIService.bookmarksEndpoint.searchInTrash, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.searchInTrash(req.body.data).then(data => res.send({ data }));
      }
    });

    this.app.post(APIService.bookmarksEndpoint.addBookmark, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.addBookmark(req.body.url, req.body.path, req.body.title).then(data => {
          res.send({ data });
        });
      }
    });

    this.app.post(APIService.bookmarksEndpoint.addFolder, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.addFolder(req.body.path).then(data => {
          res.send({ data });
        });
      }
    });

    this.app.post(APIService.bookmarksEndpoint.removeBookmark, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.removeBookmark(req.body.path, req.body.url).then(data => {
          res.send({ data });
        });
      }
    });

    this.app.post(APIService.bookmarksEndpoint.removeFolder, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.removeFolder(req.body.path).then(data => {
          res.send({ data });
        });
      }
    });

    this.app.post(APIService.bookmarksEndpoint.removeInTrash, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.removeBookmarkInTrash(req.body.url).then(data => {
          res.send({ data });
        });
      }
    });

    this.app.post(APIService.bookmarksEndpoint.editBookmark, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.editBookmark(req.body.path, req.body.oldBookmark, req.body.newBookmark).then(data => {
          res.send({ data });
        });
      }
    });

    this.app.post(APIService.bookmarksEndpoint.editFolder, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.editFolder(req.body.oldPath, req.body.newPath).then(data => {
          res.send({ data });
        });
      }
    });

    this.app.post(APIService.bookmarksEndpoint.move, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
      } else {
        BookmarkService.Instance.moveBookmarksAndFolders(req.body.toMove, req.body.oldPath, req.body.newPath).then(data => {
          res.send({ data });
        });
      }
    });
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
          getUnfurlWithCache(req.body.urlList as string[], +req.body.loadTime).then(content => res.send({data: content}));    
      }
    });
  }

  private unfurlYoutubeImageService() {
    this.app.post(APIService.unfurlYoutubeImageEndpoint, (req, res) => {
      if (!req.body) {
          console.error("Received NO body text");
          res.send({imageBuffer: undefined});
      } else {
          getUnfurlYoutubeImage(req.body.youtubeUrl as string, req.body.indexItem as number).then(content => res.send({imageBuffer: content}));    
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

    this.app.post(APIService.sendFileToTelegramEndpoint, upload.single('file'), (req, res) => {
      if (!req.file) {
        console.error("No file received");
        res.send({ isSended: false });
        return;
      }
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      TelegramBot.Instance().sendDocumentToTelegram(req.file.path, originalName).then(isSended => {
        res.send({ isSended });
      });
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
        // Node's multipart parser (busboy/multer) reads field values and filenames as
        // latin1 by default, even though browsers send them as UTF-8.  Re-encoding via
        // Buffer fixes accented/non-ASCII characters (e.g. "Éste" → correct UTF-8).
        const originalName = Buffer.from(allFiles.originalname, 'latin1').toString('utf8');
        const folderPath   = Buffer.from(req.body.folderPathToSave, 'latin1').toString('utf8');
        cloudService.uploadFile(allFiles.path, `${folderPath}/${originalName}`).then(message => {
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

    // body: req.body.nameDrive, req.body.folderPath, req.body.searchTokken — deep recursive search with 30s timeout
    this.app.post(APIService.cloudEndpointList.searchInFolderDeep, (req, res) => {
      if (!req.body) {
        console.error("Received NO body text");
        return;
      }
      const cancelled = { value: false };
      const timeout = setTimeout(() => { cancelled.value = true; }, 30000);
      cloudService.searchCloudItemInDirectoryDeep(req.body.nameDrive, req.body.folderPath, req.body.searchTokken, cancelled)
        .then(search => {
          clearTimeout(timeout);
          res.send({ search, timedOut: cancelled.value });
        })
        .catch(_err => {
          clearTimeout(timeout);
          res.send({ search: [], timedOut: false });
        });
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

    // query params: drive, path
    // Streaming endpoint for the video/audio player (and any inline viewing).
    // NO Content-Disposition header so the browser treats the response as an inline
    // resource. Express's res.sendFile() automatically handles HTTP Range requests,
    // which allows the <video>/<audio> element to seek and buffer efficiently.
    // WMA files are not natively supported by browsers, so they are transcoded to
    // MP3 on-the-fly via ffmpeg and piped directly to the response.
    this.app.get(APIService.cloudEndpointList.streamFile, (req, res) => {
      const drive = req.query.drive as string;
      const filePath = req.query.path as string;

      if (!drive || !filePath) {
        res.status(400).send({ error: 'Missing drive or path query parameter' });
        return;
      }

      const root = `${ConfigurationService.Instance.cloudRootPath}/${cloudService.getPathDrive(drive)}`;
      const fileRelativePath = filePath.split('/').slice(1).join('/');
      const absoluteFilePath = path.join(root, fileRelativePath);

      // Transcode WMA (and any other browser-unsupported format) to MP3 on the fly.
      if (fileRelativePath.toLowerCase().endsWith('.wma')) {
        res.setHeader('Content-Type', 'audio/mpeg');
        ffmpeg(absoluteFilePath)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioBitrate('192k')
          .format('mp3')
          .on('error', (err) => {
            console.error(`WMA transcode error: ${err.message}`);
            if (!res.headersSent) {
              res.status(500).send({ error: 'Transcoding failed' });
            }
          })
          .on('end', () => {
            console.log(`Transcoded and streamed: ${fileRelativePath}`);
          })
          .pipe(res as any, { end: true });
        return;
      }

      const options: { root: string } = { root };

      res.sendFile(fileRelativePath, options, (err) => {
        if (err) {
          console.error(`Error streaming file: ${err}`);
        } else {
          console.log(`Streamed: ${fileRelativePath}`);
        }
      });
    });

    // query params: drive, path
    // Native GET endpoint so the browser handles the download itself and shows real progress
    // in its Downloads panel. Content-Disposition: attachment ensures the browser downloads
    // the file instead of trying to navigate to it.
    this.app.get(APIService.cloudEndpointList.downloadFile, (req, res) => {
      const drive = req.query.drive as string;
      const filePath = req.query.path as string;

      if (!drive || !filePath) {
        res.status(400).send({ error: 'Missing drive or path query parameter' });
        return;
      }

      const options: { root: string } = {
        root: `${ConfigurationService.Instance.cloudRootPath}/${cloudService.getPathDrive(drive)}`,
      };

      const fileRelativePath = filePath.split('/').slice(1).join('/'); // Remove drive prefix.
      const fileName = filePath.split('/').pop() || 'download';

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(fileRelativePath, options, (err) => {
        if (err) {
          console.error(`Error sending file (GET download): ${err}`);
        } else {
          console.log(`Sent (GET): ${fileRelativePath}`);
        }
      });
    });
  }

  private synchronizeService = () => {
    const synchronizeService = new SynchronizeService();

    // GET /synchronize/export — server packages data/ (excl. uploads/) as a zip and sends it
    this.app.get(APIService.synchronize.export, async (_req, res) => {
      try {
        await synchronizeService.exportDataAsZip(res);
      } catch (err) {
        console.error('[Sync] Export error:', err);
        if (!res.headersSent) res.status(500).send({ message: 'Export failed.' });
      }
    });

    // POST /synchronize/download — client downloads from a remote URL and applies data locally
    this.app.post(APIService.synchronize.clientDownload, (req, res) => {
      if (!req.body?.url) {
        res.status(400).send({ message: 'Missing url field in request body.' });
        return;
      }
      synchronizeService.clientDownloadFromUrl(req.body.url)
        .then(() => {
          console.log('[Sync] Synchronization complete.');
          res.send({ message: '✅ Sincronización completada.' });
        })
        .catch((err: any) => {
          console.error('[Sync] Download error:', err);
          res.status(500).send({ message: `❌ Error al sincronizar: ${err.message}` });
        });
    });
  }

  private backgroundImageService() {
    const cloudService = new CloudService();

    this.app.get(APIService.backgroundImageEndpoint, (req, res) => {
      cloudService.getBackgroundImageFileName().then(backgroundFileName => {
        if (backgroundFileName) {
          const cloudFolderPath = `${ConfigurationService.Instance.cloudRootPath}/cloud/${backgroundFileName}`;
          res.sendFile(cloudFolderPath, (err) => {
            if (err) {
              console.error(`Error sending background image: ${err}`);
              res.status(404).send({ error: 'Background image not found' });
            } else {
              console.log(`Sent background image: ${backgroundFileName}`);
            }
          });
        } else {
          res.status(404).send({ error: 'No background image found' });
        }
      });
    });
  }

  private playlistExportService() {
    const port = ConfigurationService.Instance.apiPort;
    const svc  = new PlaylistExportService(
      this.keyData?.youtube_playlist_client_id     ?? '',
      this.keyData?.youtube_playlist_client_secret ?? '',
      this.keyData?.spotify_playlist_client_id     ?? '',
      this.keyData?.spotify_playlist_client_secret ?? '',
      port,
    );

    // ── YouTube OAuth ────────────────────────────────────────────────────────

    this.app.get(APIService.playlist.youtubeOAuthStart, (_req, res) => {
      if (!svc.isConfigured('youtube')) {
        res.status(503).send(svc.makeCallbackHtml('youtube', '', 'youtube_playlist_client_id / secret no configurados en keys.json'));
        return;
      }
      res.redirect(svc.getYoutubeAuthUrl());
    });

    this.app.get(APIService.playlist.youtubeOAuthCallback, async (req, res) => {
      const { code, error } = req.query as Record<string, string>;
      if (error || !code) {
        res.send(svc.makeCallbackHtml('youtube', '', error ?? 'No se recibió código de autorización'));
        return;
      }
      try {
        const token = await svc.exchangeYoutubeCode(code);
        res.send(svc.makeCallbackHtml('youtube', token));
      } catch (e: any) {
        res.send(svc.makeCallbackHtml('youtube', '', e.message));
      }
    });

    // ── Spotify OAuth ────────────────────────────────────────────────────────

    this.app.get(APIService.playlist.spotifyOAuthStart, (_req, res) => {
      if (!svc.isConfigured('spotify')) {
        res.status(503).send(svc.makeCallbackHtml('spotify', '', 'spotify_playlist_client_id / secret no configurados en keys.json'));
        return;
      }
      res.redirect(svc.getSpotifyAuthUrl());
    });

    this.app.get(APIService.playlist.spotifyOAuthCallback, async (req, res) => {
      const { code, error } = req.query as Record<string, string>;
      if (error || !code) {
        res.send(svc.makeCallbackHtml('spotify', '', error ?? 'No se recibió código de autorización'));
        return;
      }
      try {
        const token = await svc.exchangeSpotifyCode(code);
        res.send(svc.makeCallbackHtml('spotify', token));
      } catch (e: any) {
        res.send(svc.makeCallbackHtml('spotify', '', e.message));
      }
    });

    // ── Playlist creation ────────────────────────────────────────────────────

    this.app.post(APIService.playlist.create, async (req, res) => {
      const { platform, name, description, songs, token } = req.body ?? {};
      if (!platform || !name || !Array.isArray(songs) || !token) {
        res.status(400).send({ message: 'Faltan campos: platform, name, songs, token' });
        return;
      }
      try {
        const result = platform === 'youtube'
          ? await svc.createYoutubePlaylist(token, name, description ?? '', songs)
          : await svc.createSpotifyPlaylist(token, name, description ?? '', songs);
        res.send(result);
      } catch (e: any) {
        console.error('[Playlist] Creation error:', e.message);
        res.status(500).send({ message: e.message });
      }
    });
  }

  private upnpNetworkService() {
    // GET /network/upnp-discover  — SSDP search, 4-second window
    this.app.get(APIService.networkEndpointList.discover, async (_req: Request, res: Response) => {
      try {
        const servers = await discoverUpnpServers(4000);
        res.send({ servers });
      } catch (err) {
        console.error('UPnP discover error:', err);
        res.status(500).send({ servers: [] });
      }
    });

    // POST /network/upnp-browse  — body: { controlUrl, objectId }
    this.app.post(APIService.networkEndpointList.browse, async (req: Request, res: Response) => {
      if (!req.body?.controlUrl) {
        res.status(400).send({ error: 'Missing controlUrl' });
        return;
      }
      try {
        const result = await browseUpnpServer(req.body.controlUrl, req.body.objectId ?? '0');
        res.send(result);
      } catch (err) {
        console.error('UPnP browse error:', err);
        res.status(500).send({ containers: [], items: [] });
      }
    });

    // GET /network/upnp-stream?url=<encoded>  — HTTP proxy with Range pass-through.
    // Uses native http/https (not node-fetch) for reliable video streaming:
    // correct Range/206 handling, client-disconnect abort, no pipe crashes.
    this.app.get(APIService.networkEndpointList.stream, (req: Request, res: Response) => {
      // Express already URL-decodes query params — no need to call decodeURIComponent.
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        res.status(400).send({ error: 'Missing url parameter' });
        return;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        res.status(400).send({ error: 'Invalid url parameter' });
        return;
      }

      console.log(`[UPnP Stream] → ${targetUrl}${req.headers.range ? '  Range: ' + req.headers.range : ''}`);

      const lib = parsedUrl.protocol === 'https:' ? https : http;

      const upstreamOptions: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          ...(req.headers.range ? { Range: req.headers.range } : {}),
          'User-Agent': 'Node.js/UPnP-Proxy',
          'Connection': 'keep-alive',
        },
      };

      const upstreamReq = lib.request(upstreamOptions, (upstreamRes) => {
        console.log(`[UPnP Stream] ← ${upstreamRes.statusCode}  ct=${upstreamRes.headers['content-type']}  len=${upstreamRes.headers['content-length']}`);

        res.status(upstreamRes.statusCode || 200);

        const passHeaders = [
          'content-type', 'content-length', 'content-range',
          'accept-ranges', 'transfer-encoding',
        ];
        passHeaders.forEach(h => {
          const v = upstreamRes.headers[h];
          if (v) res.setHeader(h, v as string);
        });
        // Ensure the browser knows seeking is possible even if upstream omits this header.
        if (!upstreamRes.headers['accept-ranges']) {
          res.setHeader('Accept-Ranges', 'bytes');
        }

        upstreamRes.pipe(res);

        upstreamRes.on('error', (err) => {
          console.error('[UPnP Stream] upstream response error:', err.message);
        });
      });

      upstreamReq.on('error', (err) => {
        console.error(`[UPnP Stream] request error for ${targetUrl}: ${err.message}`);
        if (!res.headersSent) res.status(502).send({ error: err.message });
      });

      // When the browser aborts (e.g. seeking), destroy the upstream to free the connection.
      req.on('close', () => upstreamReq.destroy());

      upstreamReq.end();
    });
  }
}
