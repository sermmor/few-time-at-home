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
 *     ☁️ Cloud ──► ls | pwd | cd (→ text) | ⬆ | 🔍 (→ text) | 📥 (→ index) | 📦
 *     🔔 Alertas ──► Añadir → 📅 calendar → ⏰ hour grid → ⏱ minute grid → ✏️ message
 */

import Telegraf, { Markup } from "telegraf";
import { TelegrafContext } from "telegraf/typings/context";
import { AlertListService } from "../API/alertNotification.service";
import { BookmarkService } from "../API/bookmark.service";
import { TelegramBotCommand } from "../API/messagesRSS.service";
import { NotesService } from "../API/notes.service";
import { extractTelegramData, TelegramData } from "./telegramData";
import { CloudService, cloudDefaultPath } from "../API/cloud.service";
import { createWriteStream, existsSync, mkdir, createReadStream, unlink } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { MediaRSSAutoupdate } from "../processAutoupdate/mediaRSSAutoupdate";
import { ReadLaterMessagesRSS } from "../API/readLaterMessagesRSS.service";
import { getUnfurl } from "../unfurl/unfurl";

const fetch = require("node-fetch");

// ─── Constants ────────────────────────────────────────────────────────────────

const LOGIN_COMMAND = 'login';

// ─── State machine ────────────────────────────────────────────────────────────

type BotState =
  | 'IDLE'
  | 'WAITING_NOTE'
  | 'WAITING_BOOKMARK_ADD'
  | 'WAITING_BOOKMARK_SEARCH'
  | 'WAITING_SAVE_URL'
  | 'WAITING_CLOUD_CD'
  | 'WAITING_CLOUD_SEARCH'
  | 'WAITING_CLOUD_FILE_INDEX'
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
  private currentCloudDir = '/';
  private lastSearchInCloudPathList: string[] = [];

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

    cloud: (dir: string) => Markup.inlineKeyboard([
      [Markup.callbackButton('📂 Listar',        'cloud_ls'),
       Markup.callbackButton('📍 Path actual',   'cloud_pwd')],
      [Markup.callbackButton('📁 Cambiar dir.',  'cloud_cd'),
       Markup.callbackButton('⬆️ Subir nivel',   'cloud_up')],
      [Markup.callbackButton('🔍 Buscar fichero','cloud_search')],
      [Markup.callbackButton('📥 Obtener por nº','cloud_get'),
       Markup.callbackButton('📦 Bajar carpeta', 'cloud_folder')],
      [Markup.callbackButton('← Volver',         'back_main')],
    ]).extra(),

    alerts: () => Markup.inlineKeyboard([
      [Markup.callbackButton('➕ Añadir alerta', 'alert_add')],
      [Markup.callbackButton('← Volver',         'back_main')],
    ]).extra(),
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
      // Header: prev / month+year / next
      [
        Markup.callbackButton('◀', `cal_nav_${prev.y}_${prev.m}`),
        Markup.callbackButton(`${MONTHS[month]} ${year}`, 'cal_noop'),
        Markup.callbackButton('▶', `cal_nav_${next.y}_${next.m}`),
      ],
      // Day-of-week labels
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

  /** Show main menu — reply if `edit=false`, try to edit the message otherwise. */
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

  /** Edit the current message to show a sub-menu; fall back to reply. */
  private editTo = (ctx: TelegrafContext, text: string, keyboard: any) =>
    (ctx.editMessageText(text, keyboard) as Promise<any>)
      .catch(() => ctx.reply(text, keyboard));

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
    this.state = 'IDLE'; // reset before async work so stray messages don't re-trigger

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

      case 'WAITING_CLOUD_CD': {
        const candidate = this.currentCloudDir === '/'
          ? text.replace(/^\//, '')
          : `${this.currentCloudDir}/${text.replace(/^\//, '')}`;
        CloudService.Instance.lsDirOperation(cloudDefaultPath, candidate)
          .then(items => {
            if (items.length > 0) {
              this.currentCloudDir = candidate;
              ctx.reply(`✅ Directorio: ${this.currentCloudDir}`);
            } else {
              ctx.reply(`❌ No existe: ${candidate}`);
            }
            this.showMain(ctx);
          })
          .catch(() => { ctx.reply(`❌ Error al cambiar a: ${candidate}`); this.showMain(ctx); });
        break;
      }

      case 'WAITING_CLOUD_SEARCH':
        CloudService.Instance.searchCloudItemInDirectory(cloudDefaultPath, this.currentCloudDir, text)
          .then(results => {
            this.lastSearchInCloudPathList = results.map(r => r.path);
            if (results.length === 0) {
              ctx.reply('📭 Sin resultados.');
              this.showMain(ctx);
              return;
            }
            const lines = this.lastSearchInCloudPathList.map((p, i) => `${i}. ${p}`);
            this.chunked(lines, 10).forEach((chunk, i) =>
              setTimeout(() => ctx.reply(chunk.join('\n')), i * 400));
            setTimeout(() => this.showMain(ctx), Math.ceil(lines.length / 10) * 400 + 400);
          });
        break;

      case 'WAITING_CLOUD_FILE_INDEX': {
        const idx = parseInt(text, 10);
        if (!isNaN(idx) && idx >= 0 && idx < this.lastSearchInCloudPathList.length) {
          ctx.reply(`📥 Enviando: ${this.lastSearchInCloudPathList[idx]}`);
          ctx.replyWithDocument({ source: CloudService.Instance.giveMeRealPathFile(this.lastSearchInCloudPathList[idx]) })
            .catch(() => ctx.reply('❌ Fichero demasiado grande para Telegram.'));
        } else {
          ctx.reply('❌ Índice inválido.');
        }
        this.showMain(ctx);
        break;
      }

      case 'WAITING_ALERT_MESSAGE':
        this.createAlert(ctx, text);
        break;

      default:
        // User typed something outside a prompt — just show the menu again
        this.showMain(ctx);
    }
  };

  // ─── Alert creator (final step of the multi-step flow) ─────────────────────

  private createAlert = (ctx: TelegrafContext, message: string) => {
    const { date, hour, minute } = this.pendingAlert;
    if (!date || hour === undefined || minute === undefined) {
      ctx.reply('❌ Error: datos de alerta incompletos.');
      this.showMain(ctx);
      return;
    }
    const timeToLaunch = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(), hour, minute
    );
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

    // ── /login <password> — the only text command ──────────────────────────
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

    // ── /start ─────────────────────────────────────────────────────────────
    this.bot!.start((ctx) => {
      if (!this.isUserClient(ctx)) {
        ctx.reply(`Hola! Usa /${LOGIN_COMMAND} <contraseña> para autenticarte.`);
        return;
      }
      this.showMain(ctx);
    });

    // ── Navigation: back to main menu ──────────────────────────────────────
    this.bot!.action('back_main', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.showMain(ctx, true);
    });

    // ── RSS menu ───────────────────────────────────────────────────────────
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

    // ── Notes menu ─────────────────────────────────────────────────────────
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

    // ── Bookmarks menu ─────────────────────────────────────────────────────
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

    // ── Saved list menu ────────────────────────────────────────────────────
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

    // ── Cloud menu ─────────────────────────────────────────────────────────
    this.bot!.action('menu_cloud', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.editTo(ctx, `☁️ Cloud  |  📍 ${this.currentCloudDir}`, this.kb.cloud(this.currentCloudDir));
    });

    this.bot!.action('cloud_pwd', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      ctx.reply(`📍 Path actual: ${this.currentCloudDir}`);
    });

    this.bot!.action('cloud_ls', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      if (this.currentCloudDir === '/') {
        ctx.reply(`📂 Raíz: ${cloudDefaultPath}`);
        return;
      }
      CloudService.Instance.lsDirOperation(cloudDefaultPath, this.currentCloudDir).then(items => {
        if (items.length === 0) { ctx.reply('📭 Directorio vacío.'); return; }
        this.chunked(items.map((p, i) => `${i}. ${p}`), 10)
          .forEach((chunk, i) => setTimeout(() => ctx.reply(chunk.join('\n')), i * 400));
      });
    });

    this.bot!.action('cloud_cd', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.state = 'WAITING_CLOUD_CD';
      this.editTo(ctx, `📁 Path actual: ${this.currentCloudDir}\nEscribe el nombre del subdirectorio:`, undefined);
    });

    this.bot!.action('cloud_up', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      if (this.currentCloudDir !== '/') {
        const parts = this.currentCloudDir.split('/');
        parts.pop();
        this.currentCloudDir = parts.join('/') || '/';
      }
      ctx.reply(`⬆️ Ahora en: ${this.currentCloudDir}`);
    });

    this.bot!.action('cloud_search', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.state = 'WAITING_CLOUD_SEARCH';
      this.editTo(ctx, `🔍 Path: ${this.currentCloudDir}\nEscribe el término de búsqueda:`, undefined);
    });

    this.bot!.action('cloud_get', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      if (this.lastSearchInCloudPathList.length === 0) {
        ctx.reply('⚠️ No hay búsqueda reciente. Usa 🔍 Buscar fichero primero.');
        return;
      }
      this.state = 'WAITING_CLOUD_FILE_INDEX';
      this.editTo(ctx,
        `📥 Escribe el número del fichero (0–${this.lastSearchInCloudPathList.length - 1}):`,
        undefined);
    });

    this.bot!.action('cloud_folder', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      CloudService.Instance.getListFolderFiles(cloudDefaultPath, this.currentCloudDir)
        .then(list => this.sendFolderFiles(ctx, list.slice(0, 30), 0));
    });

    // ── Alerts menu ────────────────────────────────────────────────────────
    this.bot!.action('menu_alerts', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.editTo(ctx, '🔔 Alertas:', this.kb.alerts());
    });

    // alert_add: open calendar for current month
    this.bot!.action('alert_add', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      this.pendingAlert = {};
      const now = new Date();
      this.editTo(ctx, '🔔 Selecciona la fecha:', this.calendarKeyboard(now.getFullYear(), now.getMonth()));
    });

    // Calendar: no-op (labels / empty cells)
    this.bot!.action('cal_noop', (ctx) => { ctx.answerCbQuery(); });

    // Calendar: navigate month
    this.bot!.action(/^cal_nav_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const parts = ((ctx.callbackQuery as any)?.data as string).split('_');
      // data = "cal_nav_<year>_<month>"
      const year  = parseInt(parts[2], 10);
      const month = parseInt(parts[3], 10);
      this.editTo(ctx, '🔔 Selecciona la fecha:', this.calendarKeyboard(year, month));
    });

    // Calendar: day selected → show hour picker
    this.bot!.action(/^cal_day_/, (ctx) => {
      if (!this.isUserClient(ctx)) return;
      ctx.answerCbQuery();
      const parts = ((ctx.callbackQuery as any)?.data as string).split('_');
      // data = "cal_day_<year>_<MM>_<DD>"
      const year  = parseInt(parts[2], 10);
      const month = parseInt(parts[3], 10) - 1; // back to 0-based
      const day   = parseInt(parts[4], 10);
      this.pendingAlert.date = new Date(year, month, day);
      const dateStr = `${parts[4]}/${parts[3]}/${parts[2]}`;
      this.editTo(ctx, `🔔 Fecha: ${dateStr}\n⏰ Selecciona la hora:`, this.hourKeyboard());
    });

    // Hour selected → show minute picker
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

    // Minute selected → ask for message text
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

    // ── Text messages (state-machine input) ────────────────────────────────
    this.bot!.on('text', (ctx) => {
      if (!this.isUserClient(ctx)) return;
      const text = ctx.message?.text ?? '';
      if (text.startsWith('/')) return; // handled by command() above
      this.handleText(ctx, text);
    });

    // ── File uploads ───────────────────────────────────────────────────────
    this.bot!.on('photo',     this.uploadFileToCloud);
    this.bot!.on('audio',     this.uploadFileToCloud);
    this.bot!.on('document',  this.uploadFileToCloud);
    this.bot!.on('video',     this.uploadFileToCloud);
    this.bot!.on('voice',     this.uploadFileToCloud);
    this.bot!.on('animation', this.uploadFileToCloud);

    this.launchAlertsToTelegram();
    this.bot!.launch();
  }

  // ─── Cloud file upload ──────────────────────────────────────────────────────

  uploadFileToCloud = (ctx: TelegrafContext) => {
    if (!this.isUserClient(ctx)) return;
    if (!this.currentCloudDir || this.currentCloudDir === '/') {
      ctx.reply('⚠️ No se puede subir a la raíz. Cambia de directorio primero.');
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
      .catch(() => ctx.reply('❌ Fichero demasiado grande para Telegram.'));
  };

  private saveToCloud = (ctx: TelegrafContext, res: any, tempDir: string, name: string, ext: string) => {
    const tmp   = `${tempDir}/${name}`;
    const final = `${this.currentCloudDir}/${name}.${ext}`;
    const body  = (Readable as any).from(res.body);
    finished(body.pipe(createWriteStream(tmp))).then(() => {
      CloudService.Instance.uploadFile(tmp, final);
      ctx.reply(`✅ Guardado: ${final}`);
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

  // ─── Send folder files one-by-one ──────────────────────────────────────────

  private sendFolderFiles = (ctx: TelegrafContext, list: string[], index: number) => {
    if (index >= list.length) { ctx.reply('✅ Todos los ficheros enviados.'); return; }
    ctx.reply(`📤 Enviando (${index + 1}/${list.length}): ${list[index]}`);
    ctx.replyWithDocument({ source: list[index] })
      .then(()  => this.sendFolderFiles(ctx, list, index + 1))
      .catch(() => {
        ctx.reply('❌ Fichero demasiado grande para Telegram, saltando…');
        this.sendFolderFiles(ctx, list, index + 1);
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

  // ─── Public API (used by alertsService, notepadService, etc.) ──────────────

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
