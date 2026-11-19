# Rule: secrets & config files

## Never commit secrets
These files are **gitignored** and hold real credentials/config. Never commit
them, never paste their contents anywhere external, never print secret values
back in chat:

- `keys.json` (repo root / backend cwd) — API keys, Telegram token, and the
  `smart_home` block (Tuya/Tapo/eWeLink credentials).
- `configuration.json` — app configuration.
- `ftahApp` / Flutter `supabase_config.dart` — Supabase URL + anon key.
- `vars.json` (repo root) — **local runtime state** (e.g. whether the Python
  `tapo` install was already attempted). Gitignored on purpose.

The user's email address is private: never send it to any external service.

## When a feature needs a gitignored value
If a feature needs something that lives in a gitignored file, **add an in-app
settings screen** so the user enters it, rather than hardcoding or requiring a
hidden file. (This is what we did for the Supabase credentials in `ftahApp`.)

## Do not pollute committed lockfiles
`backend/package-lock.json` **is committed**. Do **not** introduce anything that
rewrites it with install-time side effects:

- No `postinstall` scripts in `backend/package.json` — a `postinstall` sets
  `hasInstallScript: true` in the lockfile, which we do not want committed.
- Install-on-demand logic (e.g. the Python `tapo` helper) lives in backend
  startup code gated by `vars.json`, **not** in npm lifecycle scripts. See
  `backend/src/smartHome/ensurePythonTapo.ts`.
