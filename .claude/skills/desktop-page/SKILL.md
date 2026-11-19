---
name: desktop-page
description: Work on the Few_Time@Home Desktop page (/desktop) — desktop profiles and their JSON files, the RAM + flush persistence flow, remote (Google Drive) profiles, config normalization, normal/tablet/mobile modes, the properties dialogs, free-floating widgets (notes, links, images, panels), their coordinate system and the desktop zoom. Use when adding a desktop setting or widget, or when testing anything on /desktop.
---

# Desktop page

A virtual desktop: a grid of workspaces (rows × cols, Shift+arrows to switch)
with a wallpaper per workspace and free-floating widgets. UI strings in these
files are hardcoded Spanish (no i18n); comments in Spanish.

## Files
Frontend, `frontend/src/view/pages/Desktop/`:
- `Desktop.tsx` — owns the config state and every add/update/delete handler,
  renders the **normal** mode canvas and the right-click menu, and picks the mode:
  `config.mobileMode` → `DesktopMobile`, `config.tabletMode` → `DesktopTablet`,
  else normal.
- `DesktopPropertiesDialog.tsx` — "Propiedades del escritorio" for normal +
  tablet mode (grid size, zoom, wallpapers). Mobile mode uses
  `DesktopMobilePropertiesDialog.tsx`.
- Widgets: `StickyNoteWidget`, `DesktopLinkWidget`, `DesktopImageWidget`,
  `DesktopPanelWidget` (free-floating), `DesktopTabletLinkTile` /
  `DesktopMobileLinkTile` (grid tiles).
- `DesktopCommons.tsx` — canvas geometry constants, slide animation,
  `wallpaperUrl`, `DesktopZoomLayer`.
- `frontend/src/core/actions/desktop.ts` — `DesktopConfig` type,
  `DEFAULT_DESKTOP_CONFIG`, `getDesktopConfig` / `saveDesktopConfig` /
  `flushDesktopConfig`, profile actions, `getDesktopZoom`.

Backend, `backend/src/API/`:
- `desktopProfiles.service.ts` — profiles on disk in
  `data/config/desktop/<name>.json`, metadata (`activeProfile`,
  `remoteProfiles`) in `data/config/desktopMeta.json`.
- `configuration.service.ts` — `type === 'desktop'` reads/writes go to the
  active profile; `flushDesktopToDisk()`.
- `api.service.ts` — `desktopProfilesEndpoint` (list/create/duplicate/activate/
  make-remote/delete) and `/desktop/flush`.
- `desktopRemote.service` — Google Drive sync for **remote** profiles.

## Persistence flow (important)
1. Load: frontend POSTs `{ type: 'desktop' }` to the configuration list endpoint.
   For a remote profile the backend first **pulls it from Google Drive**.
2. Every edit calls `saveDesktopConfig(config)`, which POSTs
   `{ type: 'desktop', content }`. The backend stores it **in RAM only**
   (`setActiveConfig`) and marks it dirty.
3. It is written to disk (and, if remote, **pushed to Drive**) only on flush:
   component unmount, `beforeunload` (`sendBeacon`), sync export, or
   `POST /desktop/flush`.

So when you check a profile file on disk, flush first:
`curl -X POST http://localhost:3001/desktop/flush -H "Content-Type: application/json" -d '{}'`.

The backend stores whatever object it receives: it does not validate fields.
But **`getDesktopConfig` on the frontend rebuilds the object field by field and
drops unknown fields**, and the next save would then erase them from the file.

## Adding a config field (e.g. a new setting)
Follow `data-files-and-backups.md` (backward compatibility):
1. Add it as **optional** to `DesktopConfig` in `core/actions/desktop.ts` and to
   the backend `DesktopConfig` interface (documentation only).
2. Preserve it in `getDesktopConfig`, only when present:
   `...(typeof d.zoom === 'number' ? { zoom: d.zoom } : {})`.
   Do **not** add it to `DEFAULT_DESKTOP_CONFIG` / backend `EMPTY_CONFIG` if that
   would make it get written into old files.
3. Add a getter that applies the default and clamps (pattern: `getDesktopZoom`).
4. In the properties dialog, keep local state re-synced in the `isOpen`
   effect. In `handleSave`, set the field on `next` only if it already existed
   or the user changed it. `handleSave` spreads `...config`, so other fields
   survive.
5. If it should apply in tablet/mobile mode too, pass it down as a prop to
   `DesktopTablet` / `DesktopMobile`.

## Widget coordinate system and zoom
- Free-floating widgets are absolutely positioned with `left/top/width/height`
  in **desktop px** (`x, y, width, height` in the config). Drag/resize compute
  from `MouseEvent.clientX/Y` deltas.
- The desktop zoom (`config.zoom`, default 1 = 100%, range 0.5–2) is applied by
  `DesktopZoomLayer`: a `transform: scale(zoom)` layer with
  `transform-origin: 0 0`, sized `100/zoom %` so that it still fills the canvas.
  It wraps the widgets only. The wallpaper, the slide animation, the workspace
  switcher overlay, the tablet arrows/toolbar and the top app bar stay unscaled.
- Because of the scale, **screen px ≠ desktop px**. Every widget takes a
  `zoom` prop and divides mouse coordinates by it (`(ev.clientX / zoom)`). New
  items placed from the context menu convert with
  `(contextMenu.x - rect.left) / zoom`. Context-menu and popover positions stay
  in screen px, because MUI renders them in a portal.
- When you add a new free-floating widget: put it inside `DesktopZoomLayer`,
  give it a `zoom` prop, and divide its mouse math by it.

## Link favicons
- Backend `favicon.service.ts` caches files in `data/favicon/<name>.<ext>`, where
  `<name>` is the second-level domain label, so links on the same site share one
  file. `POST /desktop/get-favicon { url, force? }` returns `{ name | null }`.
  `force` re-downloads and falls back to the cached file if the download fails.
- Frontend: `link.favicon` holds that name. Render it with `desktopFaviconSrc(name)`
  from `DesktopCommons` (and use it as the `<img>` `key`). After a forced refresh,
  call `bumpFaviconVersion(name)` so the browser does not show its cached copy.
- The link right-click menus have "Actualizar favicon" (`onRefreshFavicon`, forced).
  The properties dialogs have `DesktopMissingFaviconsSection`, which only fetches
  links without `favicon` (all workspaces) and applies the result immediately.

## Testing
- Test profile: **`pruebaPerfilDefaultDoble`** (local, not remote). Check
  `desktopMeta.json` for the active profile. If you have to switch profiles,
  switch back afterwards.
- **Never test on a remote profile**: flushing it pushes to Google Drive.
- Before mutating anything, copy the profile JSON and `desktopMeta.json` to the
  scratchpad. Restore them **after stopping the servers**, because otherwise a
  later flush from RAM overwrites your restore.
- Loading a profile and saving can normalize the file a little. For example,
  `getDesktopConfig` fills in `mobileMode: false` and `tabletMode: false`. That
  is pre-existing behaviour, not caused by your change.
- In the browser preview, screenshot coordinates can be off for small controls
  inside dialogs. For MUI `Slider`, focus the `input[type=range]` via JS and use
  the arrow keys. To check drag, dispatch `mousedown` on the widget header, then
  `mousemove`/`mouseup` on `document`, and compare `getBoundingClientRect()`
  before and after.
