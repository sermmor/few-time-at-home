# Rule: crash safety / graceful degradation

The backend runs unattended on a Raspberry Pi. A single network or device
failure must **never** take the whole process down, and the UI must keep working.

## Global net
`src/index.ts` installs a `process.on('unhandledRejection', ...)` handler that
logs and continues (and scrubs bot tokens from the message). Do not remove it.

## Rules when adding network / device / external calls
- Wrap every external call in `try/catch`; on failure, log and degrade (return
  empty/`reachable: false`), do not throw up to the top level.
- **EventEmitter `'error'` events**: libraries like `tuyapi` emit an async
  `'error'` event (e.g. on `ECONNRESET`) that crashes the process if unhandled.
  Always attach a handler — see `smartHome/providers/tuyaProvider.ts`:
  `device.on('error', () => { /* swallow; ops are try/caught */ });`
- **Aggregators** swallow per-source failures: e.g.
  `p.listDevices().catch(() => [])` in `smartHome.service.ts`.
- Best-effort startup helpers (e.g. `ensurePythonTapo.ts`) must have a top-level
  `try/catch` and never throw.
- No network calls in constructors or at module load — do them on demand.

## Result
Running on a foreign network (travel) must still boot the app; unreachable
devices just show "no alcanzable", nothing crashes.
