import { getDriveToken } from '../../lib/supabase-admin.js';
export default async function handler(req, res) {
  try { res.json({ connected: !!(await getDriveToken()) }); }
  catch (e) { console.error(e); res.status(500).json({ connected:false, error:'Drive backend no configurado' }); }
}
