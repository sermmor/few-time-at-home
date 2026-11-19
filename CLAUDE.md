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
| `frontend/`       | React + MUI + TypeScript (CRA) | The dashboard SPA served to browsers/apps              |
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

    # Frontend only
    cd frontend && npm run start

- Backend compiles to `backend/build/` (`rootDir: src`). **Do not add loose `.js`
  files under `backend/src`** — they break `npx tsc` (TS5055/TS6059); put scripts
  elsewhere or add them to `backend/tsconfig.json` `exclude`.
- First run with no `keys.json`/`configuration.json` starts a minimal setup
  server (`backend/src/setup/`), then `bootstrapApp()`.

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

## Architecture quick map (frontend)

- `src/view/Routes.tsx` — route table (`routesFTAH`); pages grouped by section
  (`Cloud`, `Internet`, …); `isFullscreen` hides the menu chrome.
- `src/core/actions/*.ts` — one file per feature, calls the backend via
  `fetch-utils` using endpoints from `src/core/urls-and-end-points.ts`.
- `src/data-model/*.ts` — response types + mocks.
- `src/view/pages/<Name>/` — page components.

## Non-negotiable rules

Read the relevant rule before touching that area:

- @.claude/rules/secrets-and-config.md
- @.claude/rules/telegram-guard.md
- @.claude/rules/crash-safety.md
- @.claude/rules/git-workflow.md

## Skills (loaded on demand)

- `smart-home` — the Auto page: Tuya/Tapo/eWeLink providers, `entityId` scheme,
  Python `tapo` helper, TPAP troubleshooting, adding a provider/device.
- `backend-api-service` — add a new backend feature (`*.service.ts` + register in
  `api.service.ts`) and the RSS module pattern.
- `frontend-page` — add a React page (route, action, data-model, websocket page).
- `ftah-app` — build the Flutter `ftahApp`, window/icon setup, Supabase settings,
  GitHub Actions.
