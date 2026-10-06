import { createClient } from '@supabase/supabase-js';

const env = k => String(process.env[k] || '').trim();

export async function currentUser(req) {
  const h = String(req.headers.authorization || '');
  if (!h.startsWith('Bearer ')) return null;
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Faltan variables en Vercel: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY');
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb.auth.getUser(h.slice(7));
  return data?.user || null;
}

export async function requireUser(req, res, { adminOnly = false } = {}) {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'not_authenticated', message: 'Inicia sesión en Arca primero.' }); return null; }
  const admin = env('ARCA_DRIVE_ADMIN_EMAIL').toLowerCase();
  if (adminOnly && admin && String(user.email || '').toLowerCase() !== admin) {
    res.status(403).json({ error: 'not_drive_admin', message: `Solo ${admin} puede conectar Google Drive (tú entraste como ${user.email}).` });
    return null;
  }
  return user;
}
