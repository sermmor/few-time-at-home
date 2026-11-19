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

    # Backend only: compiles TS then runs the build
    cd backend && npm start        # = npx tsc && node build/index.js

    # Frontend only (Vite dev server on http://localhost:7000)
    cd frontend && npm run start

- Ports: backend API **3001**, websocket **3002**, frontend dev server **7000**.

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

## Architecture quick map (backend)

- `src/index.ts` — entry point; installs a global `unhandledRejection` safety net
  (a single network failure must never kill the process).
- `src/API/api.service.ts` — the big Express router; every feature registers its
  endpoints here. Each feature has a `*.service.ts` sibling in `src/API/`.
- `src/smartHome/` — the "Auto" page backend (Tuya/Tapo/eWeLink). See the
  `smart-home` skill.
- `src/*RSS/`, `src/processAutoupdate/`, `src/workerModule/` — RSS sources and
  background update workers.
- `src/telegramBot/` — Telegram bot (`TelegramBot.Instance()`).
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
- `cloud-page` — the Cloud file browser: toolbar, row actions (zip/extract),
  hidden dotfiles, music queue from folders, testing with throwaway folders.
- `ftah-app` — build the Flutter `ftahApp`, window/icon setup, Supabase settings,
  GitHub Actions.
