import { authUrl, signState } from '../../lib/google-drive.js';
import { requireUser } from '../../lib/arca-auth.js';

export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res, { adminOnly: true }); if (!user) return;
    res.json({ url: authUrl(req, signState()) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'oauth_start_failed', message: e.message }); }
}
