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
  drives, "·" dotfiles toggle, "Lista por ánimo" mood playlists (only on the
  `cloud` drive, see the `music-mood` skill), sync, up) and the list. Each toolbar button is
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

## Playlist files (.m3u8, VLC-compatible)
The music player can open, edit and save queues as playlist files in the cloud.
- Backend: `src/API/cloudPlaylist.service.ts`, with endpoints
  `POST /cloud/playlist/read { path }` → `{ songs, missing, relocated }` and
  `POST /cloud/playlist/save { path, songs, overwrite }` →
  `{ path, saved, exists? }`. Plus `GET /cloud/raw/*splat`, which streams any
  cloud file (with Range support) so VLC can open a playlist by URL.
- **Why this survives IP changes:** entries are paths *relative to the playlist
  folder* (`../Música/x.mp3`), never URLs. VLC resolves them against wherever
  the playlist came from, either `http://<any-ip>:3001/cloud/raw/...` or a local
  or shared file. Reading is tolerant: it also accepts backslashes, `file://`,
  absolute cloud paths and old backend URLs with any host. A missing song is
  relocated by basename (`listAudioFiles` from `musicMood/moodIndex.ts`); the
  longest common folder tail wins, and a tie stays missing.
- Saving keeps only songs that exist (`saved` is the count kept) and writes
  atomically. Only the `cloud` drive is allowed.
- Escape `%`, `#` and `?` in entries (`escapeM3uEntry`): VLC treats relative
  entries as URIs, so a raw `#` truncates the name.
- **Express 5 `res.sendFile` does not decode the path.** Pass the plain path
  with `{ root: cloudRootPath }`, not the URL-encoded segments, or you get a 404.
- Frontend: `view/pages/Cloud/ModalPlaylistFile.tsx` (`ModalOpenPlaylist`,
  `ModalSavePlaylist`, `VlcLinkField`). Playlist rows get a `QueueMusicIcon`
  (`onPlaylist` on `LabelAndUrlField`). `MusicPlayerBar` shows the list name
  (with ` *` when modified), a save button and "Vaciar la cola". The keys are
  under `cloud.playlistFile.*`.
- Testing: post JSON with Node `fetch` from a scratchpad script. curl from Git
  Bash mangles non-ASCII bodies ("Música" arrives broken). To check with VLC, run
  `vlc --extraintf http --http-password t --http-port 9191 <playlist url>`, query
  `http://:t@localhost:9191/requests/playlist.json`, then kill VLC.

## Reusing the Cloud from other pages
- **Pick several items**: `view/molecules/ModalCloudMultiSelect` (props
  `isOpen`, `onClose`, `onAccept(selection)`, `initialSelection`, `title`,
  `fileFilter`) returns `CloudSelection[]` (`{ path, isFolder }`). It has a
  checkbox per folder/file plus "Abrir" to enter a folder, keeps the selection
  while navigating, hides dotfiles, and shows items inside an already selected
  folder as checked + disabled (selecting a folder drops its selected
  descendants). For a single folder use `ModalCloudBrowser` instead. Used by the
  MP3 converter's pendrive tab (see the `mp3-converter` skill) and by the mood
  playlist's "Como esta lista…" pattern picker.
  When testing, **clicking an item's name toggles its checkbox**. Only the row's
  "Abrir" button enters a folder. The breadcrumb ("Inicio › cloud") goes back up.
- **Any Cloud write endpoint** (upload, move, rename, delete, extract,
  conversions) must also call `MusicMoodService.Instance?.markDirty()`, so the
  nightly mood analysis rescans the Cloud.
- **Download a cloud file** from any page:
  `CloudActions.downloadFile({ drive: path.split('/')[0], path })` (hits
  `GET /cloud/download-file`). In the browser pane the request shows as
  `200 OK [FAILED: net::ERR_ABORTED]` because it is handed off as a download;
  that is success.
- Names starting with `.` are always hidden by `ModalCloudMultiSelect`, but the
  Cloud page shows them unless the "·" toggle is on. So a temp folder inside the
  cloud (e.g. the MP3 converter's `.tmp-*`) can be visible meanwhile: always
  remove it when the job ends.

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
- Folder-name clicks on the Cloud page itself can land on the row's rename
  field. Navigate with the folder link or icon, or by URL, instead.
