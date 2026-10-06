import { oauthClient, verifyState, driveClient, ensureFolder, googleErrorHint } from '../../lib/google-drive.js';
import { saveDriveToken, saveDriveFolderId, clearDriveFolderId } from '../../lib/supabase-admin.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function fail(res, status, msg) {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arca · Google Drive</title><body style="font:16px system-ui;max-width:640px;margin:40px auto;padding:0 16px">
<h2>No se pudo conectar Google Drive</h2><p style="background:#fee;padding:12px;border-radius:8px">${esc(msg)}</p>
<p><a href="/api/drive/diagnose">Ver diagnóstico</a> · <a href="/">Volver a Arca</a></p></body>`);
}

export default async function handler(req, res) {
  const { code, state, error } = req.query || {};
  if (error) return fail(res, 400, 'Google canceló la autorización: ' + error);
  if (!code) return fail(res, 400, 'Falta el código de Google.');
  if (!verifyState(state)) return fail(res, 400, 'La solicitud caducó o no es válida. Vuelve a Arca y pulsa "Conectar Google Drive" otra vez.');
  let step = 'intercambiar el código con Google';
  try {
    const { tokens } = await oauthClient(req).getToken(code);
    if (!tokens.refresh_token) throw new Error('Google no devolvió refresh token. Quita el acceso de Arca en https://myaccount.google.com/permissions y vuelve a conectar.');
    step = 'guardar el token en Supabase';
    await saveDriveToken(tokens.refresh_token);
    await clearDriveFolderId();
    step = 'crear la carpeta en Drive';
    const drive = driveClient(tokens.refresh_token, req);
    await saveDriveFolderId(await ensureFolder(drive));
    res.redirect(302, '/?drive=connected');
  } catch (e) {
    console.error(e);
    fail(res, 500, `Error al ${step}: ${googleErrorHint(e)}`);
  }
}
