import { createClient } from '@supabase/supabase-js';

export async function currentUser(req) {
  const h = String(req.headers.authorization || '');
  if (!h.startsWith('Bearer ')) return null;
  const token = h.slice(7);
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth:{persistSession:false} });
  const { data } = await sb.auth.getUser(token);
  return data?.user || null;
}

export async function requireUser(req,res,{adminOnly=false}={}) {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({error:'not_authenticated'}); return null; }
  if (adminOnly && String(user.email||'').toLowerCase() !== String(process.env.ARCA_DRIVE_ADMIN_EMAIL||'').toLowerCase()) {
    res.status(403).json({error:'not_drive_admin'}); return null;
  }
  return user;
}
