---
name: ftah-app
description: Work on the Flutter ftahApp (the newest companion app, desktop + mobile) — building per OS, maximized window, app icon, Supabase settings screen, macOS network entitlement, and the GitHub Actions builds. Use for any ftahApp change.
---

# ftahApp (Flutter companion app)

The newest companion app, targeting desktop (Windows/Linux/macOS) and mobile. It
is based on the older `desktopApp` and `mobileApp`. See `ftahApp/README.md`.

## Layout — `ftahApp/lib/`
- `main.dart` — entry point / window setup.
- `core/`, `models/`, `screens/`, `services/`.
Platform folders: `android/`, `ios/`, `macos/`, `linux/`, `windows/`, `web/`.
Shared assets in `ftahApp/assets/`.

## Known setup & gotchas (already in place — preserve them)
- **Window mode (desktop):** the app launches **maximized, not fullscreen**, on
  Windows and Linux. Keep this if touching window/startup code in `main.dart`.
- **App icon:** reuses `mobileApp`'s custom icon across all platforms (Windows
  `.ico`, macOS PNGs generated from the Android `ic_launcher.png`). Regenerate all
  platform icons if the source icon changes — the Windows executable and taskbar
  icon come from the platform-specific icon files, not just `pubspec.yaml`.
- **Supabase config:** `supabase_config.dart` is **gitignored**. Credentials are
  entered through an **in-app settings screen** (not a hidden file), so CI builds
  do not need the secret. See `secrets-and-config.md`.
- **macOS networking:** Tiempo (weather) and RSS need the
  `com.apple.security.network.client` entitlement in the macOS entitlements files,
  or network calls silently fail.
- **RSS parsing:** list data is **`\n`-separated** (not `|`-separated). The copy
  flow uses a single `InkWell` (not a `GestureDetector` wrapping an `InkWell`,
  which caused gesture-arena conflicts) and validates the `http`/`https` scheme
  before `launchUrl`.

## GitHub Actions
- `.github/workflows/build-ftah-app.yml` — ftahApp builds (per OS).
- `.github/workflows/build-macos.yml` — macOS build.
- Linux builds need the `gstreamer-1.0` dev packages; builds must not depend on
  gitignored files (that is why Supabase config moved in-app).

## Building locally (Flutter)
    cd ftahApp
    flutter pub get
    flutter run -d windows      # or linux / macos / <device>
    flutter build windows       # or linux / macos / apk / ...
