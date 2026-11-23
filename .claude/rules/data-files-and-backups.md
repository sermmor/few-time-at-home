# Rule: persisted data files, backups & backward compatibility

The backend persists user state as JSON under `backend/data/` (mostly
`data/config/`). The owner relies on the **weekly backup zip** and on the
**sync export/import** to move that state between machines, so every new
persisted file must be wired into both, and old files must keep loading.

## When you add a new persisted JSON file
1. **Export the path as a constant** from its service (e.g.
   `SAVED_COMMANDS_PATH` in `src/API/savedCommands.service.ts`) instead of
   repeating the string.
2. **Add it to the weekly backup**: `startBackupEveryWeek` in `src/utils.ts`
   builds an explicit `filePairs: { src, dst }[]` list. Add
   `{ src: <PATH_CONST>, dst: '<name>.json' }`. Keep src/dst together in one
   entry; never maintain two parallel arrays (that is how the nitter files were
   once silently missing from the backup).
3. **Reload after a sync import**: `SynchronizeService.reloadAllServices()` in
   `src/API/synchronize.service.ts` overwrites `data/` and then resets caches.
   Give the service a `reloadFromDisk()` that drops its cache, and call it there
   (`MyService.Instance?.reloadFromDisk()` when the singleton may not exist yet).
4. **Read lazily, write safely**: load the file on first access (not at module
   load / in the constructor), treat a missing or corrupt file as empty, and wrap
   writes in `try/catch` (see `crash-safety.md`). Create parent dirs with
   `mkdir(..., { recursive: true })`.

The sync export zips the whole `data/` folder, so files there are exported
automatically. Only the weekly backup needs the explicit entry.

**Exception: regenerable caches.** A large file that the app can rebuild by
itself (e.g. the music mood index `data/music-mood/index.json`, rebuilt by
re-analysing the Cloud) stays **out** of the weekly backup on purpose, to keep
the zip small. Say so in a comment next to its path constant. Its user settings
(`data/config/musicMood.json`) still go in the backup.

**Minimise SD-card writes** for anything a background job updates (the Pi runs
on an SD card). Keep the state in RAM, write only when something actually
changed, batch writes (e.g. every N items plus once at the end), and write
atomically (`.tmp` + `rename`). Never write on every request or every tick.
Cheap "something changed" signals (`markDirty()`) live in RAM only.

## Backward compatibility of stored files
Files written by older versions must keep working; never require a migration
just to add a field.
- New fields are **optional** in both the backend and frontend types, with a
  documented default (e.g. desktop `zoom?: number`, default 100%).
- **Do not write a default value back** into a file the user has not changed.
  Only persist the new field once the user actually changes it (or it already
  existed). This keeps old files byte-for-byte stable.
- Frontend loaders that **rebuild objects field by field** (e.g.
  `DesktopActions.getDesktopConfig`) drop unknown fields: when you add a field,
  add it to the loader too, conditionally (`...(typeof d.x === 'number' ? { x: d.x } : {})`).
- Clamp/validate on read (`getDesktopZoom`) so a hand-edited or corrupt value
  degrades to the default instead of breaking the page.
