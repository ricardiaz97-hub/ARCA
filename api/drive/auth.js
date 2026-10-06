import crypto from 'node:crypto';
import { authUrl } from '../../lib/google-drive.js';
import { requireUser } from '../../lib/arca-auth.js';

export default async function handler(req, res) {
  try {
    const user = await requireUser(req,res,{adminOnly:true}); if(!user)return;
    const state = crypto.randomBytes(24).toString('hex');
    const url = authUrl(state);
    res.setHeader('Set-Cookie', `arca_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    res.json({url});
  } catch(e) { console.error(e); res.status(500).json({error:'oauth_start_failed',message:e.message}); }
}
