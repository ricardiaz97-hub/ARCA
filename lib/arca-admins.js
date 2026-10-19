import { supabaseAdmin } from './supabase-admin.js';
import { currentUser } from './arca-auth.js';

// Mismas personas que APPROVERS en index.html (Ricardo y Andrés): administran Philly.
export const APPROVER_IDS = ['mult2ujll39ya', 'mult3wdds4r3d'];
export const SPACES = ['philly', 'jev'];

// Espacios a los que pertenece un correo. Sin filas en arca_members (o sin la tabla) = Philly, como siempre.
export async function spacesOfEmail(sb, email) {
  const { data, error } = await sb.from('arca_members').select('space').eq('email', email);
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return ['philly'];
    throw error;
  }
  const mine = [...new Set((data || []).map(r => r.space))].filter(s => SPACES.includes(s));
  return mine.length ? mine : ['philly'];
}

// Devuelve el usuario si administra ese espacio; si no, responde 401/403.
//  · Philly: Ricardo y Andrés (ids fijos), el correo del admin de Drive, o rol admin en arca_members.
//  · Otros espacios (JEV+): rol admin en arca_members para ese espacio (o el correo del admin de Drive).
export async function requireSpaceAdmin(req, res, space = 'philly') {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'not_authenticated', message: 'Inicia sesión en Arca primero.' }); return null; }
  if (!SPACES.includes(space)) { res.status(400).json({ error: 'bad_space', message: 'Espacio no válido.' }); return null; }
  const email = String(user.email || '').toLowerCase();
  const sb = supabaseAdmin();
  if (email && email === String(process.env.ARCA_DRIVE_ADMIN_EMAIL || '').trim().toLowerCase()) return user;
  if (email) {
    const { data, error } = await sb.from('arca_members').select('role').eq('space', space).eq('email', email).eq('role', 'admin').maybeSingle();
    if (error && error.code !== '42P01' && error.code !== 'PGRST205') throw error;
    if (data) return user;
  }
  if (space === 'philly') {
    const { data, error } = await sb.from('arca_records').select('id,data').eq('collection', 'people').in('id', APPROVER_IDS);
    if (error) throw error;
    if ((data || []).some(p => p.data?.auth_user_id === user.id || (email && String(p.data?.email || '').trim().toLowerCase() === email))) return user;
  }
  res.status(403).json({ error: 'not_approver', message: space === 'philly' ? 'Solo los administradores de Philly pueden restablecer contraseñas.' : 'Solo los administradores de JEV+ pueden restablecer contraseñas.' });
  return null;
}

// Compatibilidad: antes solo existía el aprobador de Philly.
export const requireApprover = (req, res) => requireSpaceAdmin(req, res, 'philly');
