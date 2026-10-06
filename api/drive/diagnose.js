// Revisa paso a paso la configuración de Drive. No muestra ningún secreto.
import { redirectUri, missingGoogleEnv, driveClient, googleErrorHint, CLIENT_ID, DRIVE_FOLDER_NAME } from '../../lib/google-drive.js';
import { getDriveToken, getDriveFolderId, missingSupabaseEnv } from '../../lib/supabase-admin.js';

const has = k => !!String(process.env[k] || '').trim();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  for (const k of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'ARCA_DRIVE_ADMIN_EMAIL'])
    add('Variable ' + k, has(k), has(k) ? 'definida' : (k === 'GOOGLE_REDIRECT_URI' ? 'no definida (se usará el dominio actual)' : k === 'ARCA_DRIVE_ADMIN_EMAIL' ? 'no definida (cualquier usuario con sesión podrá conectar Drive)' : 'FALTA — agrégala en Vercel → Settings → Environment Variables y vuelve a desplegar'));
  if (has('SUPABASE_SERVICE_ROLE_KEY') && /^sb_publishable_/.test(String(process.env.SUPABASE_SERVICE_ROLE_KEY).trim()))
    add('Service-role key', false, 'SUPABASE_SERVICE_ROLE_KEY contiene la publishable key; debe ser la secret/service_role key.');
  if (has('GOOGLE_CLIENT_ID') && !/\.apps\.googleusercontent\.com$/.test(CLIENT_ID)) add('Formato GOOGLE_CLIENT_ID', false, 'Debe terminar en .apps.googleusercontent.com');

  const ru = redirectUri(req);
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  let ruHost = ''; try { ruHost = new URL(ru).host; } catch {}
  add('Redirect URI', !!ru && ruHost === host, `${ru || '(vacío)'} — debe estar EXACTAMENTE igual en Google Cloud → Clientes → URIs de redireccionamiento autorizados.` + (ruHost && ruHost !== host ? ` Ojo: estás abriendo Arca desde ${host} pero el redirect apunta a ${ruHost}.` : ''));

  let token = null;
  if (!missingSupabaseEnv().length) {
    try { token = await getDriveToken(); add('Tabla arca_private en Supabase', true, 'accesible'); add('Drive conectado', !!token, token ? 'hay refresh token guardado' : 'todavía no: inicia sesión en Arca y pulsa "Conectar Google Drive"'); }
    catch (e) { add('Tabla arca_private en Supabase', false, e.message); }
  }

  if (token && !missingGoogleEnv(req).length) {
    try {
      const drive = driveClient(token, req);
      const about = await drive.about.get({ fields: 'user(emailAddress),storageQuota(limit,usage)' });
      add('Acceso a Google Drive', true, 'cuenta ' + about.data.user?.emailAddress);
      const folder = await getDriveFolderId();
      if (folder) {
        try { await drive.files.get({ fileId: folder, fields: 'id,trashed' }); add(`Carpeta "${DRIVE_FOLDER_NAME}"`, true, folder); }
        catch (e) { add(`Carpeta "${DRIVE_FOLDER_NAME}"`, false, 'no accesible; se recreará en la próxima subida si reconectas Drive. ' + googleErrorHint(e)); }
      } else add(`Carpeta "${DRIVE_FOLDER_NAME}"`, true, 'se creará con la primera subida');
    } catch (e) { add('Acceso a Google Drive', false, googleErrorHint(e)); }
  }

  const ok = checks.every(c => c.ok || /no definida \(/.test(c.detail));
  if (String(req.headers.accept || '').includes('text/html')) {
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arca · Diagnóstico Drive</title>
<body style="font:15px system-ui;max-width:760px;margin:32px auto;padding:0 16px"><h2>Diagnóstico Google Drive ${ok ? '✅' : '❌'}</h2>
<table style="border-collapse:collapse;width:100%">${checks.map(c => `<tr><td style="padding:6px;border-bottom:1px solid #ddd">${c.ok ? '✅' : (/no definida \(/.test(c.detail) ? '⚠️' : '❌')}</td><td style="padding:6px;border-bottom:1px solid #ddd"><b>${esc(c.name)}</b><br><span style="color:#555">${esc(c.detail)}</span></td></tr>`).join('')}</table>
<p><a href="/">Volver a Arca</a></p></body>`);
  }
  res.json({ ok, checks });
}
