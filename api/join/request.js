// "Quiero unirme a JEV+": formulario público (sin sesión). Deja una solicitud en el espacio 'jev'
// para que un líder la apruebe desde Tú → Solicitudes para unirse. Nunca da acceso por sí solo.
import crypto from 'node:crypto';
import { supabaseAdmin, upsertRecord } from '../../lib/supabase-admin.js';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const clean = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const b = req.body || {};
    if (clean(b.website, 50)) return res.json({ ok: true }); // trampa para bots: el campo debe venir vacío
    const name = clean(b.name, 80), email = clean(b.email, 254).toLowerCase();
    const phone = clean(b.phone, 30), notes = clean(b.notes, 400), invitedBy = clean(b.invitedBy, 80);
    const birth = /^\d{4}-\d{2}-\d{2}$/.test(String(b.birth || '')) ? String(b.birth) : '';
    if (name.length < 3) return res.status(400).json({ error: 'bad_name', message: 'Escribe tu nombre completo.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'bad_email', message: 'Escribe un correo válido: con él vas a entrar a Arca.' });

    const sb = supabaseAdmin();
    const { data: all, error } = await sb.from('arca_records').select('id,data').eq('space', 'jev').eq('collection', 'requests');
    if (error) throw error;
    const open = (all || []).filter(r => (r.data?.status || 'pendiente') === 'pendiente');
    const prev = open.find(r => String(r.data?.email || '').toLowerCase() === email);
    if (!prev && open.length >= 100) return res.status(429).json({ error: 'too_many', message: 'Hay muchas solicitudes por revisar. Escríbele a un líder de JEV+.' });

    const id = prev?.id || 'jr' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const data = { ...(prev?.data || {}), name, email, phone, birth, invitedBy, notes, status: 'pendiente', source: 'unirse', submittedAt: new Date().toISOString() };
    const { error: e2 } = await upsertRecord(sb, 'requests', id, data, 'jev');
    if (e2) throw e2;
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'join_failed', message: 'No se pudo enviar. Intenta de nuevo en un momento.' }); }
}
