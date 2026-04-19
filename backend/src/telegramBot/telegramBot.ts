/**
 * TelegramBot — modern inline-keyboard menu bot.
 *
 * The only text command is  /login <password>.
 * Everything else is driven by inline-keyboard menus and a simple
 * state machine that tracks what input the bot is currently waiting for.
 *
 * Menu hierarchy
 * ──────────────
 *   🏠 Main menu
 *     📰 RSS ──► source (Mastodon | Blog | YouTube | News | ⭐ Favs YT)
 *                  └─► amount (5 | 10 | 20 | 50)
 *     📝 Notas   ──► Ver notas  |  Añadir nota (→ text input)
 *     🔖 Marcadores ──► Añadir (→ URL input) | Buscar (→ text input)
 *     💾 Guardados  ──► Ver guardados | Añadir (→ URL input)
 *     ☁️ Cloud ──► 📂 Explorar (paginated, clickable) | 🔍 Buscar deep (→ text, paginated)
 *                    📦 Bajar carpeta (with size guard) | ⬆️ Subir nivel
 *     🔔 Alertas ──► Añadir → 📅 calendar → ⏰ hour grid → ⏱ minute grid → ✏️ message
 *
 * Cloud navigation
 * ────────────────
 *   - Folders are displayed as inline-keyboard buttons; tapping one navigates into it.
 *   - Files are displayed as buttons; tapping one downloads the file (size-checked first).
 *   - Listings are paginated (CLOUD_PAGE_SIZE items per page, Prev/Next buttons).
 *   - Search uses deep recursive scan (searchCloudItemInDirectoryDeep).
 *   - Before any file is sent, its size is checked; files > 50 MB are rejected with a
 *     clear message showing the file size and the 50 MB limit.
 */

import Telegraf, { Markup } from "telegraf";
import { TelegrafContext } from "telegraf/typings/context";
import { AlertListService } from "../API/alertNotification.service";
import { BookmarkService } from "../API/bookmark.service";
import { TelegramBotCommand } from "../API/messagesRSS.service";
import { NotesService } from "../API/notes.service";
import { extractTelegramData, TelegramData } from "./telegramData";
import { CloudItem, CloudService, cloudDefaultPath } from "../API/cloud.service";
import { createWriteStream, existsSync, mkdir, createReadStream, unlink, stat } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { MediaRSSAutoupdate } from "../processAutoupdate/mediaRSSAutoupdate";
import { ReadLaterMessagesRSS } from "../API/readLaterMessagesRSS.service";
import { getUnfurl } from "../unfurl/unfurl";

const fetch = require("node-fetch");

// ─── Constants ────────────────────────────────────────────────────────────────

const LOGIN_COMMAND = 'login';

/** Items shown per page in directory listings and search results. */
const CLOUD_PAGE_SIZE = 6;

/**
 * Telegram Bot API limit for sendDocument: 50 MB.
 * Files larger than this will be rejected before attempting the upload.
 */
const TELEGRAM_MAX_FILE_BYTES = 50 * 1024 * 1024;

// ─── State machine ────────────────────────────────────────────────────────────

type BotState =
  | 'IDLE'
  | 'WAITING_NOTE'
  | 'WAITING_BOOKMARK_ADD'
  | 'WAITING_BOOKMARK_SEARCH'
  | 'WAITING_SAVE_URL'
  | 'WAITING_CLOUD_SEARCH'
  | 'WAITING_ALERT_MESSAGE';

// ─── Bot class ────────────────────────────────────────────────────────────────

export class TelegramBot {
  private static _instance: TelegramBot;
  private static alertEnabled: boolean;

  private telegramBotData: TelegramData;
  private bot: Telegraf<TelegrafContext> | undefined;
  private userClient: string | undefined;
  private tokenPassGetUser = '';
  private context: TelegrafContext | undefined;

  // State machine
  private state: BotState = 'IDLE';
  private pendingRssType = '';
  private pendingAlert: { date?: Date; hour?: number; minute?: number } = {};

  // Cloud navigation
  private currentCloudDir     = '/';
  private cloudCurrentItems:   CloudItem[]                          = [];  // items in current directory listing
  private cloudListPage        = 0;                                         // current page of listing
  private cloudSearchResults:  { path: string; isFolder: boolean }[] = [];  // last deep-search results
  private cloudSearchPage      = 0;                                         // current page of search results

  constructor(userData: any, telegramBotData?: TelegramData, bot?: Telegraf<TelegrafContext>) {
    TelegramBot._instance = this;
    TelegramBot.alertEnabled = false;
    this.telegramBotData = telegramBotData ?? extractTelegramData(userData);
    if (this.telegramBotData.connect_to_telegram) {
      this.userClient = this.telegramBotData.username_client;
      this.bot = bot ?? new Telegraf(this.telegramBotData.telegram_bot_token);
    }
  }

  public static Instance = (): TelegramBot => TelegramBot._instance;
  public static IsBotReady = (): boolean => TelegramBot.alertEnabled;

  // ─── Auth ──────────────────────────────────────────────────────────────────

  private setContext(ctx: TelegrafContext) {
    if (!this.context) {
      this.context = ctx;
      this.launchAlertsToTelegram();
    }
  }

  private isUserClient = (ctx: TelegrafContext): boolean => {
    const ok = ctx.from?.username === this.userClient &&
               this.telegramBotData.token_pass === this.tokenPassGetUser;
    if (ok) this.setContext(ctx);
    return ok;
  };

  // ─── Keyboard builders ─────────────────────────────────────────────────────

  private kb = {
    main: () => Markup.inlineKeyboard([
      [Markup.callbackButton('📰 RSS',            'menu_rss')],
      [Markup.callbackButton('📝 Notas',          'menu_notes')],
      [Markup.callbackButton('🔖 Marcadores',      'menu_bookmarks')],
      [Markup.callbackButton('💾 Guardados',       'menu_saved')],
      [Markup.callbackButton('☁️ Cloud',           'menu_cloud')],
      [Markup.callbackButton('🔔 Alertas',         'menu_alerts')],
    ]).extra(),

    rss: () => Markup.inlineKeyboard([
      [Markup.callbackButton('Mastodon',        'rss_masto'),
       Markup.callbackButton('Blog',            'rss_blog')],
      [Markup.callbackButton('YouTube',         'rss_youtube'),
       Markup.callbackButton('Noticias',        'rss_news')],
      [Markup.callbackButton('⭐ Favoritos YT', 'rss_favorites')],
      [Markup.callbackButton('← Volver',        'back_main')],
    ]).extra(),

    amount: (backAction: string) => Markup.inlineKeyboard([
      [Markup.callbackButton('5',  'amount_5'),
       Markup.callbackButton('10', 'amount_10'),
       Markup.callbackButton('20', 'amount_20'),
       Markup.callbackButton('50', 'amount_50')],
      [Markup.callbackButton('← Volver', backAction)],
    ]).extra(),

    notes: () => Markup.inlineKeyboard([
      [Markup.callbackButton('📋 Ver notas',   'notes_view')],
      [Markup.callbackButton('✏️ Añadir nota', 'notes_add')],
      [Markup.callbackButton('← Volver',       'back_main')],
    ]).extra(),

    bookmarks: () => Markup.inlineKeyboard([
      [Markup.callbackButton('➕ Añadir marcador',   'bm_add')],
      [Markup.callbackButton('🔍 Buscar marcadores', 'bm_search')],
      [Markup.callbackButton('← Volver',             'back_main')],
    ]).extra(),

    saved: () => Markup.inlineKeyboard([
      [Markup.callbackButton('📋 Ver guardados',  'saved_view')],
      [Markup.callbackButton('➕ Añadir URL',     'saved_add')],
      [Markup.callbackButton('← Volver',          'back_main')],
    ]).extra(),

    savedAmount: () => Markup.inlineKeyboard([
      [Markup.callbackButton('5',  'saved_amount_5'),
       Markup.callbackButton('10', 'saved_amount_10'),
       Markup.callbackButton('20', 'saved_amount_20'),
       Markup.callbackButton('50', 'saved_amount_50')],
      [Markup.callbackButton('← Volver', 'menu_saved')],
    ]).extra(),

    /** Main Cloud menu. */
    cloud: () => Markup.inlineKeyboard([
      [Markup.callbackButton('📂 Explorar directorio',  'cloud_browse')],
      [Markup.callbackButton('🔍 Buscar (profundo)',    'cloud_search'),
       Markup.callbackButton('⬆️ Subir nivel',          'cloud_up')],
      [Markup.callbackButton('📍 Path actual',          'cloud_pwd'),
       Markup.callbackButton('📦 Bajar carpeta',        'cloud_folder')],
      [Markup.callbackButton('← Volver',               'back_main')],
    ]).extra(),

    alerts: () => Markup.inlineKeyboard([
      [Markup.callbackButton('➕ Añadir alerta', 'alert_add')],
      [Markup.callbackButton('← Volver',         'back_main')],
    ]).extra(),
  };

  // ─── Cloud keyboard builders ───────────────────────────────────────────────

  /**
   * Paginated inline keyboard for a directory listing.
   * Folders show a 📁 icon and navigate on tap; files show 📄 and download on tap.
   */
  private cloudBrowseKeyboard = (items: CloudItem[], page: number): any => {
    const totalPages = Math.ceil(items.length / CLOUD_PAGE_SIZE) || 1;
    const pageItems  = items.slice(page * CLOUD_PAGE_SIZE, (page + 1) * CLOUD_PAGE_SIZE);
    const rows: any[][] = [];

    pageItems.forEach((item, i) => {
      const globalIdx  = page * CLOUD_PAGE_SIZE + i;
      const icon       = item.isFolder ? '📁' : '📄';
      const label      = item.name.length > 30 ? item.name.substring(0, 28) + '…' : item.name;
      const action     = item.isFolder
        ? `cloud_enter_${globalIdx}`
        : `cloud_dl_${globalIdx}`;
      rows.push([Markup.callbackButton(`${icon} ${label}`, action)]);
    });

    // Pagination row (only when multiple pages)
    if (totalPages > 1) {
      const pgRow: any[] = [];
      if (page > 0)               pgRow.push(Markup.callbackButton('◀ Ant.', `cloud_pg_${page - 1}`));
      pgRow.push(Markup.callbackButton(`${page + 1}/${totalPages}`, 'cal_noop'));
      if (page < totalPages - 1)  pgRow.push(Markup.callbackButton('Sig. ▶', `cloud_pg_${page + 1}`));
      rows.push(pgRow);
    }

    // Action row
    rows.push([
      Markup.callbackButton('⬆️ Subir', 'cloud_up'),
      Markup.callbackButton('🔍 Buscar', 'cloud_search'),
      Markup.callbackButton('← Cloud',  'menu_cloud'),
    ]);

    return Markup.inlineKeyboard(rows).extra();
  };

  /**
   * Paginated inline keyboard for deep-search results.
   * Files tap to download; folders tap to navigate into them.
   */
  private cloudSearchKeyboard = (results: { path: string; isFolder: boolean }[], page: number): any => {
    const totalPages = Math.ceil(results.length / CLOUD_PAGE_SIZE) || 1;
    const pageItems  = results.slice(page * CLOUD_PAGE_SIZE, (page + 1) * CLOUD_PAGE_SIZE);
    const rows: any[][] = [];

    pageItems.forEach((item, i) => {
      const globalIdx = page * CLOUD_PAGE_SIZE + i;
      const name      = item.path.split('/').pop() ?? item.path;
      const label     = name.length > 32 ? name.substring(0, 30) + '…' : name;
      const icon      = item.isFolder ? '📁' : '📄';
      rows.push([Markup.callbackButton(`${icon} ${label}`, `cloud_sdl_${globalIdx}`)]);
    });

    if (totalPages > 1) {
      const pgRow: any[] = [];
      if (page > 0)               pgRow.push(Markup.callbackButton('◀ Ant.', `cloud_spg_${page - 1}`));
      pgRow.push(Markup.callbackButton(`${page + 1}/${totalPages}`, 'cal_noop'));
      if (page < totalPages - 1)  pgRow.push(Markup.callbackButton('Sig. ▶', `cloud_spg_${page + 1}`));
      rows.push(pgRow);
    }

    rows.push([Markup.callbackButton('← Cloud', 'menu_cloud')]);
    return Markup.inlineKeyboard(rows).extra();
  };

  // ─── Calendar / time keyboard builders ─────────────────────────────────────

  private calendarKeyboard = (year: number, month: number): any => {
    const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay    = new Date(year, month, 1).getDay();
    const startOffset = (firstDay + 6) % 7; // 0=Monday … 6=Sunday
    const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
    const next = month === 11 ? { y: year + 1, m: 0  } : { y: year, m: month + 1 };

    const rows: any[][] = [
      [
        Markup.callbackButton('◀', `cal_nav_${prev.y}_${prev.m}`),
        Markup.callbackButton(`${MONTHS[month]} ${year}`, 'cal_noop'),
        Markup.callbackButton('▶', `cal_nav_${next.y}_${next.m}`),
      ],
      ['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(d => Markup.callbackButton(d, 'cal_noop')),
    ];

    let cells: any[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(Markup.callbackButton(' ', 'cal_noop'));
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      cells.push(Markup.callbackButton(`${day}`, `cal_day_${year}_${mm}_${dd}`));
      if (cells.length === 7) { rows.push(cells); cells = []; }
    }
    if (cells.length > 0) {
      while (cells.length < 7) cells.push(Markup.callbackButton(' ', 'cal_noop'));
      rows.push(cells);
    }
    rows.push([Markup.callbackButton('← Cancelar', 'back_main')]);
    return Markup.inlineKeyboard(rows).extra();
  };

  private hourKeyboard = (): any => {
    const rows: any[][] = [];
    for (let h = 0; h < 24; h += 6) {
      rows.push([0, 1, 2, 3, 4, 5].map(i => {
        const hh = String(h + i).padStart(2, '0');
        return Markup.callbackButton(hh, `time_h_${hh}`);
      }));
    }
    rows.push([Markup.callbackButton('← Cancelar', 'back_main')]);
    return Markup.inlineKeyboard(rows).extra();
  };

  private minuteKeyboard = (): any => {
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const rows: any[][] = [];
    for (let i = 0; i < minutes.length; i += 4) {
      rows.push(minutes.slice(i, i + 4).map(m => {
        const mm = String(m).padStart(2, '0');
        return Markup.callbackButton(mm, `time_m_${mm}`);
      }));
    }
    rows.push([Markup.callbackButton('← Cancelar', 'back_main')]);
    return Markup.inlineKeyboard(rows).extra();
  };

  // ─── Menu helpers ───────────────────────────────────────────────────────────

  private showMain = (ctx: TelegrafContext, edit = false) => {
    this.state = 'IDLE';
    const text = '🏠 Menú principal';
    if (edit) {
      (ctx.editMessageText(text, this.kb.main()) as Promise<any>)
        .catch(() => ctx.reply(text, this.kb.main()));
    } else {
      ctx.reply(text, this.kb.main());
    }
  };

  private editTo = (ctx: TelegrafContext, text: string, keyboard: any) =>
    (ctx.editMessageText(text, keyboard) as Promise<any>)
      .catch(() => ctx.reply(text, keyboard));

  // ─── Cloud helpers ──────────────────────────────────────────────────────────

  /**
   * Loads the current directory and renders it as a paginated browse keyboard.
   * When `edit=true` (default) the existing message is updated in-place;
   * when `edit=false` a new message is sent.
   *
   * '/' is treated as a virtual root: we actually list `cloudDefaultPath`.
   * Going up from there returns to the Cloud menu.
   */
  private loadAndShowDirectory = async (ctx: TelegrafContext, edit = true) => {
    // '/' → list the real cloud root folder
    const dirToList = this.currentCloudDir === '/' ? cloudDefaultPath : this.currentCloudDir;
    try {
      const items = await CloudService.Instance.getFolderContent(cloudDefaultPath, dirToList);
      // Sort: folders first, then alphabetical within each group.
      this.cloudCurrentItems = items.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      this.cloudListPage = 0;

      if (this.cloudCurrentItems.length === 0) {
        const emptyKb = Markup.inlineKeyboard([
          [Markup.callbackButton('⬆️ Subir nivel', 'cloud_up')],
          [Markup.callbackButton('← Cloud',       'menu_cloud')],
        ]).extra();
        const text = `📂 ${dirToList}\n📭 Directorio vacío`;
        if (edit) this.editTo(ctx, text, emptyKb);
        else      ctx.reply(text, emptyKb as any);
        return;
      }

      const text = `📂 ${dirToList}  (${this.cloudCurrentItems.length} elemento(s))`;
      const kb   = this.cloudBrowseKeyboard(this.cloudCurrentItems, 0);
      if (edit) this.editTo(ctx, text, kb);
      else      ctx.reply(text, kb as any);
    } catch {
      ctx.reply(`❌ Error al listar: ${dirToList}`);
    }
  };

  /**
   * Checks the file size, then sends it via replyWithDocument.
   * Files larger than TELEGRAM_MAX_FILE_BYTES are rejected with a clear message.
   */
  private sendCloudFile = (ctx: TelegrafContext, relativePath: string) => {
    const absPath = CloudService.Instance.giveMeRealPathFile(relativePath);
    stat(absPath, (err, fileStats) => {
      if (err) {
        ctx.reply(`❌ No se puede leer el fichero:\n${relativePath}`);
        return;
      }
      if (fileStats.size > TELEGRAM_MAX_FILE_BYTES) {
        const mb    = (fileStats.size / 1024 / 1024).toFixed(1);
        const maxMb = (TELEGRAM_MAX_FILE_BYTES / 1024 / 1024).toFixed(0);
        ctx.reply(
          `❌ El fichero es demasiado grande para que el bot lo envíe.\n` +
          `📦 Tamaño: ${mb} MB  |  🚫 Máximo: ${maxMb} MB\n` +
          `📄 ${relativePath}`
        );
        return;
      }
      ctx.reply(`📥 Enviando: ${relativePath}`);
      ctx.replyWithDocument({ source: absPath })
        .catch(() => ctx.reply(`❌ Error al enviar:\n${relativePath}`));
    });
  };

  // ─── RSS ────────────────────────────────────────────────────────────────────

  private executeRss = async (ctx: TelegrafContext, amount: number) => {
    this.state = 'IDLE';
    const type = this.pendingRssType;
    ctx.reply(`⏳ Obteniendo ${type.toUpperCase()}…`);
    try {
      let messages: string[] = [];
      switch (type) {
        case 'masto':     messages = await MediaRSSAutoupdate.getMastoFileContent();            break;
        case 'blog':      messages = await MediaRSSAutoupdate.getBlogFileContent();             break;
        case 'youtube':   messages = await MediaRSSAutoupdate.getYoutubeFileContent('null')(); break;
        case 'news':      messages = await MediaRSSAutoupdate.getNewsFileContent();             break;
        case 'favorites': messages = await MediaRSSAutoupdate.getFavoritesYoutubeFileContent(amount); break;
      }
      const slice = messages.slice(Math.max(0, messages.length - amount));
      this.sendMessages(ctx, slice);
      setTimeout(() => this.showMain(ctx), (slice.length + 2) * 1000);
    } catch {
      ctx.reply('❌ Error al obtener los mensajes.');
      this.showMain(ctx);
    }
  };

  // ─── Saved list fetcher ─────────────────────────────────────────────────────

  private executeSaved = (ctx: TelegrafContext, amount: number) => {
    ctx.reply(`⏳ Obteniendo ${amount} guardados…`);
    ReadLaterMessagesRSS.getMessagesRSSSaved(amount).then(msgs => {
      if (msgs.length === 0) {
        ctx.reply('📭 La lista de guardados está vacía.');
        this.showMain(ctx);
        return;
      }
      this.chunked(msgs.map(m => m.message), 5)
        .forEach((chunk, i) =>
          setTimeout(() => ctx.reply(chunk.join('\n─────────────\n')), i * 400));
      setTimeout(() => this.showMain(ctx), Math.ceil(msgs.length / 5) * 400 + 400);
    });
  };

  // ─── Text input handler ─────────────────────────────────────────────────────

  private handleText = (ctx: TelegrafContext, text: string) => {
    const prev = this.state;
    this.state = 'IDLE';

    switch (prev) {
      case 'WAITING_NOTE':
        NotesService.Instance.addNotes(text).then(() => {
          ctx.reply('✅ Nota añadida correctamente.');
          this.showMain(ctx);
        });
        break;

      case 'WAITING_BOOKMARK_ADD':
        BookmarkService.Instance.addBookmark(text).then(() => {
          ctx.reply('✅ Marcador añadido.');
          this.showMain(ctx);
        });
        break;

      case 'WAITING_BOOKMARK_SEARCH':
        BookmarkService.Instance.searchInBookmark(text).then(results => {
          if (results.length === 0) {
            ctx.reply('📭 Sin resultados.');
          } else {
            const lines = results.map(b => `• ${b.title}\n  ${b.url}`);
            this.chunked(lines, 10).forEach((chunk, i) =>
              setTimeout(() => ctx.reply(chunk.join('\n─────\n')), i * 400));
          }
          setTimeout(() => this.showMain(ctx),
            results.length > 0 ? Math.ceil(results.length / 10) * 400 + 400 : 300);
        });
        break;

      case 'WAITING_SAVE_URL':
        getUnfurl(text).then(({ title }) => {
          const msg = `${title ?? text}\nAutomatico - ${new Date().toLocaleString()}\n\n${text}`;
          ReadLaterMessagesRSS.addMessageRSSToSavedList(msg).then(() => {
            ctx.reply('✅ Guardado en la lista.');
            this.showMain(ctx);
          });
        });
        break;

      case 'WAITING_CLOUD_SEARCH': {
        const cancelled = { value: false };
        ctx.reply(`🔍 Buscando "${text}" en ${this.currentCloudDir === '/' ? 'toda la cloud' : this.currentCloudDir}…`);
        CloudService.Instance
          .searchCloudItemInDirectoryDeep(cloudDefaultPath, this.currentCloudDir === '/' ? cloudDefaultPath : this.currentCloudDir, text, cancelled)
          .then(rawResults => {
            if (rawResults.length === 0) {
              ctx.reply('📭 Sin resultados.');
              this.showMain(ctx);
              return;
            }
            // Resolve isFolder for each result so the keyboard shows the right icon
            // and the download handler knows whether to navigate or send.
            const statPromises = rawResults.map(r =>
              new Promise<{ path: string; isFolder: boolean }>(resolve => {
                const absPath = CloudService.Instance.giveMeRealPathFile(r.path);
                stat(absPath, (err, s) => resolve({ path: r.path, isFolder: !err && s.isDirectory() }));
              })
            );
            Promise.all(statPromises).then(enriched => {
              this.cloudSearchResults = enriched;
              this.cloudSearchPage    = 0;
              ctx.reply(
                `🔍 ${enriched.length} resultado(s) para "${text}":`,
                this.cloudSearchKeyboard(enriched, 0) as any,
              );
            });
          })
          .catch(() => {
            ctx.reply('❌ Error en la búsqueda.');
            this.showMain(ctx);
          });
        break;
      }

      case 'WAITING_ALERT_MESSAGE':
        this.createAlert(ctx, text);
        break;

      default:
        this.showMain(ctx);
    }
  };

  // ─── Alert creator ──────────────────────────────────────────────────────────

  private createAlert = (ctx: TelegrafContext, message: string) => {
    const { date, hour, minute } = this.pendingAlert;
    if (!date || hour === undefined || minute === undefined) {
      ctx.reply('❌ Error: datos de alerta incompletos.');
      this.showMain(ctx);
      return;
    }
    const timeToLaunch = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
    const dateStr = `${String(timeToLaunch.getDate()).padStart(2,'0')}/${String(timeToLaunch.getMonth()+1).padStart(2,'0')}/${timeToLaunch.getFullYear()}`;
    const timeStr = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
    AlertListService.Instance.addAlerts({ timeToLaunch, message }, this.sendMessageToTelegram)
      .then(() => {
        this.launchAlertsToTelegram(false);
        this.pendingAlert = {};
        ctx.reply(`✅ Alerta para ${dateStr} ${timeStr}: "${message}"`);
        this.showMain(ctx);
      });
  };

  // ─── start() ───────────────────────────────────────────────────────────────

  start(_commandList: TelegramBotCommand) {
    if (!this.telegramBotData.connect_to_telegram) return;

    // ── /login <password> ─────────────────────────────────────────────────
    this.bot!.command(LOGIN_COMMAND, (ctx) => {
      if (!ctx.message?.text) return;
      const pass = ctx.message.text.replace(`/${LOGIN_COMMAND}`, '').trimStart();
      this.tokenPassGetUser = pass;
      if (this.isUserClient(ctx)) {
        ctx.reply('✅ Autenticado correctamente.');
        this.showMain(ctx);
      } else {
        ctx.reply('❌ Contraseña incorrecta.');
      }
    });

    // ── /start ────────────────────────────────────────────────────────────
    this.bot!.start((ctx) => {
      if (!this.isUserClient(ctx)) {
        ctx.reply(`Hola! Usa /${LOGIN_COMMAND} <contraseña> para autenticarte.`);
        return;
      }
      this.showMain(ctx);
    });

    // ── Navigation: back to main menu ─────────────────────────────────────
    this.bot!.action('back_main', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.showMain(ctx, true);
    });

    // ── RSS menu ──────────────────────────────────────────────────────────
    this.bot!.action('menu_rss', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.editTo(ctx, '📰 RSS — Elige fuente:', this.kb.rss());
    });

    (['masto', 'blog', 'youtube', 'news', 'favorites'] as const).forEach(type => {
      this.bot!.action(`rss_${type}`, (ctx) => {
        if (!this.isUserClient(ctx)) return;
        ctx.answerCbQuery();
        this.pendingRssType = type;
        this.editTo(ctx, `📰 ${type.toUpperCase()} — ¿Cuántos mensajes?`, this.kb.amount('menu_rss'));
      });
    });

    ([5, 10, 20, 50] as const).forEach(n => {
      this.bot!.action(`amount_${n}`, (ctx) => {
        if (!this.isUserClient(ctx)) return;
        ctx.answerCbQuery();
        this.executeRss(ctx, n);
      });
    });

    // ── Notes menu ────────────────────────────────────────────────────────
    this.bot!.action('menu_notes', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.editTo(ctx, '📝 Notas:', this.kb.notes());
    });

    this.bot!.action('notes_view', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const notes = NotesService.Instance.notes;
      if (notes.length === 0) {
        ctx.reply('📭 No hay notas todavía.');
      } else {
        this.chunked(notes.map(n => `• ${n}`), 10)
          .forEach((chunk, i) => setTimeout(() => ctx.reply(chunk.join('\n')), i * 400));
      }
      setTimeout(() => this.showMain(ctx), Math.ceil(notes.length / 10) * 400 + 400);
    });

    this.bot!.action('notes_add', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.state = 'WAITING_NOTE';
      this.editTo(ctx, '📝 Escribe el contenido de la nota:', undefined);
    });

    // ── Bookmarks menu ────────────────────────────────────────────────────
    this.bot!.action('menu_bookmarks', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.editTo(ctx, '🔖 Marcadores:', this.kb.bookmarks());
    });

    this.bot!.action('bm_add', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.state = 'WAITING_BOOKMARK_ADD';
      this.editTo(ctx, '🔖 Envía la URL del marcador:', undefined);
    });

    this.bot!.action('bm_search', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.state = 'WAITING_BOOKMARK_SEARCH';
      this.editTo(ctx, '🔍 Escribe el término de búsqueda:', undefined);
    });

    // ── Saved list menu ───────────────────────────────────────────────────
    this.bot!.action('menu_saved', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.editTo(ctx, '💾 Lista de guardados:', this.kb.saved());
    });

    this.bot!.action('saved_view', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.editTo(ctx, '💾 Guardados — ¿Cuántos mensajes?', this.kb.savedAmount());
    });

    ([5, 10, 20, 50] as const).forEach(n => {
      this.bot!.action(`saved_amount_${n}`, (ctx) => {
        if (!this.isUserClient(ctx)) return;
        ctx.answerCbQuery();
        this.executeSaved(ctx, n);
      });
    });

    this.bot!.action('saved_add', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.state = 'WAITING_SAVE_URL';
      this.editTo(ctx, '💾 Envía la URL que quieres guardar:', undefined);
    });

    // ── Cloud menu ────────────────────────────────────────────────────────

    this.bot!.action('menu_cloud', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.editTo(ctx, `☁️ Cloud  |  📍 ${this.currentCloudDir}`, this.kb.cloud());
    });

    /** 📍 Show current path */
    this.bot!.action('cloud_pwd', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      ctx.reply(`📍 Path actual: ${this.currentCloudDir}`);
    });

    /** 📂 Browse current directory (paginated, clickable items) */
    this.bot!.action('cloud_browse', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.loadAndShowDirectory(ctx);
    });

    /** ◀ / ▶ Paginate directory listing  — data: "cloud_pg_<page>" */
    this.bot!.action(/^cloud_pg_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const page = parseInt(((ctx.callbackQuery as any).data as string).replace('cloud_pg_', ''), 10);
      this.cloudListPage = page;
      const text = `📂 ${this.currentCloudDir}  (${this.cloudCurrentItems.length} elemento(s))`;
      this.editTo(ctx, text, this.cloudBrowseKeyboard(this.cloudCurrentItems, page));
    });

    /** 📁 Enter subdirectory — data: "cloud_enter_<idx>" */
    this.bot!.action(/^cloud_enter_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const idx  = parseInt(((ctx.callbackQuery as any).data as string).replace('cloud_enter_', ''), 10);
      const item = this.cloudCurrentItems[idx];
      if (!item || !item.isFolder) { ctx.reply('❌ No es una carpeta.'); return; }
      this.currentCloudDir = item.path;
      this.loadAndShowDirectory(ctx);
    });

    /** 📄 Download file from listing — data: "cloud_dl_<idx>" */
    this.bot!.action(/^cloud_dl_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const idx  = parseInt(((ctx.callbackQuery as any).data as string).replace('cloud_dl_', ''), 10);
      const item = this.cloudCurrentItems[idx];
      if (!item || item.isFolder) { ctx.reply('❌ No es un fichero.'); return; }
      this.sendCloudFile(ctx, item.path);
    });

    /** ⬆️ Go up one directory level */
    this.bot!.action('cloud_up', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      // If we're at the virtual root or at the top-level cloud folder, go back to Cloud menu.
      if (this.currentCloudDir === '/' || this.currentCloudDir === cloudDefaultPath) {
        this.currentCloudDir = '/';
        this.editTo(ctx, `☁️ Cloud  |  📍 /`, this.kb.cloud());
        return;
      }
      const parts = this.currentCloudDir.split('/');
      parts.pop();
      this.currentCloudDir = parts.join('/') || '/';
      this.loadAndShowDirectory(ctx);
    });

    /** 🔍 Start deep search (prompts for text) */
    this.bot!.action('cloud_search', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.state = 'WAITING_CLOUD_SEARCH';
      this.editTo(ctx,
        `🔍 Búsqueda profunda en: ${this.currentCloudDir === '/' ? 'toda la cloud' : this.currentCloudDir}\n` +
        `Escribe el término de búsqueda:`,
        undefined,
      );
    });

    /** ◀ / ▶ Paginate search results — data: "cloud_spg_<page>" */
    this.bot!.action(/^cloud_spg_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const page = parseInt(((ctx.callbackQuery as any).data as string).replace('cloud_spg_', ''), 10);
      this.cloudSearchPage = page;
      this.editTo(ctx,
        `🔍 ${this.cloudSearchResults.length} resultado(s):`,
        this.cloudSearchKeyboard(this.cloudSearchResults, page),
      );
    });

    /** 📁📄 Navigate into folder / download file from search results — data: "cloud_sdl_<idx>" */
    this.bot!.action(/^cloud_sdl_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const idx    = parseInt(((ctx.callbackQuery as any).data as string).replace('cloud_sdl_', ''), 10);
      const result = this.cloudSearchResults[idx];
      if (!result) { ctx.reply('❌ Índice inválido.'); return; }
      if (result.isFolder) {
        // Navigate into the found folder and show its contents.
        this.currentCloudDir = result.path;
        this.loadAndShowDirectory(ctx, false);
      } else {
        this.sendCloudFile(ctx, result.path);
      }
    });

    /** 📦 Send all files in current directory one by one (with size check) */
    this.bot!.action('cloud_folder', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      if (this.currentCloudDir === '/') {
        ctx.reply('⚠️ Navega a una carpeta concreta antes de usar esta opción.');
        return;
      }
      CloudService.Instance.getListFolderFiles(cloudDefaultPath, this.currentCloudDir)
        .then(list => {
          if (list.length === 0) {
            ctx.reply('📭 No hay ficheros en esta carpeta (sólo subcarpetas).');
            return;
          }
          ctx.reply(`📦 Enviando ${list.length} fichero(s) de "${this.currentCloudDir}"…\n(Los ficheros > 50 MB se omitirán)`);
          this.sendFolderFiles(ctx, list, 0);
        });
    });

    // ── Alerts menu ───────────────────────────────────────────────────────
    this.bot!.action('menu_alerts', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.editTo(ctx, '🔔 Alertas:', this.kb.alerts());
    });

    this.bot!.action('alert_add', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.pendingAlert = {};
      const now = new Date();
      this.editTo(ctx, '🔔 Selecciona la fecha:', this.calendarKeyboard(now.getFullYear(), now.getMonth()));
    });

    this.bot!.action('cal_noop', (ctx) => { ctx.answerCbQuery(); });

    this.bot!.action(/^cal_nav_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const parts = ((ctx.callbackQuery as any)?.data as string).split('_');
      const year  = parseInt(parts[2], 10);
      const month = parseInt(parts[3], 10);
      this.editTo(ctx, '🔔 Selecciona la fecha:', this.calendarKeyboard(year, month));
    });

    this.bot!.action(/^cal_day_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const parts = ((ctx.callbackQuery as any)?.data as string).split('_');
      const year  = parseInt(parts[2], 10);
      const month = parseInt(parts[3], 10) - 1;
      const day   = parseInt(parts[4], 10);
      this.pendingAlert.date = new Date(year, month, day);
      const dateStr = `${parts[4]}/${parts[3]}/${parts[2]}`;
      this.editTo(ctx, `🔔 Fecha: ${dateStr}\n⏰ Selecciona la hora:`, this.hourKeyboard());
    });

    this.bot!.action(/^time_h_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const hour = parseInt(((ctx.callbackQuery as any)?.data as string).split('_')[2], 10);
      this.pendingAlert.hour = hour;
      const d = this.pendingAlert.date!;
      const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      this.editTo(ctx,
        `🔔 Fecha: ${dateStr}  Hora: ${String(hour).padStart(2,'0')}:?\n⏱ Selecciona los minutos:`,
        this.minuteKeyboard());
    });

    this.bot!.action(/^time_m_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const minute = parseInt(((ctx.callbackQuery as any)?.data as string).split('_')[2], 10);
      this.pendingAlert.minute = minute;
      const d = this.pendingAlert.date!;
      const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      const timeStr = `${String(this.pendingAlert.hour!).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
      this.state = 'WAITING_ALERT_MESSAGE';
      this.editTo(ctx, `🔔 Fecha: ${dateStr}  Hora: ${timeStr}\n✏️ Escribe el mensaje de la alerta:`, undefined);
    });

    // ── Text messages (state-machine input) ───────────────────────────────
    this.bot!.on('text', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      const text = ctx.message?.text ?? '';
      if (text.startsWith('/')) return;
      this.handleText(ctx, text);
    });

    // ── File uploads from user → cloud ────────────────────────────────────
    this.bot!.on('photo',     this.uploadFileToCloud);
    this.bot!.on('audio',     this.uploadFileToCloud);
    this.bot!.on('document',  this.uploadFileToCloud);
    this.bot!.on('video',     this.uploadFileToCloud);
    this.bot!.on('voice',     this.uploadFileToCloud);
    this.bot!.on('animation', this.uploadFileToCloud);

    this.launchAlertsToTelegram();
    this.bot!.launch();
  }

  // ─── Cloud file upload (user → cloud) ──────────────────────────────────────

  uploadFileToCloud = (ctx: TelegrafContext) => {
    if (!this.isUserClient(ctx)) return;
    if (!this.currentCloudDir || this.currentCloudDir === '/') {
      ctx.reply('⚠️ No se puede subir a la raíz. Navega a una carpeta concreta primero.');
      return;
    }
    const fileItemId = this.getFileId(ctx);
    if (!fileItemId) return;

    const tempDir = 'temp_telegram';
    this.bot!.telegram.getFile(fileItemId)
      .then(file => {
        const name = this.getFileName(ctx) ?? fileItemId;
        const ext  = file.file_path?.split('.').pop() ?? '';
        return this.bot!.telegram.getFileLink(fileItemId).then(link =>
          fetch(link).then((res: any) => {
            const save = () => this.saveToCloud(ctx, res, tempDir, name, ext);
            if (!existsSync(tempDir)) mkdir(tempDir, save); else save();
          })
        );
      })
      .catch(() => ctx.reply('❌ No se pudo obtener el fichero desde Telegram (puede ser demasiado grande para la API).'));
  };

  private saveToCloud = (ctx: TelegrafContext, res: any, tempDir: string, name: string, ext: string) => {
    const tmp   = `${tempDir}/${name}`;
    const final = `${this.currentCloudDir}/${name}.${ext}`;
    const body  = (Readable as any).from(res.body);
    finished(body.pipe(createWriteStream(tmp))).then(() => {
      CloudService.Instance.uploadFile(tmp, final);
      ctx.reply(`✅ Guardado en: ${final}`);
    });
  };

  private getFileId = (ctx: TelegrafContext) =>
    (ctx.message?.photo && ctx.message.photo[0].file_id) ||
    ctx.message?.audio?.file_id    ||
    ctx.message?.document?.file_id ||
    ctx.message?.video?.file_id    ||
    ctx.message?.voice?.file_id    ||
    ctx.message?.animation?.file_id;

  private getFileName = (ctx: TelegrafContext) =>
    ctx.message?.audio?.title        ||
    ctx.message?.document?.file_name ||
    ctx.message?.animation?.file_name;

  // ─── Send folder files one-by-one (with file-size guard) ───────────────────

  private sendFolderFiles = (ctx: TelegrafContext, list: string[], index: number) => {
    if (index >= list.length) {
      ctx.reply('✅ Carpeta enviada.');
      this.showMain(ctx);
      return;
    }
    const relativePath = list[index];
    const absPath      = CloudService.Instance.giveMeRealPathFile(relativePath);

    stat(absPath, (err, fileStats) => {
      if (err) {
        ctx.reply(`⚠️ No se puede leer (${index + 1}/${list.length}): ${relativePath}`);
        this.sendFolderFiles(ctx, list, index + 1);
        return;
      }
      if (fileStats.size > TELEGRAM_MAX_FILE_BYTES) {
        const mb    = (fileStats.size / 1024 / 1024).toFixed(1);
        const maxMb = (TELEGRAM_MAX_FILE_BYTES / 1024 / 1024).toFixed(0);
        ctx.reply(`⏭️ Omitido — ${mb} MB > ${maxMb} MB (${index + 1}/${list.length}):\n${relativePath}`);
        this.sendFolderFiles(ctx, list, index + 1);
        return;
      }
      ctx.reply(`📤 (${index + 1}/${list.length}): ${relativePath}`);
      ctx.replyWithDocument({ source: absPath })
        .then(()  => this.sendFolderFiles(ctx, list, index + 1))
        .catch(() => {
          ctx.reply(`❌ Error al enviar (${index + 1}/${list.length}):\n${relativePath}`);
          this.sendFolderFiles(ctx, list, index + 1);
        });
    });
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private sendMessages = (ctx: TelegrafContext, msgs: string[]) => {
    msgs.forEach((m, i) => setTimeout(() => ctx.reply(m), i * 1000));
    setTimeout(
      () => ctx.reply(`✅ Fin (${msgs.length} mensajes)`),
      msgs.length * 1000
    );
  };

  private chunked = <T>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  // ─── Public API ────────────────────────────────────────────────────────────

  sendNotepadTextToTelegram = (text: string): boolean => {
    if (!this.context) return false;
    this.context.reply(text);
    return true;
  };

  sendDocumentToTelegram = (filePath: string, fileName: string): Promise<boolean> => {
    if (!this.context || !this.bot) return Promise.resolve(false);
    const chatId = this.context.chat?.id;
    if (!chatId) return Promise.resolve(false);
    return this.bot.telegram
      .sendDocument(chatId, { source: createReadStream(filePath), filename: fileName })
      .then(() => { unlink(filePath, () => {}); return true; })
      .catch(() => false);
  };

  public sendMessageToTelegram = (message: string) => {
    if (this.context) {
      this.context.reply(message);
      AlertListService.Instance.clear();
    }
  };

  private launchAlertsToTelegram = (_launchTimeout = true) => {
    if (this.context) {
      AlertListService.Instance.launchAlerts(this.sendMessageToTelegram);
      TelegramBot.alertEnabled = true;
    }
  };
}
