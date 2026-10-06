// "Olvidé mi contraseña": deja una solicitud en Arca para que Ricardo o Andrés la atiendan.
// Es público (quien la pide no tiene sesión), así que solo guarda el correo y nunca dice si existe.
import crypto from 'node:crypto';
import { supabaseAdmin } from '../../lib/supabase-admin.js';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const note = String(req.body?.note || '').trim().slice(0, 300);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'bad_email', message: 'Escribe un correo válido.' });
    const sb = supabaseAdmin();
    const { data: open, error } = await sb.from('arca_records').select('id,data').eq('collection', 'pwresets');
    if (error) throw error;
    // Una sola solicitud pendiente por correo: si ya existe, solo se actualiza la hora.
    const prev = (open || []).find(r => r.data?.email === email && r.data?.status === 'pendiente');
    if (!prev && (open || []).filter(r => r.data?.status === 'pendiente').length >= 50)
      return res.status(429).json({ error: 'too_many', message: 'Hay demasiadas solicitudes pendientes. Escríbele a Ricardo directamente.' });
    const id = prev?.id || 'pw' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const data = { ...(prev?.data || {}), email, note, status: 'pendiente', at: new Date().toISOString() };
    const { error: e2 } = await sb.from('arca_records').upsert({ collection: 'pwresets', id, data });
    if (e2) throw e2;
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'forgot_failed', message: e.message }); }
}
