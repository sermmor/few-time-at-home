---
name: cloud-page
description: Work on the Few_Time@Home Cloud page (/cloud/files) — the file browser over rootCloud: its toolbar, per-file row actions (zip a folder, extract .zip/.rar, open in viewer/editor, add to the music queue), hidden dotfiles, upload, drives (cloud/trash) and the backend CloudService. Use when adding a cloud action or button, or when testing anything on /cloud.
---

# Cloud page

A file browser over the cloud root (`cloudRootPath` in `configuration.json`,
locally `rootCloud/`). Drives are top-level folders: `cloud` and `trash`.
Relative paths look like `cloud/sub/file.zip`; the backend turns them into
absolute ones with `CloudService.fromRelativePathToAbsolute`.

UI text: `Cloud.tsx` uses `react-i18next` (`cloud.*` keys in **both**
`locales/es.json` and `en.json`). Snackbar messages from `ActionCloudList.tsx`
and backend messages are in English. `ItemListWithFoldersComponent` has
hardcoded Spanish titles.

## Files
Frontend:
- `view/pages/Cloud/Cloud.tsx` — page state (`fileList`, drive, dialogs,
  music `playlist`), builds the rows: folders → `LabelAndTextFieldWithFolder`
  (zip icon), files → `LabelAndUrlField` (open/download, optional extract icon).
- `view/pages/Cloud/ActionCloudList.tsx` — one function per action
  (`zipFolder`, `extractArchive`, upload, move, delete…), each shows a snackbar
  and calls `synchronizeWithCloud(actions)` to reload the folder.
- `view/organism/TitleAndListWithFolders/TitleAndListWithFolders.tsx` — the
  sticky **toolbar** (select, move, photo library, new file/folder, upload,
  drives, "·" dotfiles toggle, sync, up) and the list. Each toolbar button is
  an optional prop: it only renders when the page passes it. This organism is
  shared with Bookmarks, so new buttons must stay optional.
- `view/molecules/ItemListWithFoldersComponent` — per-row delete, "+" (add to
  music queue) and open-in-viewer buttons.
- `core/actions/cloud.ts` + `core/urls-and-end-points.ts` (`cloudEndpointList`)
  + `data-model/cloud.ts`.

Backend: `src/API/cloud.service.ts` (`CloudService`), endpoints in
`api.service.ts` (`APIService.cloudEndpointList`).

## Features worth knowing
- **Extract** (`POST /cloud/extract-archive { relativePathFile }` →
  `{ message, isError }`): `.zip` via `adm-zip`, `.rar` via `node-unrar-js`
  (pure WASM, so no native build and no lockfile install scripts). It extracts
  next to the file, into a folder named like the file without its extension. If
  that folder exists it uses `name (1)`, `name (2)`… Any entry whose path escapes
  the destination (zip-slip, e.g. `../x`) aborts the whole extraction, and the
  half-created folder is removed. It never throws.
- **Hidden dotfiles**: macOS folder uploads bring `.DS_Store` and `._*`
  AppleDouble files. The "·" toolbar button toggles `isHidingDotFiles`
  (per-browser, `localStorage` key `ftah.cloud.hideDotFiles`, default shown).
  `Cloud.tsx` derives `visibleFileList`, which the list and the photo/video/audio
  viewers use. Actions keep using the full `fileList`.
  `._x.zip` files are never offered for extraction.
- **Add folder to the music queue** (`addToPlaylist`): only audio files, never
  dotfiles (a `._song.mp3` passes the extension check) or images.

## Adding a row action for some file types
1. Backend: a method in `CloudService` that returns a message and never throws.
   Add an endpoint in `cloudEndpointList` plus its handler.
2. Frontend: the endpoint, a `CloudActions` function with a mock fallback, and an
   action in `ActionCloudList.tsx` following `zipFolder` / `extractArchive`.
3. Add an optional prop to `LabelAndUrlField` (file rows) or
   `LabelAndTextFieldWithFolder` (folder rows). Pass it from `Cloud.tsx` only for
   matching names. `LabelAndUrlField` is also used by Bookmarks, so keep it
   optional.

## Testing
- Work in a throwaway folder such as `rootCloud/cloud/_claude_test_*`, then
  `rm -rf` it. Deleting from the UI only moves items to `trash/`; if you do
  that, clean `rootCloud/trash` too.
- Prefer testing through the running app (see "Running it locally" in
  CLAUDE.md; free the ports first if an old `npm start` holds them). For a
  quick check of archive code without booting the backend, run `npx tsc -p .` in
  `backend/`. Then `require('backend/build/API/cloud.service.js')` from a
  scratchpad script, create `new CloudService([])`, and override
  `fromRelativePathToAbsolute` on the instance.
- No RAR writer is installed: 7-Zip can only read RAR. Generate a tiny *stored*
  RAR4 with a Python script (marker, main header 0x73, file headers 0x74 with
  method 0x30, end 0x7B; header CRC = low 16 bits of the CRC32), and check it
  with `7z l`. Build path separators with `chr(92)`: a `\\b` typed through the
  shell can turn into a backspace character.
- The music queue: the player bar's "Ver cola de reproducción" button expands
  it. Empty it afterwards ("Eliminar de la cola").
