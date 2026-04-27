# FewTime@Home
The main idea of this project is tools to connect with home when you spend a lot of time out of home. So the backend can be you PC at home, and the front or Telegram Bot are your mobile, tablet or latop. So you can be secure using the Telegram Bot to communicate with home or using the front to create a local copy that when you arrive to home will be syncronized.

## Prerequisites

Before you begin, ensure you have met the following requirements:

* You have installed [Node.js](https://nodejs.org/en/download/).
* You have installed [FFmpeg](https://ffmpeg.org/download.html).
* FFmpeg is added to the system PATH.
* You have installed 7-Zip (see Google Drive backups - Prerequisites section in this Readme).

### Installing FFmpeg on Windows

1. Download FFmpeg from the [official site](https://ffmpeg.org/download.html). Choose the link that matches your system architecture (32 or 64 bit).
2. Extract the downloaded file. You will get a folder, which includes three sub-folders (bin, doc, presets).
3. Add FFmpeg to Windows PATH:
    * Right-click on Computer and choose Properties.
    * Choose Advanced system settings.
    * In the System Properties window, choose Environment Variables.
    * In the Environment Variables window, you will see a list of User variables and System variables. Under System variables, find and select the variable named Path, then click on Edit.
    * In the Edit Environment Variable window, move the cursor to the end of the Variable value line, add a semicolon (;) and then add the path to the 'bin' directory in the FFmpeg folder you downloaded earlier. For example, if you extracted FFmpeg to `C:\FFmpeg`, you would add `C:\FFmpeg\bin`.
    * Click OK to close each window.

### Installing FFmpeg on Linux (Ubuntu)

On Ubuntu, you can install FFmpeg from the official repositories by running the following command in your terminal:

```bash
sudo apt update
sudo apt install ffmpeg
```
## More prerequisites

Install Lame for mp3 converter.

### Install on Debian

```bash
$ sudo apt-get install lame
```

### Install on MacOS with brew

```bash
$ brew install lame
```

### Install on Windows

1. Go to the the [Lame Download Page](https://lame.buanzo.org/#lamewindl) and download the EXE or ZIP file.
2. Navigate to the directory Lame was installed in (most commonly `C:\Program Files (x86)\Lame For Audacity`).
3. Add the directory to your [Environment Variables](https://www.java.com/en/download/help/path.xml).

## Frontend configuration

The file `frontend/src/configuration.json` tells the frontend where to find the backend. You need to edit it manually if the backend is not running on the same machine as the browser.

```json
{
  "ip":             "localhost",
  "port":           4001,
  "webSocketPort":  4002,
  "isUsingMocks":   false
}
```

| Field | Description | Default |
|---|---|---|
| `ip` | IP address or hostname of the machine running the backend. Use `localhost` when both run on the same machine, or the LAN IP (e.g. `192.168.1.50`) when accessing from another device. | `localhost` |
| `port` | HTTP port the backend API listens on. Must match `apiPort` in the backend `configuration.json` created during setup. | `4001` |
| `webSocketPort` | Port for the WebSocket server (used for live RSS update notifications). Must match `webSocketPort` in the backend `configuration.json`. | `4002` |
| `isUsingMocks` | Set to `true` to run the frontend with local mock data, without a real backend. Useful for UI development. | `false` |

> **Local Server / remote setup**: if you are running the backend on a local server and the frontend on a laptop, set `ip` to the server's local IP address (e.g. `192.168.1.50`) before running `npm start` or building the frontend.

---

## Notifications App (Flutter + Firebase + Supabase)

The `notificationsApp/` directory contains an Android app that receives alerts via two complementary channels:

- **Firebase FCM** — push notification even when the app is closed or in background
- **Supabase Realtime** — live list updates inside the app when it is open

Whenever an alert fires on the backend (Raspberry Pi / local server), it is sent simultaneously to:

- Telegram bot
- Email
- **This Flutter app** (FCM push + Supabase table insert)

### Architecture

```
Local server (Node.js)
  └─ alert fires
       ├─ Telegram bot
       ├─ Email
       ├─ Firebase Admin SDK  →  FCM        →  push notification (app closed/background)
       └─ POST /rest/v1/alerts  →  Supabase  →  Realtime list update (app open)
```

### Files

| File | Purpose |
|---|---|
| `notificationsApp/pubspec.yaml` | Flutter dependencies |
| `notificationsApp/android/app/google-services.json` | ⚠️ **Not in git** — download from Firebase Console (see Firebase setup below) |
| `notificationsApp/lib/config/supabase_config.dart` | ⚠️ **Not in git** — copy from `supabase_config.dart.example` and fill in your values |
| `notificationsApp/lib/config/supabase_config.dart.example` | Template for `supabase_config.dart` — tracked in git, contains placeholder values |
| `notificationsApp/supabase_schema.sql` | Supabase table + RLS policies — run once in Supabase SQL Editor |
| `notificationsApp/lib/main.dart` | App entry point — initialises Firebase and Supabase |
| `notificationsApp/lib/models/alert_model.dart` | Alert data model |
| `notificationsApp/lib/services/notification_service.dart` | Local OS notifications |
| `notificationsApp/lib/screens/alerts_screen.dart` | Main screen: alert list, mark as read, swipe to delete |
| `backend/data/firebase-service-account.json` | ⚠️ **Not in git** — download from Firebase Console (see Firebase setup below) |

### Prerequisites

#### 1. Flutter SDK

```powershell
winget install Google.Flutter
```

Or download manually from https://docs.flutter.dev/get-started/install/windows/mobile, extract to `C:\flutter` and add `C:\flutter\bin` to the system PATH.

Verify:
```bash
flutter doctor
```

#### 2. Java JDK

```powershell
winget install Microsoft.OpenJDK.21
```

Verify that `JAVA_HOME` points to the JDK folder and that `%JAVA_HOME%\bin` is in the PATH:
```bash
java -version
```

#### 3. Android Studio + Android SDK

1. Download and install [Android Studio](https://developer.android.com/studio).  
   If the installer shows *"some required components are not available"*, click **Continue** — it is a network warning, not a fatal error.
2. Once Android Studio is open go to **More Actions → SDK Manager → SDK Tools** and install:
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Command-line Tools *(latest)*
   - ✅ Android SDK Platform-Tools
   - ✅ Android 14 (API 34) or newer *(SDK Platforms tab)*
3. Accept all Flutter/Android licences:
   ```bash
   flutter doctor --android-licenses
   ```
   Type `y` to every prompt.

   > If you get `Android sdkmanager not found`, the Command-line Tools step above was not completed — go back to SDK Manager and install them.

4. Tell Flutter where the SDK lives (adjust the username):
   ```bash
   flutter config --android-sdk "C:\Users\TuUsuario\AppData\Local\Android\Sdk"
   ```

Run `flutter doctor` — all relevant items should show ✓.

### Firebase setup

#### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account.
2. Click **Add project** → give it a name (e.g. `ftah-notifications`) → disable Google Analytics if desired → **Create project**.

#### 2. Register the Android app

1. On the project overview page click the **Android** icon (Add app).
2. **Android package name:** `com.ftah.notifications_app` (exactly as shown).
3. Click **Register app**.
4. Download **`google-services.json`** and place it at:
   ```
   notificationsApp/android/app/google-services.json
   ```
5. Click **Next** through the remaining steps until **Continue to console**.

#### 3. Generate the backend service account key

1. In Firebase Console → ⚙️ **Project settings** → **Service accounts** tab.
2. Click **Generate new private key** → confirm → save the downloaded JSON as:
   ```
   backend/data/firebase-service-account.json
   ```

> ⚠️ `firebase-service-account.json` is secret. It must only live on the backend server. Never commit it to git or put it in the Flutter app.

### Supabase setup

1. Create a free project at https://supabase.com.  
   Recommended options during project creation:
   - ✅ Enable Data API
   - ❌ Automatically expose new tables and functions
   - ✅ Enable automatic RLS

2. Open **SQL Editor → New query**, paste the contents of `notificationsApp/supabase_schema.sql` and run it. This creates the `alerts` table, grants permissions to the API roles, sets RLS policies and enables Realtime.

3. Go to **Project Settings → API** and copy your keys:

   **Flutter app** — create `notificationsApp/lib/config/supabase_config.dart` from the template:
   ```bash
   cp notificationsApp/lib/config/supabase_config.dart.example \
      notificationsApp/lib/config/supabase_config.dart
   ```
   Then open the file and fill in:
   - **Project URL** → `url`
   - **anon / public key** → `anonKey`

   **Backend** — open `backend/keys.json` and set:
   - `supabase_url` → Project URL
   - `supabase_service_key` → **service_role** key

   Alternatively, configure both from the web app under **Configuration → APIs → Supabase**.

> ⚠️ The `service_role` key is secret. It must only live on the backend server (`keys.json`). Never put it in the Flutter app.  
> ⚠️ `supabase_config.dart` is listed in `.gitignore` — never commit it. Only commit the `.example` template.

### Build and run

Before building, make sure the following files exist (they are NOT in git):

| File | How to get it |
|---|---|
| `notificationsApp/android/app/google-services.json` | Firebase Console → Android app → Download config file |
| `notificationsApp/lib/config/supabase_config.dart` | Copy from `supabase_config.dart.example` and fill in your Supabase URL + anon key |
| `backend/data/firebase-service-account.json` | Firebase Console → Project settings → Service accounts → Generate new private key |

```bash
cd notificationsApp

# 1. Create supabase_config.dart from the template (first time only)
cp lib/config/supabase_config.dart.example lib/config/supabase_config.dart
# Then open supabase_config.dart and fill in your Supabase URL and anon key.

# 2. Generate Android/iOS boilerplate (only needed once, after cloning)
flutter create . --org com.ftah --overwrite

# IMPORTANT: after flutter create, restore the custom files:
#   - lib/main.dart
#   - pubspec.yaml
#   - android/app/src/main/AndroidManifest.xml
#   - android/app/build.gradle.kts
# (flutter create --overwrite resets these to Flutter defaults)

# 3. Install Dart dependencies
flutter pub get

# Run on a connected device (USB debugging enabled) or emulator
flutter run

# Build a release APK to install on any Android device
flutter build apk --release
```

The release APK is output to:
```
notificationsApp/build/app/outputs/flutter-apk/app-release.apk
```

Copy it to your Android device and install it (you may need to allow *Install from unknown sources* in Android settings).

---

## Google Drive backups

The backend creates a password-protected `.7z` archive of all data files every Monday at 12:00 and uploads it automatically to a `Few_time_at_home_backups` folder in your personal Google Drive.  The local `.7z` is also kept on disk at the path configured in `backupUrls` (`configuration.json`).

The archive password defaults to `admin` and can be changed at any time from **Configuration → APIs → Google Drive — Backups → `.7z` archive password**. The change takes effect after restarting the server.

> Only runs when `is_backup_disabled` is `false` in `keys.json`.

### Prerequisites

The `googleapis` npm package is already listed as a dependency and installed automatically with `npm install`.

**`7-Zip` is required on all platforms** and must be available in `PATH`:

| Platform | Installation |
|---|---|
| **Linux Server** | `sudo apt install p7zip-full` |
| **macOS** | `brew install p7zip` |
| **Windows** | Install [7-Zip](https://www.7-zip.org) using the default path (`C:\Program Files\7-Zip\`) — no PATH setup needed |

### Setup (one time)

#### 1. Enable the Google Drive API

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and open your project (you can reuse an existing one).
2. **APIs & Services → Library** → search for **Google Drive API** → **Enable**.

#### 2. Create an OAuth 2.0 Desktop credential

1. **APIs & Services → Credentials → Create credentials → OAuth 2.0 Client ID**.
2. **Application type: Desktop app** — give it any name and save.
3. Copy the **Client ID** and **Client secret** shown in the dialog.

> ⚠️ If this is the first time you create OAuth credentials in this project you will be asked to configure the **OAuth consent screen** first. Choose *External*, fill in the app name (anything works, e.g. `FewTimeAtHome`), add your Google account as a **Test user**, and save. You do not need to publish the app.

#### 3. Run the authorisation script (once)

From the `backend/` directory:

```bash
node setup-google-drive.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET
```

The script prints a URL. Open it in your browser, sign in with the Google account whose Drive you want to use, and grant access.  
The script then outputs three values:

```json
{
  "google_drive_client_id":     "...",
  "google_drive_client_secret": "...",
  "google_drive_refresh_token": "1//0g..."
}
```

#### 4. Save the credentials

**Option A — edit `keys.json` manually:**

```json
{
  "google_drive_client_id":     "YOUR_CLIENT_ID",
  "google_drive_client_secret": "YOUR_CLIENT_SECRET",
  "google_drive_refresh_token": "YOUR_REFRESH_TOKEN",
  "google_drive_folder_id":     ""
}
```

**Option B — use the web UI:**  
Open **Configuration → APIs → Google Drive — Backups** and paste the three values there, then click **Save**.

`google_drive_folder_id` is optional. If left empty the service automatically creates the `Few_time_at_home_backups` folder in your Drive on the first backup. If you want to upload into a specific existing folder, paste its ID (the last segment of the folder URL in Google Drive).

#### 5. (Optional) See the folder in your personal Drive

Backups land in the service's own Drive space by default. To see them directly in your Google Drive:

1. Create a folder called `Few_time_at_home_backups` in your Google Drive.
2. Share it with the Google account you authorised in step 3.
3. Copy the folder ID from its URL and set `google_drive_folder_id` in `keys.json` (or the web UI).

### Files

| File | Purpose |
|---|---|
| `backend/setup-google-drive.js` | One-time authorisation script — run it once to obtain the refresh token |
| `backend/src/API/googleDrive.service.ts` | Upload service — initialised at startup, called after each backup |

### How it works

```
Every Monday 12:00 (+ once on startup)
  └─ runBackup() creates a password-protected .7z in backupUrls/
       └─ GoogleDriveService.uploadBackup(archivePath)
            ├─ Finds or creates "Few_time_at_home_backups" folder
            └─ Uploads the .7z via Google Drive API v3 (OAuth 2.0)
```
