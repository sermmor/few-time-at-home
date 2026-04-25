/**
 * One-time OAuth 2.0 authorisation script for Google Drive backups.
 *
 * Usage:
 *   node setup-google-drive.js <CLIENT_ID> <CLIENT_SECRET>
 *
 * The script will:
 *   1. Print a URL — open it in your browser and grant access.
 *   2. Start a local server on port 9876 to capture the OAuth callback.
 *   3. Print the three values to add to keys.json.
 */

const { google } = require('googleapis');
const http       = require('http');
const url        = require('url');

const clientId     = process.argv[2];
const clientSecret = process.argv[3];

if (!clientId || !clientSecret) {
  console.error('Usage: node setup-google-drive.js <CLIENT_ID> <CLIENT_SECRET>');
  process.exit(1);
}

const REDIRECT_PORT = 9876;
const REDIRECT_URI  = `http://localhost:${REDIRECT_PORT}/oauth2callback`;
const SCOPES        = ['https://www.googleapis.com/auth/drive.file'];

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope:       SCOPES,
  prompt:      'consent', // ensures a refresh_token is always returned
});

console.log('\n──────────────────────────────────────────────────────────────');
console.log('Open this URL in your browser and grant access to Google Drive:');
console.log('──────────────────────────────────────────────────────────────\n');
console.log(authUrl);
console.log('\n──────────────────────────────────────────────────────────────\n');

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  if (!parsedUrl.pathname.startsWith('/oauth2callback')) {
    res.end('Not found'); return;
  }

  const code = parsedUrl.query.code;
  if (!code) {
    res.writeHead(400);
    res.end('Missing code parameter. Try again.');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2 style="font-family:monospace;color:green">✅ Authorization successful! You can close this tab.</h2>');
    server.close();

    console.log('✅  Authorization successful!\n');
    console.log('Add these three fields to your keys.json:\n');
    console.log(JSON.stringify({
      google_drive_client_id:     clientId,
      google_drive_client_secret: clientSecret,
      google_drive_refresh_token: tokens.refresh_token,
    }, null, 2));
    console.log('\n(google_drive_folder_id is optional — omit it to let the app');
    console.log(' create the "Few_time_at_home_backups" folder automatically.)\n');
  } catch (err) {
    res.writeHead(500);
    res.end('Error exchanging code: ' + err.message);
    server.close();
    console.error('Error getting token:', err.message);
  }
});

server.listen(REDIRECT_PORT, () => {
  console.log(`Waiting for Google OAuth callback on http://localhost:${REDIRECT_PORT} ...\n`);
});
