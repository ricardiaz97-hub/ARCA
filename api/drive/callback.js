import { oauthClient } from '../../lib/google-drive.js';
import { saveDriveToken } from '../../lib/supabase-admin.js';

function cookie(req, name) {
  const m = String(req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}

export default async function handler(req, res) {
  try {
    const { code, state, error } = req.query || {};
    if (error) return res.status(400).send('Google OAuth cancelado: ' + error);
    if (!code || !state || state !== cookie(req, 'arca_oauth_state')) return res.status(400).send('OAuth inválido.');
    const c = oauthClient();
    const { tokens } = await c.getToken(code);
    if (!tokens.refresh_token) throw new Error('Google no devolvió refresh token. Revoca Arca en Google y vuelve a autorizar.');
    await saveDriveToken(tokens.refresh_token);
    res.setHeader('Set-Cookie', 'arca_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    res.redirect(302, '/?drive=connected');
  } catch (e) {
    console.error(e);
    res.status(500).send('No se pudo conectar Google Drive: ' + (e.message || e));
  }
}
