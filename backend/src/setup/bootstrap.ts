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
import { FcmNotificationService }      from '../API/fcmNotification.service';
import { SupabaseNotificationService } from '../API/supabaseNotification.service';
import { BookmarkService }        from '../API/bookmark.service';
import { Logger }                 from '../logger';
import { MediaRSSAutoupdate }     from '../processAutoupdate/mediaRSSAutoupdate';
import { WebSocketsServerService } from '../webSockets/webSocketsServer.service';
import { AemetService }           from '../API/aemet.service';
import { GoogleDriveService }     from '../API/googleDrive.service';

export const bootstrapApp = (): void => {
  readFile('keys.json', (err, data) => {
    if (err) throw err;
    const keyData = JSON.parse(data.toString());
    new Logger(!!keyData.is_dev_mode_enabled);

    readAllConfigurationsFiles().then(configData => {
      new ConfigurationService(configData);
      const emailData = extractEmailData(keyData);
      new MailService(emailData);
      new FcmNotificationService();
      new SupabaseNotificationService(
        keyData.supabase_url         || '',
        keyData.supabase_service_key || '',
      );

      BookmarkService.parseFromOldBookmarks().then(() => {
        if (!keyData.is_backup_disabled) {
          startBackupEveryWeek(
            ConfigurationService.Instance.backupUrls,
            keyData.backup_password || 'admin',
          );
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

        // Always instantiate so weather browser endpoints work even without Telegram.
        new AemetService(keyData?.connect_to_telegram ? bot.sendMessageToTelegram : undefined);

        // Initialise the Drive service after TelegramBot so it can send a
        // notification if the OAuth refresh token has expired (invalid_grant).
        new GoogleDriveService(
          keyData.google_drive_client_id      || '',
          keyData.google_drive_client_secret  || '',
          keyData.google_drive_refresh_token  || '',
          keyData.google_drive_folder_id,
          keyData?.connect_to_telegram ? bot.sendMessageToTelegram : undefined,
        );

        console.log('> The bot is ready.');
      });
    });
  });
};
