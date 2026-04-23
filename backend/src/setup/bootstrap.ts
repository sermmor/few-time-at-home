import { readFile } from 'fs';
import {
  APIService,
  ChannelMediaRSSCollection,
  ConfigurationService,
  getAllMessageCommands,
  TelegramBotCommand,
} from '../API';
import { BlogRSSMessageList }    from '../blogRSS';
import { MastodonRSSMessageList } from '../mastodonRSS/mastodonRSSMessageList';
import { NewsRSSMessageList }     from '../blogRSS/newsRSSMessageList';
import { TelegramBot }            from '../telegramBot/telegramBot';
import { YoutubeRSSMessageList }  from '../youtubeRSS';
import { startBackupEveryWeek }   from '../utils';
import { readAllConfigurationsFiles } from '../API/configuration.service';
import { ChannelMediaRSSCollectionExport } from '../API/messagesRSS.service';
import { extractEmailData }       from '../API/email-data/email-data.interface';
import { MailService }            from '../API/mail.service';
import { BookmarkService }        from '../API/bookmark.service';
import { Logger }                 from '../logger';
import { MediaRSSAutoupdate }     from '../processAutoupdate/mediaRSSAutoupdate';
import { WebSocketsServerService } from '../webSockets/webSocketsServer.service';
import { AemetService }           from '../API/aemet.service';

export const bootstrapApp = (): void => {
  readFile('keys.json', (err, data) => {
    if (err) throw err;
    const keyData = JSON.parse(data.toString());
    new Logger(!!keyData.is_dev_mode_enabled);

    readAllConfigurationsFiles().then(configData => {
      new ConfigurationService(configData);
      const emailData = extractEmailData(keyData);
      new MailService(emailData);

      BookmarkService.parseFromOldBookmarks().then(() => {
        if (!keyData.is_backup_disabled) {
          startBackupEveryWeek(ConfigurationService.Instance.backupUrls);
        } else {
          Logger.logInDevMode('BACKUP DISABLED!!');
        }

        const channelMediaCollection: ChannelMediaRSSCollection = {
          mastodonRSS: new MastodonRSSMessageList(),
          blogRSS:     new BlogRSSMessageList(),
          newsRSS:     new NewsRSSMessageList(),
          youtubeRSS:  new YoutubeRSSMessageList(),
        };

        new ChannelMediaRSSCollectionExport(channelMediaCollection);
        new WebSocketsServerService();

        const bot      = new TelegramBot(keyData);
        const commands: TelegramBotCommand = getAllMessageCommands(channelMediaCollection);
        bot.start(commands);
        new MediaRSSAutoupdate(commands);
        new APIService(keyData, channelMediaCollection, commands);

        if (keyData?.connect_to_telegram) {
          new AemetService(bot.sendMessageToTelegram);
        }

        console.log('> The bot is ready.');
      });
    });
  });
};
