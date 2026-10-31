// Avisos en el teléfono (Web Push).
// Las suscripciones viven en arca_private (nadie las lee desde el navegador) con la llave push:<hash del endpoint>.
import crypto from 'node:crypto';
import webpush from 'web-push';
import { supabaseAdmin } from './supabase-admin.js';

const env = k => String(process.env[k] || '').trim();
export const PUSH_CATS = ['asignaciones', 'recordatorios', 'comida'];

export function pushConfigured() { return !!(env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY')); }
export const vapidPublicKey = () => env('VAPID_PUBLIC_KEY');

let ready = false;
function setup() {
  if (ready) return;
  if (!pushConfigured()) throw new Error('Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en Vercel.');
  const host = env('VERCEL_PROJECT_PRODUCTION_URL');
  webpush.setVapidDetails(env('VAPID_SUBJECT') || (host ? 'https://' + host : 'https://arca-tau-steel.vercel.app'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
  ready = true;
}

export const subKey = endpoint => 'push:' + crypto.createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 40);
const lower = s => String(s || '').trim().toLowerCase();

export async function saveSub({ email, personId, subscription, prefs, ua }) {
  const p = {};
  for (const c of PUSH_CATS) p[c] = !(prefs && prefs[c] === false);
  const value = JSON.stringify({ email: lower(email), personId: String(personId || '').slice(0, 60), sub: subscription, prefs: p, ua: String(ua || '').slice(0, 160), at: new Date().toISOString() });
  const { error } = await supabaseAdmin().from('arca_private').upsert({ key: subKey(subscription.endpoint), value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deleteSub(endpoint) {
  await supabaseAdmin().from('arca_private').delete().eq('key', subKey(endpoint));
}

export async function allSubs() {
  const { data, error } = await supabaseAdmin().from('arca_private').select('key,value').like('key', 'push:%');
  if (error) throw error;
  return (data || []).map(r => { try { return { key: r.key, ...JSON.parse(r.value) }; } catch (_) { return null; } }).filter(s => s && s.sub && s.sub.endpoint);
}

// targets: [{ personId, email, msg }] · cat: preferencia que debe estar encendida.
// Une por correo o por persona; un teléfono recibe un solo aviso por persona.
export async function deliver(targets, cat, subs) {
  setup();
  subs = subs || await allSubs();
  const jobs = [], seen = new Set();
  for (const t of targets) {
    if (!t || !t.msg) continue;
    const em = lower(t.email);
    for (const s of subs) {
      if (!((em && s.email === em) || (t.personId && s.personId === t.personId))) continue;
      if (cat && s.prefs && s.prefs[cat] === false) continue;
      const k = s.key + '|' + (t.personId || em);
      if (seen.has(k)) continue;
      seen.add(k);
      jobs.push(webpush.sendNotification(s.sub, JSON.stringify(t.msg), { TTL: 60 * 60 * 12, urgency: 'high' })
        .then(() => 1)
        .catch(async e => { if (e && (e.statusCode === 404 || e.statusCode === 410)) await deleteSub(s.sub.endpoint).catch(() => {}); else console.warn('push', e && e.statusCode, e && e.body); return 0; }));
    }
  }
  const r = await Promise.all(jobs);
  return r.reduce((a, b) => a + b, 0);
}
