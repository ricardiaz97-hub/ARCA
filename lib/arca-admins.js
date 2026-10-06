import { supabaseAdmin } from './supabase-admin.js';
import { currentUser } from './arca-auth.js';

// Mismas personas que APPROVERS en index.html (Ricardo y Andrés).
export const APPROVER_IDS = ['mult2ujll39ya', 'mult3wdds4r3d'];

// Devuelve el usuario si es uno de los aprobadores; si no, responde 401/403.
export async function requireApprover(req, res) {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'not_authenticated', message: 'Inicia sesión en Arca primero.' }); return null; }
  const email = String(user.email || '').toLowerCase();
  if (email && email === String(process.env.ARCA_DRIVE_ADMIN_EMAIL || '').trim().toLowerCase()) return user;
  const { data, error } = await supabaseAdmin().from('arca_records').select('id,data').eq('collection', 'people').in('id', APPROVER_IDS);
  if (error) throw error;
  const ok = (data || []).some(p => p.data?.auth_user_id === user.id || (email && String(p.data?.email || '').trim().toLowerCase() === email));
  if (!ok) { res.status(403).json({ error: 'not_approver', message: 'Solo Ricardo o Andrés pueden restablecer contraseñas.' }); return null; }
  return user;
}
