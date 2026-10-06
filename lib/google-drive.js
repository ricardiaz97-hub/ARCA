import crypto from 'node:crypto';
import { google } from 'googleapis';

// Vercel guarda tal cual lo que se pega: un espacio o salto de línea al final
// del client secret o del redirect URI rompe OAuth sin un error claro.
const env = k => String(process.env[k] || '').trim();

export const CLIENT_ID = env('GOOGLE_CLIENT_ID');
export const CLIENT_SECRET = env('GOOGLE_CLIENT_SECRET');
export const DRIVE_FOLDER_NAME = env('GOOGLE_DRIVE_FOLDER_NAME') || 'Arca';

// Si GOOGLE_REDIRECT_URI no está, se usa el dominio desde el que se abrió Arca.
export function redirectUri(req) {
  const fixed = env('GOOGLE_REDIRECT_URI');
  if (fixed) return fixed;
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  if (!host) return '';
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${host}/api/drive/callback`;
}

export function missingGoogleEnv(req) {
  const miss = [];
  if (!CLIENT_ID) miss.push('GOOGLE_CLIENT_ID');
  if (!CLIENT_SECRET) miss.push('GOOGLE_CLIENT_SECRET');
  if (!redirectUri(req)) miss.push('GOOGLE_REDIRECT_URI');
  return miss;
}

export function oauthClient(req) {
  const miss = missingGoogleEnv(req);
  if (miss.length) throw new Error('Faltan variables en Vercel: ' + miss.join(', '));
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri(req));
}

// El "state" va firmado en lugar de guardarse en una cookie: así el callback
// funciona aunque Google regrese a otro dominio (www, *.vercel.app, etc.).
export function signState() {
  const payload = Date.now().toString(36) + '.' + crypto.randomBytes(12).toString('hex');
  const sig = crypto.createHmac('sha256', CLIENT_SECRET).update(payload).digest('hex').slice(0, 32);
  return payload + '.' + sig;
}

export function verifyState(state) {
  const parts = String(state || '').split('.');
  if (parts.length !== 3) return false;
  const payload = parts[0] + '.' + parts[1];
  const sig = crypto.createHmac('sha256', CLIENT_SECRET).update(payload).digest('hex').slice(0, 32);
  if (sig.length !== parts[2].length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(parts[2]))) return false;
  return Date.now() - parseInt(parts[0], 36) < 15 * 60 * 1000;
}

export function authUrl(req, state) {
  const c = oauthClient(req);
  return c.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: ['https://www.googleapis.com/auth/drive.file'],
    state
  });
}

export function driveClient(refreshToken, req) {
  const c = oauthClient(req);
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

// Traduce los errores típicos de Google a algo accionable.
export function googleErrorHint(e) {
  const msg = String(e?.response?.data?.error_description || e?.response?.data?.error?.message || e?.response?.data?.error || e?.message || e);
  if (/invalid_grant/i.test(msg)) return msg + ' → El permiso de Drive caducó o fue revocado (si la app de Google está en modo "Prueba", caduca a los 7 días). Pulsa "Conectar Google Drive" otra vez.';
  if (/invalid_client|unauthorized_client/i.test(msg)) return msg + ' → GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en Vercel no coinciden con el cliente OAuth de Google.';
  if (/redirect_uri_mismatch/i.test(msg)) return msg + ' → El URI de redireccionamiento no está autorizado en Google Cloud.';
  if (/has not been used|is disabled|accessNotConfigured|SERVICE_DISABLED/i.test(msg)) return msg + ' → Activa "Google Drive API" en Google Cloud (APIs y servicios → Biblioteca).';
  return msg;
}
