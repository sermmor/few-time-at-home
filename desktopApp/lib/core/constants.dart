/// App-wide constants shared across services and screens.
const String kGdriveFolderName = 'Few_Time_at_home_desktop';

/// Scopes requested from Google OAuth2.
const List<String> kGdriveScopes = [
  'https://www.googleapis.com/auth/drive',
];

/// Reference canvas size used when scaling widget positions from the web
/// frontend (which was designed at roughly 1920×1080).
const double kRefWidth  = 1920.0;
const double kRefHeight = 1080.0;

/// secure_storage keys
const String kSecClientId     = 'ftah_client_id';
const String kSecClientSecret = 'ftah_client_secret';
const String kSecAccessToken  = 'ftah_access_token';
const String kSecRefreshToken = 'ftah_refresh_token';
const String kSecTokenExpiry  = 'ftah_token_expiry';

/// shared_preferences keys
const String kPrefLastProfile = 'last_profile';

/// Workspace colour palette — matches DesktopCommons.tsx BASE_COLORS
const List<int> kBaseColorValues = [
  0xFF1a1a2e, 0xFF16213e, 0xFF0f3460, 0xFF533483,
  0xFF2d6a4f, 0xFF1b4332, 0xFF40916c, 0xFF52b788,
  0xFF7b2d8b, 0xFF6a0572, 0xFF9b5de5, 0xFFc77dff,
  0xFFe63946, 0xFFc1121f, 0xFFfb8500, 0xFFffb703,
];

/// Slide-transition duration — matches TRANSITION_MS in DesktopCommons.tsx
const int kTransitionMs = 280;
