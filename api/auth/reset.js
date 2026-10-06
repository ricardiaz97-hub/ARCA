// Ricardo o Andrés atienden una solicitud de contraseña olvidada:
//  action "reset"   → crea una contraseña temporal (y la cuenta, si no existía) y la devuelve UNA vez.
//  action "dismiss" → descarta la solicitud.
import crypto from 'node:crypto';
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { requireApprover } from '../../lib/arca-admins.js';

async function findUserByEmail(sb, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find(x => String(x.email || '').toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
  return null;
}

function tempPassword() {
  return 'Arca-' + String(crypto.randomInt(0, 1e6)).padStart(6, '0');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const admin = await requireApprover(req, res); if (!admin) return;
    const id = String(req.body?.id || ''), action = String(req.body?.action || 'reset');
    const sb = supabaseAdmin();
    const { data: rec, error } = await sb.from('arca_records').select('id,data').eq('collection', 'pwresets').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!rec) return res.status(404).json({ error: 'not_found', message: 'La solicitud ya no existe.' });
    const email = String(rec.data?.email || '').toLowerCase();
    const done = extra => sb.from('arca_records').upsert({ collection: 'pwresets', id, data: { ...rec.data, ...extra, resolvedBy: admin.email, resolvedAt: new Date().toISOString() } });

    if (action === 'dismiss') { const { error: e } = await done({ status: 'descartada' }); if (e) throw e; return res.json({ ok: true }); }

    const password = tempPassword();
    let user = await findUserByEmail(sb, email), created = false;
    if (user) {
      const { error: e } = await sb.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: { ...(user.user_metadata || {}), must_change_password: true } });
      if (e) throw e;
    } else {
      const { data, error: e } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true } });
      if (e) throw e;
      user = data.user; created = true;
    }
    const { error: e3 } = await done({ status: 'resuelta' });
    if (e3) throw e3;
    // La contraseña no se guarda en ningún lado: solo se devuelve aquí para enviarla.
    res.json({ ok: true, email, password, created });
  } catch (e) { console.error(e); res.status(500).json({ error: 'reset_failed', message: e.message }); }
}
