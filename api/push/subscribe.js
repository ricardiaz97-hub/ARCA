// Avisos en el teléfono: GET da la llave pública · POST guarda este teléfono · DELETE lo quita.
import { requireUser } from '../../lib/arca-auth.js';
import { pushConfigured, vapidPublicKey, saveSub, deleteSub } from '../../lib/push.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!pushConfigured()) return res.status(503).json({ error: 'push_not_configured', message: 'Los avisos aún no están configurados: faltan las llaves VAPID en Vercel.' });
      return res.json({ publicKey: vapidPublicKey() });
    }
    const user = await requireUser(req, res);
    if (!user) return;
    const b = req.body || {};
    if (req.method === 'POST') {
      const s = b.subscription || {};
      if (!/^https:\/\//.test(String(s.endpoint || '')) || !s.keys || !s.keys.p256dh || !s.keys.auth)
        return res.status(400).json({ error: 'bad_subscription', message: 'El teléfono no dio una suscripción válida.' });
      await saveSub({ email: user.email, personId: b.personId, subscription: { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, prefs: b.prefs, ua: b.ua });
      return res.json({ ok: true });
    }
    if (req.method === 'DELETE') {
      if (b.endpoint) await deleteSub(b.endpoint);
      return res.json({ ok: true });
    }
    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'push_failed', message: /arca_private/.test(e.message || '') ? 'Falta la tabla arca_private: ejecuta drive-setup.sql en Supabase.' : 'No se pudo guardar. Intenta de nuevo.' });
  }
}
