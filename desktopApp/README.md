# FT@Home Desktop App

A standalone Flutter application that reads and displays **Few Time @ Home**
remote desktop profiles directly from Google Drive — no backend required.

## Supported platforms

| Platform | Status         |
|----------|----------------|
| Android  | ✅ Full-screen  |
| Windows  | ✅ Full-screen  |
| macOS    | ✅ Full-screen  |
| Linux    | ✅ Full-screen  |
| iOS/iPad | ❌ Not targeted |

---

## 1 — Google Cloud setup (one-time)

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create a project (or use an existing one).
3. Enable the **Google Drive API** (*APIs & Services → Library*).
4. Go to *APIs & Services → OAuth consent screen*:
   - Choose **External** (or Internal for a G-Suite org).
   - Fill in the required fields and add your Google account as a *test user*.
5. Go to *APIs & Services → Credentials → Create Credentials → OAuth client ID*:
   - Application type: **Desktop app**
   - Name it anything (e.g. `FT@Home Desktop`).
6. Copy the **Client ID** and **Client Secret** — you'll enter them in the app.

---

## 2 — Running / building

### Prerequisites

```bash
flutter --version   # requires Flutter ≥ 3.11.5 / Dart ≥ 3.1.0
```

### First run (create the native project scaffolding)

```bash
cd desktopApp

# Generate platform folders not included in git
flutter create --platforms=android,windows,macos,linux .
```

### Run on Windows

```bash
flutter run -d windows
```

### Run on Android (device or emulator)

```bash
flutter run -d <device-id>
```

### Build release

```bash
# Windows installer
flutter build windows --release

# Android APK
flutter build apk --release

# macOS app bundle
flutter build macos --release

# Linux bundle
flutter build linux --release
```

---

## 3 — First launch

1. The app opens the **Setup** screen.
2. Enter your Google OAuth2 **Client ID** and **Client Secret** (from step 1).
3. Press **Connect** — a browser window will open for Google sign-in.
4. After authorisation the browser redirects to `localhost` and the app takes
   over automatically.
5. Your credentials and tokens are stored in the platform's secure storage
   (Keychain on macOS, DPAPI on Windows, Keystore on Android).

---

## 4 — Usage

- **Profile selection** — shows all remote profiles found in the
  `Few_Time_at_home_desktop` Google Drive folder.
- **Tap/click a profile** to open it full-screen.
- **Tap/click anywhere** on the desktop to show/hide the HUD overlay.
- The overlay shows:
  - A grid of workspace dots at the bottom — click any dot to jump.
  - A top bar with the profile name and a **Close** button.
- **Keyboard shortcuts** (desktop platforms):
  - `→` / `↓` — next workspace
  - `←` / `↑` — previous workspace
  - `Esc` — save and close (returns to profile selection)
- **Closing** the profile saves the config back to Google Drive.

---

## 5 — Project structure

```
desktopApp/
  lib/
    main.dart                          ← entry point, fullscreen setup
    core/
      constants.dart                   ← app-wide constants & keys
      models/desktop_config.dart       ← data models (mirrors web frontend)
      services/
        auth_service.dart              ← Google OAuth2 (googleapis_auth)
        drive_service.dart             ← Google Drive read/write
        asset_cache_service.dart       ← local file cache for wallpapers/images
    screens/
      setup/
        setup_screen.dart              ← first-run credentials entry
      profile_selection/
        profile_selection_screen.dart  ← profile picker
      desktop/
        desktop_screen.dart            ← full-screen desktop viewer
        widgets/
          workspace_page.dart          ← single workspace canvas
          sticky_note_widget.dart
          desktop_link_widget.dart
          desktop_image_widget.dart
          desktop_panel_widget.dart
  pubspec.yaml
```

---

## 6 — Notes

- Wallpapers, image widgets, and favicons are **cached locally** in the app's
  documents directory under `ftah_cache/<profileName>/`.
- The app only reads the `cloud/desktop-remote/` asset subfolder on Drive
  (the same convention used by the web frontend for remote profiles).
- Notes are **read-only** in this app — they are not editable.
