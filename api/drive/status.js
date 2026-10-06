import { getDriveToken, missingSupabaseEnv } from '../../lib/supabase-admin.js';
import { missingGoogleEnv } from '../../lib/google-drive.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const missing = [...missingSupabaseEnv(), ...missingGoogleEnv(req)];
  if (missing.length) return res.json({ connected: false, configured: false, error: 'Faltan variables en Vercel: ' + missing.join(', ') });
  try { res.json({ connected: !!(await getDriveToken()), configured: true }); }
  catch (e) { console.error(e); res.json({ connected: false, configured: false, error: e.message }); }
}
