import { readFile, writeFileSync } from 'fs';
import { APIService, ChannelMediaRSSCollection, ConfigurationService, getAllMessageCommands, TelegramBotCommand } from './API';
import { BlogRSSMessageList } from './blogRSS';
import { MastodonRSSMessageList } from './mastodonRSS/mastodonRSSMessageList';
import { NitterRSSMessageList } from './nitterRSS';
import { NewsRSSMessageList } from './blogRSS/newsRSSMessageList';
import { TelegramBot } from './telegramBot/telegramBot';
import { YoutubeRSSMessageList } from './youtubeRSS';
import { startBackupEveryWeek } from './utils';
import { readAllConfigurationsFiles } from './API/configuration.service';
import { ChannelMediaRSSCollectionExport } from './API/messagesRSS.service';
import { extractEmailData } from './API/email-data/email-data.interface';
import { MailService } from './API/mail.service';
import { BookmarkService } from './API/bookmark.service';
import { Logger } from './logger';
import { MediaRSSAutoupdate } from './processAutoupdate/mediaRSSAutoupdate';
import { WebSocketsServerService } from './webSockets/webSocketsServer.service';

const keysPath = 'keys.json';

let channelMediaCollection: ChannelMediaRSSCollection;
let apiService: APIService;

// TODO: Add configuration.json to README.md (update README.md with all the details).

readFile(keysPath, (err, data) => {
    if (err) throw err;
    const keyData = JSON.parse(<string> <any> data);
    const logger = new Logger(!!keyData.is_dev_mode_enabled);

    readAllConfigurationsFiles().then(data => {
        const configurationService = new ConfigurationService(data);

        const emailData = extractEmailData(keyData);
        const emailService = new MailService(emailData);

        BookmarkService.parseFromOldBookmarks().then(() => { // TODO: LÍNEA A ELIMINAR CUANDO YA ESTÉN PARSEADOS EN PROD
          if (!keyData.is_backup_disabled) {
            startBackupEveryWeek(ConfigurationService.Instance.backupUrls);
          } else {
            Logger.logInDevMode('BACKUP DISABLED!!');
          }
  
          channelMediaCollection = {
              nitterRSS: new NitterRSSMessageList(),
              mastodonRSS: new MastodonRSSMessageList(),
              blogRSS: new BlogRSSMessageList(),
              newsRSS: new NewsRSSMessageList(),
              youtubeRSS: new YoutubeRSSMessageList()
          };
  
          const channelMediaRSSCollectionExport = new ChannelMediaRSSCollectionExport(channelMediaCollection);
  
          const webSocket = new WebSocketsServerService();
          const bot = new TelegramBot(keyData);
          const commands: TelegramBotCommand = getAllMessageCommands(channelMediaCollection);
          bot.start(commands);
          const mediaAutoUpdate = new MediaRSSAutoupdate(commands);
          apiService = new APIService(channelMediaCollection, commands);
          
          console.log("> The bot is ready.");
        });
    });
});

const debugTweetsInFile = () => {
    // const strAllRss: string = JSON.stringify(nitterRSS.allMessages, null, 2); // TODO: COMMENT THIS, ONLY FOR DEBUG.
    // writeFileSync('allRss.json', strAllRss); // TODO: COMMENT THIS, ONLY FOR DEBUG.

    // console.log(`allTuits: ${numberOfResponses} vs messages: ${accTweets.length}`);
};
