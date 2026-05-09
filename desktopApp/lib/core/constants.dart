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
