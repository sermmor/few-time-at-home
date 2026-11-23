---
name: backend-api-service
description: Add or modify a backend feature in Few_Time@Home — a new *.service.ts under src/API and its HTTP endpoints, or an RSS source/worker. Use when wiring new backend endpoints into api.service.ts.
---

# Backend API service pattern

The backend is Node + Express 5 + TypeScript. Every feature is a service class
with a sibling `*.service.ts` file in `backend/src/API/`, and all HTTP routes are
registered in the central router `backend/src/API/api.service.ts`.

## Adding a feature service
1. **Create** `backend/src/API/<feature>.service.ts`. Common shape is a class
   with a `static Instance` singleton set in the constructor, async methods, and
   full try/catch (see the crash-safety rule).
2. **Declare endpoint paths** in `api.service.ts` as a `static` object, e.g.:

       static smartHomeEndpoint = {
         status:   '/smart/status',
         devices:  '/smart/devices',
         turnOn:   '/smart/device/turn-on',
         ...
       };

3. **Register routes** in a private method of `APIService` (e.g.
   `private smartHomeService() { ... }`) that instantiates the service and wires
   `this.app.get/post(...)`, then **call that method** from where the other
   `this.xxxService()` calls are made (around the service-init block).
4. Keep response shapes in sync with the frontend `data-model` + action files.
5. If the feature can notify via Telegram, follow `telegram-guard.md`.
6. If it persists a JSON file under `data/`, follow `data-files-and-backups.md`
   (weekly backup `filePairs`, `reloadFromDisk()` in `SynchronizeService`,
   lazy reads, optional fields for old files).
7. Comments in Spanish.

## RSS sources & background workers
- RSS source modules live in `src/blogRSS/`, `src/channelMediaRSS/`,
  `src/mastodonRSS/`, `src/nitterRSS/`, `src/youtubeRSS/`.
- Background auto-update flows live in `src/processAutoupdate/` and
  `src/workerModule/`. The media auto-update (`mediaRSSAutoupdate.ts`) takes a
  `connectToTelegram` flag — respect it (telegram-guard rule).
- Anything about the `/rss` page, its feeds in RAM, Guardados or the
  recommender: load the `rss-page` skill.

## Build gotchas
- Backend compiles with `npx tsc` (`rootDir: src`, output `build/`). **Do not put
  loose `.js` files under `src/`** or tsc fails (TS5055/TS6059). Use
  `tsconfig.json` `exclude` for anything that must live there.
- Secrets come from `keys.json` / `configuration.json` (gitignored); runtime
  state from `vars.json`. See `secrets-and-config.md`.
