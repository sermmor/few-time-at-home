import { mkdirSync, writeFileSync, existsSync } from 'fs';

export interface SetupWizardData {
  cloudRootPath:      string;
  connectToTelegram:  boolean;
  telegramBotToken:   string;
  telegramUsername:   string;
  telegramTokenPass:  string;
}

const ensureDir = (dir: string) => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const writeJson = (path: string, data: any) =>
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');

export const createSetupFiles = (data: SetupWizardData): void => {
  // ── Carpetas ────────────────────────────────────────────────────────────────
  ensureDir('data');
  ensureDir('data/config');
  ensureDir('data/bookmarks');
  ensureDir('data/cache');

  // ── keys.json ───────────────────────────────────────────────────────────────
  writeJson('keys.json', {
    telegram_bot_token:           data.telegramBotToken  || '',
    username_client:              data.telegramUsername  || '',
    token_pass:                   data.telegramTokenPass || '',
    connect_to_telegram:          data.connectToTelegram,
    email_service:                'Gmail',
    email_user:                   '',
    email_pass:                   '',
    email_prelude:                '',
    is_backup_disabled:           true,
    is_dev_mode_enabled:          false,
    youtube_playlist_client_id:   '',
    youtube_playlist_client_secret: '',
    spotify_playlist_client_id:   '',
    spotify_playlist_client_secret: '',
  });

  // ── configuration.json ──────────────────────────────────────────────────────
  writeJson('configuration.json', {
    windowsFFMPEGPath: '',
    backupUrls:        '',
    cloudRootPath:     data.cloudRootPath,
    showNitterRSSInAll: false,
    numberOfWorkers:   4,
    apiPort:           3001,
    webSocketPort:     3002,
    dialogAlphas: {
      general:               0.7,
      rssCard:               0.7,
      pomodoroEditorConfig:  0.5,
      configurationCards:    0.5,
    },
  });

  // ── data/config — ficheros requeridos (vacíos para empezar) ─────────────────
  writeJson('data/config/blogRssList.json',          []);
  writeJson('data/config/newsRSSList.json',           []);
  writeJson('data/config/mastodonRssUsersList.json',  []);
  writeJson('data/config/youtubeRssList.json',        []);
  writeJson('data/config/quoteList.json',             []);
  writeJson('data/config/rssConfig.json', {
    updateAtStartApp:                      false,
    optionTagsYoutube:                     ['null'],
    autoUpdateTimeInSeconds:               3600,
    numMaxMessagesToSave:                  100,
    initialWebNumberOfMessagesWithLinks:   5,
    normalWebNumberOfMessagesWithLinks:    3,
  });

  // ── Ficheros de datos iniciales ─────────────────────────────────────────────
  writeFileSync('data/notes.txt',        '', 'utf8');
  writeJson('data/alerts.json',            []);
  writeJson('data/birthdays.json',         []);
  // index.json y trash.json son necesarios para que BookmarkService no entre
  // en el flujo de migración del formato antiguo (isUsingOldBookmark devuelve
  // true cuando index.json no existe, lo que causa el crash).
  writeJson('data/bookmarks/index.json',   []);
  writeJson('data/bookmarks/trash.json',   []);

  console.log('> Setup files created successfully.');
};
