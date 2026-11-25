# Few_Time@Home — Claude project guide

Self-hosted personal dashboard that runs on the owner's Raspberry Pi (8 GB). It
does "a lot of things when I'm away from home": RSS aggregation, a Telegram bot,
cloud file management, media casting (Alexa), weather, a Pomodoro timer, smart
home control, and companion desktop/mobile apps.

> **Language conventions:** the UI is in **Spanish**, and **code comments are
> written in Spanish**. Keep both when editing. Instructions/docs for Claude
> (this file, rules, skills) are in English.

## Monorepo layout

| Path              | Stack                          | What it is                                              |
|-------------------|--------------------------------|--------------------------------------------------------|
| `backend/`        | Node + Express 5 + TypeScript  | API, Telegram bot, RSS workers, smart home, websockets |
| `frontend/`       | React + MUI + TypeScript (Vite)| The dashboard SPA served to browsers/apps              |
| `ftahApp/`        | Flutter                        | Newest companion app (desktop + mobile)                |
| `desktopApp/`     | Flutter                        | Older desktop companion app                            |
| `mobileApp/`      | Flutter                        | Older mobile companion app                             |
| `rootCloud/`      | —                              | Cloud file storage root                                |
| `build_frontend/` | —                              | Built frontend artifacts                               |
| `backups/`        | —                              | Backup data                                            |

## Running / building

    # From repo root: runs frontend + backend together (concurrently)
    npm start

    # Backend only: esbuild transpiles src/ -> build/ (~1 s, NO type-check), then runs it
    cd backend && npm start        # = npm run build && node build/index.js

    # Backend with the old full path: tsc type-check + emit, then run
    cd backend && npm run start:checked

Because `npm start` skips type-checking, run `npm run typecheck` in `backend/`
after any backend change (see Type-checking below).

    # Frontend only (Vite dev server on http://localhost:7000)
    cd frontend && npm run start

- Ports: backend API **3001**, websocket **3002**, frontend dev server **7000**.
- The frontend finds the backend through the gitignored
  `frontend/src/configuration.json` (`ip`, `port`, `webSocketPort`). If `ip` is a
  loopback host (`localhost`) and the page was opened from another host (a phone
  at `http://<LAN-IP>:7000`), `resolveBackendHost` in
  `service/configuration/configuration.service.ts` uses the page's host instead.
  Build backend URLs through it, never from `ConfigData.ip` directly. Absolute
  backend URLs that arrive from another device (e.g. the media `url` the sender
  posts to `/alexa/state`) go through `toReachableBackendUrl`.

- Backend compiles to `backend/build/` (`rootDir: src`). **Do not add loose `.js`
  files under `backend/src`** — they break `npx tsc` (TS5055/TS6059); put scripts
  elsewhere or add them to `backend/tsconfig.json` `exclude`.
- First run with no `keys.json`/`configuration.json` starts a minimal setup
  server (`backend/src/setup/`), then `bootstrapApp()`.

## Type-checking

    # Backend: must pass cleanly
    cd backend && npx tsc --noEmit -p .

    # Frontend: TypeScript is 4.9.5, which does not understand the tsconfig's
    # `moduleResolution: bundler`, so override it
    cd frontend && npx tsc --noEmit -p . --moduleResolution node

The frontend check has **pre-existing errors** you can ignore unless you touched
those files: the tsconfig TS6046 line itself, `data-model/configuration.ts`
(~line 95) and `configurationMock.ts` union types, `reportWebVitals.ts`
(`web-vitals`), `Desktop.tsx` `autoFocus` on a `div`, and MUI `slotProps.paper`
in several Desktop widgets. Judge your change by "no **new** errors".

## Running it locally to verify a change

- `.claude/launch.json` (gitignored) has `backend` and `frontend` configs for the
  browser preview. The backend takes a while to compile and boot; poll an endpoint
  (e.g. `curl http://localhost:3001/desktop/profiles`) until it answers before
  loading pages, otherwise the frontend silently falls back to mocks.
- If ports 3001/3002/7000 are already taken, it is almost always the owner's
  own leftover `npm start`. You **may kill it** to run your tests: find the PIDs
  with `netstat -ano | grep -E ":(3001|3002|7000) .*LISTEN"` and stop them with
  `taskkill //PID <pid> //T //F` (from Bash). Then start the `backend` and
  `frontend` preview configs. A second backend cannot run alongside, because the
  websocket port 3002 is fixed. Leaving the old backend up means it serves the
  **old** build, so new endpoints 404 and the UI falls back to mocks.
- The local `backend/keys.json` is a dev setup (`is_dev_mode_enabled`,
  `is_backup_disabled`, `connect_to_telegram: false`), so running locally sends
  no Telegram messages and uploads no backups. Do **not** flip those flags to
  test something — e.g. the weekly backup would upload to Google Drive.
- Tests touch real data under `backend/data/`. Back up any file you will mutate
  (to the scratchpad) and restore it afterwards, with the servers stopped.
- The Configuration page renders API keys in its inputs: never dump all page
  inputs/text there; query only the elements you need.
- After a backend change, **restart the `backend` preview** (`preview_stop` +
  `preview_start`): the running process keeps serving the old build.

### Browser pane gotchas
- Click by element `ref` (from `find`/`read_page`), not screenshot coordinates:
  screenshots are scaled, and a miss on a dialog's backdrop closes it.
- Confirm a click did what you expected with `read_network_requests` (a click
  right after a dialog closes can be lost).
- A file download shows as `200 OK [FAILED: net::ERR_ABORTED]`: that is success.
- Check horizontal overflow with the `mobile` preset and
  `document.documentElement.scrollWidth` vs `clientWidth`, not by eye. A
  `maxWidth: '100%'` child does not shrink inside a flex column with no width.
- `find` may not match an icon-only button by its `aria-label`/`title`. Fall
  back to `document.querySelector('[aria-label="…"]').click()` in
  `javascript_tool`. The same applies to deep navigation inside a picker dialog.
- When a page's text is not in the accessibility tree, the API response is the
  fastest proof: fetch its body with `read_network_requests` and its `requestId`.
- Screenshots can catch MUI animations mid-way (e.g. the Tabs indicator); check
  state (`aria-selected`) before calling it a bug.

### Editing gotchas
- The Bash tool mangles backslashes in heredocs (`\r`, `\\` in a regex end up
  wrong). Edit code with backslashes using the Edit tool.
- Edit `locales/es.json` / `en.json` with the Edit tool, not by re-serialising
  them with a script: that reformats unrelated hand-aligned lines.

## Architecture quick map (backend)

- `src/index.ts` — entry point; installs a global `unhandledRejection` safety net
  (a single network failure must never kill the process).
- `src/API/api.service.ts` — the big Express router; every feature registers its
  endpoints here. Each feature has a `*.service.ts` sibling in `src/API/`.
- `src/smartHome/` — the "Auto" page backend (Tuya/Tapo/eWeLink). See the
  `smart-home` skill.
- `src/*RSS/`, `src/processAutoupdate/`, `src/workerModule/` — RSS sources and
  background update workers.
- `src/recommendation/` — the `/rss` "Recomiéndame" recommender (RAM-only
  ranking, `data/config/recomendaciones.json` for dismissals, 6:30 Telegram
  digest). Its hooks are registered from `setup/bootstrap.ts`. See `rss-page`.
- `src/musicMood/` — the Cloud "Lista por ánimo" playlists. A no-AI nightly
  audio analysis (ffmpeg + hand-written DSP) builds the regenerable
  `data/music-mood/index.json`. The analysis pauses through `addBusyCheck` while
  RSS updates or MP3 conversions run, and every Cloud write endpoint calls
  `MusicMoodService.Instance?.markDirty()`. See `music-mood`.
- `src/telegramBot/` — Telegram bot (`TelegramBot.Instance()`).
- `src/youtube/` — the `/youtube` page's `youtubei.js` runs in a **child process**
  (`youtube.worker.ts`, forked by `youtubeLib.ts`), not in the backend. It is **not**
  a `backend/package.json` dependency: each version is npm-installed into the
  gitignored `backend/youtube-lib/<version>/` (with a `loader.mjs` entry), and
  `youtube-lib/active.json` names the one in use. `POST /youtube-page/update`
  installs the latest, starts a new worker and swaps to it without restarting the
  backend; the old folder is deleted. Never `npm install youtubei.js` in `backend/`.
- `src/API/synchronize.service.ts` — zip export/import of `data/`;
  `reloadAllServices()` resets in-memory caches after an import.
- `src/utils.ts` `startBackupEveryWeek` — the weekly encrypted backup zip (an
  explicit `filePairs` list). See the `data-files-and-backups` rule.
- `data/` (relative to the backend cwd) — persisted JSON state;
  `data/config/` holds user-editable lists and the desktop profiles.

## Architecture quick map (frontend)

- `src/view/Routes.tsx` — route table (`routesFTAH`); pages grouped by section
  (`Cloud`, `Internet`, …); `isFullscreen` hides the menu chrome.
- `src/core/actions/*.ts` — one file per feature, calls the backend via
  `fetch-utils` using endpoints from `src/core/urls-and-end-points.ts`.
- `src/data-model/*.ts` — response types + mocks.
- `src/view/pages/<Name>/` — page components.
- i18n: some pages (e.g. Configuration) use `react-i18next` (`useTranslation`)
  with `src/locales/es.json` + `en.json` — add every new key to **both**. Other
  pages (e.g. Desktop) hardcode Spanish strings; follow the file you are in.
- `fetch-utils` returns the supplied **mock** when a request fails, so a broken
  endpoint looks like "fake data" in the UI rather than an error.
- `/alexa` (hidden, fullscreen) is the live-cast **receiver**, usually left open
  on an Android phone wired to a speaker; it keeps the screen on while music
  plays. See the `alexa-live` skill.
- The browser pane blocks a LAN-IP page from calling `:3001`
  (`ERR_BLOCKED_BY_CLIENT`). To check LAN access, curl the backend on the LAN IP
  with an `Origin` header instead.

## Non-negotiable rules

Read the relevant rule before touching that area:

- @.claude/rules/secrets-and-config.md
- @.claude/rules/telegram-guard.md
- @.claude/rules/crash-safety.md
- @.claude/rules/git-workflow.md
- @.claude/rules/data-files-and-backups.md

## Skills (loaded on demand)

- `smart-home` — the Auto page: Tuya/Tapo/eWeLink providers, `entityId` scheme,
  Python `tapo` helper, TPAP troubleshooting, adding a provider/device.
- `backend-api-service` — add a new backend feature (`*.service.ts` + register in
  `api.service.ts`) and the RSS module pattern.
- `frontend-page` — add a React page (route, action, data-model, websocket page).
- `desktop-page` — the Desktop page: profiles, RAM + flush persistence, config
  normalization, normal/tablet/mobile modes, widget coordinates and zoom.
- `alexa-live` — casting music/video to the `/alexa` receiver: Live button,
  `/alexa/*` endpoints, cross-device `localhost` URLs, keep-screen-on on Android.
- `rss-page` — `/rss`: message string format, categories and the IR handler,
  card buttons and parallel arrays, gradual images and scroll Fabs, Guardados,
  the "Recomiéndame" recommender + daily Telegram digest, ftahApp feeds.
- `cloud-page` — the Cloud file browser: toolbar, row actions (zip/extract),
  `.m3u8` playlist files (IP-independent relative entries, `/cloud/raw`),
  hidden dotfiles, music queue from folders, testing with throwaway folders,
  reusing the multi-select picker and downloads from other pages.
- `mp3-converter` — `/cloud/mp3-converter`: folder converter and "Pendrive del
  coche" tabs, ffmpeg re-encode + zip job, progress/log sync, testing with
  generated audio.
- `music-mood` — mood playlists and "Como esta lista…" on the Cloud player:
  nightly analysis, index and fingerprints, mood rules, settings in
  Configuration › Otros, and measuring/tuning quality with a leave-half-out test.
- `ftah-app` — build the Flutter `ftahApp`, window/icon setup, Supabase settings,
  GitHub Actions.
