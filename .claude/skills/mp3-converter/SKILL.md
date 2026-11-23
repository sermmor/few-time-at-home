---
name: mp3-converter
description: Work on the Few_Time@Home MP3 converter page (/cloud/mp3-converter) — the "Vídeo/Audio a Mp3" folder converter tab and the "Pendrive del coche" tab that re-encodes a multi-selection of Cloud folders/files to a lower bitrate and zips them into cloud/01_CONVERTIDOS. Use when changing either tab, the ffmpeg conversion, the progress/log sync, or when testing conversions.
---

# MP3 converter page

Route `/cloud/mp3-converter`. `Mp3Converter.tsx` is only the container: a title
plus MUI `Tabs` (chosen tab in `localStorage` key `ftah.mp3Converter.tab`).
Both tabs stay **mounted** and are hidden with `display:none`, so a running
conversion's progress and log survive switching tabs. Keep it that way.

UI text uses `react-i18next`: `mp3.*` (folder tab, page title) and `mp3car.*`
(pendrive tab) in **both** `locales/es.json` and `en.json`. Backend log lines
are hardcoded Spanish.

## Files
Frontend (`view/pages/Mp3Converter/`):
- `Mp3Shared.tsx` — shared look: `MP3_PANEL_WIDTH` (40rem), `Mp3ProgressPanel`
  (file name, right text, bar, footer; green/red end states), `Mp3LogArea`
  (read-only monospace textarea that auto-scrolls), `useElapsedSeconds`,
  `formatElapsed`, `shortenFilename`. Use these in any new tab.
- `Mp3FolderConverterTab.tsx` — old converter: folder → folder, video or audio,
  websocket `mp3_progress`, log via `stillConverting` long-poll.
- `Mp3CarUsbTab.tsx` — pendrive tab (see below).
- `core/actions/carUsbMp3.ts`, `data-model/mp3Converter.ts` (+ mock),
  `core/urls-and-end-points.ts`.
- `view/molecules/ModalCloudMultiSelect/` — multi-select Cloud picker (see the
  `cloud-page` skill).

Backend (`src/convertToMp3/`):
- `convertToMp3.ts` — old folder converter.
- `carUsbJob.ts` — `CarUsbMp3Job` singleton (`CarUsbMp3Job.Instance`), exports
  `CAR_USB_OUTPUT_FOLDER = 'cloud/01_CONVERTIDOS'` and `carUsbBitrateList`.
- Endpoints in `api.service.ts` inside `converterToMp3Service()`:
  `APIService.carUsbMp3 = { start, status, cancel }` →
  `POST /car-usb-mp3/start {items, bitrate}` → `{ok, message}`,
  `GET /car-usb-mp3/status?logFrom=N`, `POST /car-usb-mp3/cancel`.

## Rules worth knowing
- **Mutual exclusion**: only one converter runs at a time. The pendrive `start`
  refuses while the old converter is busy (`!isFinishedConverter`), and the old
  video/audio endpoints refuse while `carUsbJob.isRunning()`. A new converter
  must join this check.
- **Paths** are relative to the cloud root (`cloud/...`; first segment = drive).
  Everything goes through `toSafeAbsolute`, which rejects paths escaping the
  root. Never build absolute paths from request input directly.
- **Zip layout**: each selected folder becomes a top-level folder in the zip
  (its tree preserved); loose files go to the root; top-level name collisions get
  ` (2)`. Non-audio files are skipped and logged (`· Ignorado`). Dotfiles are
  skipped. Every audio file is re-encoded (no ffprobe skip):
  `libmp3lame`, chosen bitrate, 44100 Hz, metadata kept (`-map_metadata 0`,
  `-id3v2_version 3`).
- **Temp folder** `01_CONVERTIDOS/.tmp-<stamp>` starts with a dot so pickers
  and the Cloud page's "·" toggle hide it; it is always removed (done, error or
  cancel). The zip is
  `pendrive_<stamp>.zip`, uncompressed (mp3 does not compress).
- **Failures**: a failing file is logged (`✗ … Error en`) and counted; the job
  continues. No audio found, or every file failed → state `error`, no zip.
  ffmpeg errors contain the absolute server path and newlines: pass them through
  `cleanFfmpegError` before logging.
- **Cancel** kills ffmpeg with SIGKILL. It is refused during `zipping` (the zip
  would be left half-written) and the UI disables the button then.

## Progress and log sync (pendrive tab)
- The job broadcasts `car_usb_progress` snapshots over the websocket; the tab
  also polls `status` every 1 s while running (fallback, and the only way to get
  log lines).
- The log is fetched incrementally: `status?logFrom=N` returns lines from `N`
  and `logNext`. The backend caps the log (5000 lines) and keeps `logOffset` so
  indexes stay valid.
- Every job has a `jobId` (start time; 0 = none). If the tab sees a different
  `jobId` it reloads the log from 0. Without this, a job started from **another
  device** while the page is open mixes the old job's lines with the new one's
  and loses its first lines. Keep any new log/progress field job-scoped.
- On mount the tab calls `getStatus(0)`, so opening the page mid-conversion (or
  from another device) shows the running job.
- Overall bar = `(done + currentPercent/100) / total`; indeterminate while
  scanning/zipping. "Quedan X de Y" = `total - done`.
- Selection and bitrate persist in `localStorage` (`ftah.carUsb.selection`,
  `ftah.carUsb.bitrate`), wrapped in try/catch.
- Download reuses the Cloud download:
  `CloudActions.downloadFile({ drive: zipPath.split('/')[0], path: zipPath })`.

## Layout
Each tab root is `width: MP3_PANEL_WIDTH, maxWidth: '100%'`. The 40rem panels
use `maxWidth: '100%'`, which only works if the parent has a width: a flex
column without its own width lets them overflow horizontally on phones. Check
with the browser's `mobile` preset and `document.documentElement.scrollWidth`
vs `clientWidth` (not by eye).

## Testing
- Restart the `backend` preview after any backend change; otherwise the old
  build keeps serving (new fields missing, new endpoints 404 → UI mocks).
- Throwaway data in `rootCloud/cloud/zz_test_car/` (or `_claude_test_*`), e.g.:
  a 320k mp3 inside `Album A/`, a `.flac` inside `Album A/CD1/`, a `cover.jpg`,
  a loose mp3, and a text file renamed `05 roto.mp3` to force an ffmpeg error.
- Generate audio without downloading anything, with the bundled ffmpeg:

      backend/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe -f lavfi -i "sine=frequency=440:duration=1200" -b:a 320k largo.mp3

  A 20-minute file gives time to test Cancel; 20 s files finish almost at once.
- Check output bitrate with `ffmpeg.exe -hide_banner -i file.mp3` (`bitrate:`
  line). Unzip the result in the scratchpad to check the folder layout.
- Drive jobs with curl to test "another device":
  `curl -X POST -H "Content-Type: application/json" -d '{"items":["cloud/zz_test_car/largo.mp3"],"bitrate":96}' http://localhost:3001/car-usb-mp3/start`
  then `status?logFrom=0` and `cancel`.
- Clean up: `rm -rf` the test folder, and `rootCloud/cloud/01_CONVERTIDOS` if it
  did not exist before the test (otherwise only the `pendrive_*.zip` you made).
