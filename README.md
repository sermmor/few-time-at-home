# FewTime@Home
The main idea of this project is tools to connect with home when you spend a lot of time out of home. So the backend can be you PC at home, and the front or Telegram Bot are your mobile, tablet or latop. So you can be secure using the Telegram Bot to communicate with home or using the front to create a local copy that when you arrive to home will be syncronized.

## Prerequisites

Before you begin, ensure you have met the following requirements:

* You have installed [Node.js](https://nodejs.org/en/download/).
* You have installed [FFmpeg](https://ffmpeg.org/download.html).
* FFmpeg is added to the system PATH.

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
