import { google } from 'googleapis';

export const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
export const DRIVE_FOLDER_NAME = process.env.GOOGLE_DRIVE_FOLDER_NAME || 'Arca';

export function oauthClient() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) throw new Error('Faltan variables de Google OAuth');
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function authUrl(state) {
  const c = oauthClient();
  return c.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    state
  });
}

export function driveClient(refreshToken) {
  const c = oauthClient();
  c.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: c });
}

export async function ensureFolder(drive) {
  const q = [
    "name = '" + DRIVE_FOLDER_NAME.replace(/'/g, "\\'") + "'",
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false"
  ].join(' and ');
  const found = await drive.files.list({ q, spaces: 'drive', fields: 'files(id,name)' });
  if (found.data.files?.[0]) return found.data.files[0].id;
  const made = await drive.files.create({
    requestBody: { name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id,name'
  });
  return made.data.id;
}
