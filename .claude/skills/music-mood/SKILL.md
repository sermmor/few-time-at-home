---
name: music-mood
description: Mood playlists for the Cloud music player ("Lista por ánimo" toolbar button on /cloud/files) — the nightly no-AI audio analysis (ffmpeg + hand-written DSP), the fingerprinted index in data/music-mood/, mood rules over library percentiles, the "Como esta lista…" similarity mode, the settings in Configuration › Otros, pausing while RSS/MP3 jobs run, and how to measure and tune playlist quality. Use when touching backend/src/musicMood, ModalMoodPlaylist, or the music-mood endpoints.
---

# Music mood playlists

Like the "mood" lists of an old Sony MP3 player. The user picks a mood (or a pattern
folder/songs) and a song count. The backend builds a list from the songs **already
analyzed** in the current Cloud folder and its subfolders. The result replaces the
player queue or is appended to it.

Hard constraints from the owner:
- **No AI models.**
- Analysis only at night, or on "Analizar ahora".
- Analysis **pauses** while RSS updates or MP3 conversions run.
- Minimal SD-card writes.

## Files
Backend, under `src/musicMood/`:
- `dsp.ts` — pure DSP over mono Float32 at 11025 Hz: RMS, spectrum, chroma/key,
  onset envelope and tempo, and `camelotDistance`. It has no dependencies.
- `audioFeatures.ts` — `analyzeSong(file)`. ffmpeg (`@ffmpeg-installer`, there is
  no ffprobe) decodes **3 × 10 s** chunks at low priority. Returns `SongFeatures`
  or `undefined` and never throws.
- `moodIndex.ts`:
  - `data/music-mood/index.json`: `files[rel] = [size, mtimeMs, fingerprint]` and
    `songs[fp] = { f } | { failed }`.
  - The fingerprint is size plus a hash of the first and last 64 KB, so a
    rename or move does not re-analyze the song.
  - `walkCloud` scans the `cloud` drive only (not trash) and skips ignored paths.
    **It follows symbolic links.** On the Pi, `cloud/Música` is a link to another
    disk. A `Dirent` from `readdir(..., { withFileTypes: true })` reports a link
    as neither `isDirectory()` nor `isFile()`, so links are resolved with
    `stat`. A walk that silently skipped them reported
    "Cloud revisada: 0 nuevas, 0 quitadas".
    Each real folder (`realpath`) is walked once, so link loops are safe. If the
    same folder is linked twice, only the first name gets indexed.
    Indexed paths keep the link's name (`cloud/Música/...`), and ignored paths
    match those logical paths.
    Test with `fs.symlinkSync(target, link, 'junction')` in a scratchpad root
    (junctions need no admin rights on Windows).
- `moods.ts`:
  - `buildLibraryStats` turns every feature into a **percentile of the owner's own
    library**.
  - `buildProfile` gives the axes (`energia, valencia, baile, dinamica, brillo`)
    plus `timbreZ`. `MOOD_TARGETS` holds one target per mood, and `moodDistance`
    measures against it.
  - `songDistance(a, b, axesWeight = 0.5)` is normalised so ~1 is a typical
    distance (axes ≈ 0.54, timbre ≈ 1.37).
  - `transitionCost` = songDistance + tempo + Camelot key.
- `moodPlaylist.ts`:
  - `buildMoodPlaylist` and `buildSimilarPlaylist` (`SIMILAR_MODE = 'comoLista'`).
  - Candidates are deduped by fingerprint.
  - `pickAndOrder` does a weighted random draw from a pool of
    `max(2×count, count+5)`, then a greedy DJ-style ordering by
    `transitionCost + distance`.
  - Pattern mode: distance = mean of the `SEED_NEIGHBOURS = 3` nearest pattern
    songs, with `SEED_AXES_WEIGHT = 0.25` (timbre-heavy).
- `moodSettings.ts` — `data/config/musicMood.json` holds `startHour`, `endHour`
  (equal means no nightly run) and `ignoredPaths`, which defaults to
  `cloud/01_CONVERTIDOS`. It is in the weekly backup.
- `musicMood.service.ts` — the `MusicMoodService` singleton:
  - It keeps the index in RAM, loaded lazily.
  - A `node-schedule` job runs at `startHour:05`.
  - `addBusyCheck(label, isBusy)` registers pauses. The RSS check is added in
    `setup/bootstrap.ts`; the MP3 converter check is in `api.service.ts`.
  - `markDirty()` is called from every Cloud upload, move or delete endpoint,
    and costs RAM only.
  - It saves only when something changed, every 500 songs.
  - `reloadFromDisk()` runs after a sync import. A `generation` counter stops a
    running analysis from saving a stale index.

Endpoints (`APIService.cloudEndpointList`), all under `/cloud/music-mood/`:
- `status` (GET);
- `analyze-now` and `stop` (POST);
- `settings` (GET and POST);
- `playlist` (POST `{ folderPath, mood, count, seedPaths?, includeSeedSongs? }`,
  which returns `songs`, `analyzedInFolder/totalInFolder` and, in pattern mode,
  `analyzedInSeed/totalInSeed`).

Frontend:
- `view/pages/Cloud/ModalMoodPlaylist.tsx` is the popup:
  - It offers the mood select plus "Como esta lista…".
  - The pattern picker is `ModalCloudMultiSelect` filtered to audio files.
  - The last pattern is kept in `localStorage` under `ftah.cloud.moodSeed`.
- `Cloud.tsx` `onMoodPlaylistResult` fills or appends the queue, with snackbars
  for empty, partial and partial-pattern results.
- `Configuration/Components/MusicMoodSettingsBlock.tsx` (inside `OthersSection`)
  holds the window hours, ignored paths, status, "Analizar ahora" and "Parar".
- `core/actions/musicMood.ts`, `data-model/musicMood.ts`, and the i18n keys
  `cloud.moodPlaylist.*` (in both locales).

## Design decisions worth keeping
- **The index is regenerable**, so it is deliberately **not** in the weekly backup
  (the sync export still zips it with all of `data/`). The settings file **is**
  backed up.
- The pattern-mode search ignores `ignoredPaths` when resolving pattern paths.
  Ignored folders are never analyzed, though, so they yield
  `analyzedInSeed = 0`. The UI shows `noSeedSongs` in that case.
- The playlist only uses songs analyzed so far. The response counts let the UI
  warn that a folder is only partly analyzed.
- Moods are relative to the library. Adding very different music shifts the
  percentiles, which is fine.

## Measuring quality (do this before tuning)
Do not judge by a single listen. Use a scratchpad script over the real index and
the **built** module:

```js
const m = require('<repo>/backend/build/musicMood/moods.js');
const idx = JSON.parse(fs.readFileSync('<repo>/backend/data/music-mood/index.json'));
// one entry per fingerprint → buildLibraryStats → buildProfile
```

**Leave-half-out test** (for the similarity mode):
- For every folder with 8 songs or more, take the even-numbered songs as the
  pattern.
- Measure **recall@30** of the odd-numbered songs among the remaining songs.
- Random ≈ 0.08.

Results on 406 songs and 18 folders:

| axes weight | k=3 recall@30 |
|---|---|
| 0 (timbre only) | 0.38 |
| **0.25** | **0.41** (chosen) |
| 0.5 | 0.32 |
| 1 (axes only) | 0.16 |

Eclectic folders (e.g. a film soundtrack mixing surf, soul and dialogue) score
~0 with any weighting. That is expected, not a bug. Known weak moods:
**Épico** and **Fiesta**.

Tuning one mode must not change the other: pass a weight to `songDistance` rather
than changing its default, since `transitionCost` uses it too.

## Testing
- `data/music-mood/` and `data/config/musicMood.json` **do not exist** on a fresh
  checkout. Delete both after testing (with the servers stopped), unless they
  existed before.
- Build an index fast with "Analizar ahora" (Configuration › Otros, or
  `POST /cloud/music-mood/analyze-now`). Poll `status` until `state` is `idle`.
  Around 400 songs take several minutes on a PC.
- Real music lives under `rootCloud/cloud/Audio/...`. Get exact relative paths
  from the index keys (`Object.keys(index.files)`) instead of guessing folder
  names.
- In the browser, the toolbar button has `aria-label="Lista por ánimo"` and only
  shows on the `cloud` drive. `find` may miss it, so
  `document.querySelector('[aria-label="Lista por ánimo"]').click()` works.
  The playlist response is easiest to check with `read_network_requests`.
- Pause the `<audio>` and remove `ftah.cloud.moodSeed` from `localStorage`
  afterwards.
