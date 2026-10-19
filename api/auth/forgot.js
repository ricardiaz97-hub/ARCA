// "Olvidé mi contraseña": deja una solicitud en Arca para que la atiendan los administradores del espacio
// del usuario (Ricardo y Andrés en Philly; los líderes en JEV+). Si está en los dos, llega a los dos.
// Es público (quien la pide no tiene sesión), así que solo guarda el correo y nunca dice si existe.
import crypto from 'node:crypto';
import { supabaseAdmin, upsertRecord } from '../../lib/supabase-admin.js';
import { spacesOfEmail } from '../../lib/arca-admins.js';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const note = String(req.body?.note || '').trim().slice(0, 300);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'bad_email', message: 'Escribe un correo válido.' });
    const sb = supabaseAdmin();
    const spaces = await spacesOfEmail(sb, email);
    for (const space of spaces) {
      const { data: open, error } = await sb.from('arca_records').select('id,data').eq('collection', 'pwresets').eq('space', space);
      if (error) {
        // Base anterior a spaces.sql: no existe la columna space; todo vive en Philly.
        if (['42703', 'PGRST204'].includes(error.code) && space === 'philly') { await saveForSpace(sb, 'philly', email, note, null); continue; }
        throw error;
      }
      const pending = (open || []).filter(r => r.data?.status === 'pendiente');
      const prev = pending.find(r => r.data?.email === email);
      if (!prev && pending.length >= 50) {
        if (spaces.length === 1) return res.status(429).json({ error: 'too_many', message: 'Hay demasiadas solicitudes pendientes. Escríbele a Ricardo directamente.' });
        continue;
      }
      await saveForSpace(sb, space, email, note, prev);
    }
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'forgot_failed', message: e.message }); }
}

async function saveForSpace(sb, space, email, note, prev) {
  const id = prev?.id || 'pw' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const data = { ...(prev?.data || {}), email, note, status: 'pendiente', at: new Date().toISOString() };
  const { error } = await upsertRecord(sb, 'pwresets', id, data, space);
  if (error) throw error;
}
