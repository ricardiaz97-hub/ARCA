// Manda avisos al teléfono.
//  · POST (desde Arca, con sesión): asignaciones de servicios y tareas, movimientos de la votación de comida y aviso de prueba.
//    El navegador solo dice qué cambió; los textos se arman aquí con lo guardado en Supabase.
//  · GET (Vercel Cron, una vez al día por la tarde): “Mañana sirves” y “Tu tarea vence mañana”.
import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { currentUser } from '../../lib/arca-auth.js';
import { spacesOfEmail } from '../../lib/arca-admins.js';
import { deliver, allSubs } from '../../lib/push.js';

const TZ = 'America/El_Salvador';
const lower = s => String(s || '').trim().toLowerCase();
const first = n => String(n || '').trim().split(/\s+/)[0] || 'Alguien';
const money = n => '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
const pad = n => String(n).padStart(2, '0');
const todayIn = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = s => new Date(s + 'T12:00:00Z').getUTCDay();
const fDate = s => new Date(s + 'T12:00:00Z').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const ampm = t => { if (!t) return ''; const [h, m] = String(t).split(':').map(Number); return ((h + 11) % 12 + 1) + ':' + pad(m || 0) + (h < 12 ? ' a. m.' : ' p. m.'); };
const norm = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

async function records(sb, space, collection, ids) {
  let q = sb.from('arca_records').select('id,data').eq('space', space).eq('collection', collection);
  if (ids) q = q.in('id', ids);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(r => ({ id: r.id, ...(r.data || {}) }));
}
// Como fillLineup/lineupFor de index.html: un culto recurrente sin equipo propio usa el equipo fijo.
function lineupOf(svc, recById) {
  if (svc.recurringId && !(svc.assignments || []).length && !svc.lineupOff) return (recById.get(svc.recurringId)?.lineup || []);
  return svc.assignments || [];
}

/* ---------- Asignaciones ---------- */
async function assigned(sb, space, b, people, actor) {
  const ids = [...new Set((Array.isArray(b.personIds) ? b.personIds : []).map(String))].slice(0, 60);
  if (!ids.length) return [];
  const by = actor ? first(actor.name) : '';
  if (b.collection === 'services') {
    const [svc] = await records(sb, space, 'services', [String(b.id)]);
    if (!svc || svc.cancelled) return [];
    const rec = svc.recurringId ? await records(sb, space, 'recurring', [svc.recurringId]) : [];
    const lu = lineupOf(svc, new Map(rec.map(r => [r.id, r])));
    return ids.map(pid => {
      const mine = lu.filter(a => a.personId === pid && a.status !== 'declinado');
      const p = people.get(pid);
      if (!mine.length || !p) return null;
      return { personId: pid, email: p.email, msg: {
        title: `🎶 Te programaron: ${svc.title || 'Servicio'}`,
        body: `${[...new Set(mine.map(a => a.position).filter(Boolean))].join(', ') || 'Servir'} · ${fDate(svc.date)}${svc.time ? ' · ' + ampm(svc.time) : ''}${by ? ' · de ' + by : ''}. Entra a confirmar.`,
        url: '/#turno', route: 'turno', tag: 'svc-' + svc.id } };
    }).filter(Boolean);
  }
  if (b.collection === 'tasks') {
    const [t] = await records(sb, space, 'tasks', [String(b.id)]);
    if (!t || t.status === 'done') return [];
    const ass = new Set([...(Array.isArray(t.assigneeIds) ? t.assigneeIds : []), t.assigneeId].filter(Boolean));
    return ids.filter(pid => ass.has(pid) && people.get(pid)).map(pid => ({ personId: pid, email: people.get(pid).email, msg: {
      title: '📌 Nueva tarea para ti',
      body: `${t.title || 'Tarea'}${t.due ? ' · vence el ' + fDate(t.due) : ''}${by ? ' · de ' + by : ''}`,
      url: '/#tareas', route: 'tareas', tag: 'task-' + t.id } }));
  }
  return [];
}

/* ---------- Comida ---------- */
async function comida(sb, space, b, people, actor) {
  const [o] = await records(sb, space, 'comidas', [String(b.id)]);
  if (!o || o.kind !== 'order') return [];
  const { data, error } = await sb.from('arca_records').select('id,data').eq('space', space).eq('collection', 'comidas').like('id', o.id + '~%');
  if (error) throw error;
  const rows = (data || []).map(r => r.data || {}).filter(r => r.kind === 'me' && people.get(r.pid));
  const opt = id => (o.options || []).find(x => x.id === id);
  const w = opt(o.winner);
  const eaters = rows.filter(r => r.ans === 'como');
  const sum = r => (r.items || []).reduce((t, it) => t + (Number(it.price) || 0) * Math.max(1, Number(it.qty) || 1), 0);
  const withFood = eaters.filter(r => (r.items || []).length);
  const extra = Math.max(0, Number(o.delivery) || 0), share = withFood.length ? extra / withFood.length : 0;
  const total = withFood.reduce((t, r) => t + sum(r), 0) + extra;
  const who = b.pid && people.get(String(b.pid)) ? String(b.pid) : actor?.id;
  const name = who ? first(people.get(who)?.name) : 'Alguien';
  const row = rows.find(r => r.pid === who) || {};
  const tally = (o.options || []).map(x => ({ x, n: eaters.filter(r => r.vote === x.id).length })).sort((a, c) => c.n - a.n);
  const base = { url: '/#comida', route: 'comida', comidaId: o.id };
  let msg = null, only = null;
  switch (b.event) {
    case 'open': msg = { title: `🍽️ ${o.title || 'Comida del domingo'}: ¡a votar!`, body: `${name} abrió la votación: ${(o.options || []).map(x => x.name).join(', ')}.${o.closeTime ? ' Cierra a las ' + ampm(o.closeTime) + '.' : ''}` }; break;
    case 'vote': { const v = opt(row.vote); if (!v) return []; const lead = tally[0];
      msg = { title: `🗳️ ${name} votó por ${v.name}`, body: lead && lead.n ? `Va ganando ${lead.x.name} con ${lead.n} voto${lead.n === 1 ? '' : 's'}.` : '' }; break; }
    case 'answer': { const a = row.ans; if (!a) return [];
      msg = { title: a === 'como' ? `🍽️ ${name} va a comer con el grupo` : a === 'aparte' ? `🥡 ${name} va a comer aparte` : `🚫 ${name} no va`, body: `${eaters.length} comen con el grupo.` }; break; }
    case 'pick': { if (!(row.items || []).length) return [];
      const txt = row.items.map(it => `${Math.max(1, Number(it.qty) || 1) > 1 ? Math.max(1, Number(it.qty) || 1) + ' × ' : ''}${it.name}${Number(it.price) ? ' - ' + money(it.price) : ''}`).join(', ');
      msg = { title: `🍕 ${name} escogió ${txt}`, body: `${withFood.length} de ${eaters.length} ya escogieron · total ${money(total)}` }; break; }
    case 'winner': if (!w) return []; msg = { title: `🏆 Ganó el restaurante “${w.name}”`, body: 'Entra a Arca y escoge tu comida con su precio.' }; break;
    case 'ordered': msg = { title: `🛵 Pedido hecho${w ? ' en ' + w.name : ''}`, body: `Total ${money(total)}. Entra a ver cuánto te toca.` }; break;
    case 'paid': if (!who) return []; only = who; msg = { title: '✅ Pago recibido', body: `${actor ? first(actor.name) : 'El encargado'} marcó que ya pagaste ${money(sum(row) + share)}. ¡Gracias!` }; break;
    default: return [];
  }
  const targets = only ? [only] : [...people.keys()];
  return targets.map(pid => {
    const p = people.get(pid);
    if (!p || p.status === 'inactivo') return null;
    if (!only && actor && pid === actor.id) return null;
    let m = { ...base, ...msg };
    if (b.event === 'ordered') { const r = withFood.find(x => x.pid === pid); if (r && pid !== o.payer) m = { ...m, body: `Te toca ${money(sum(r) + share)}${o.payer && people.get(o.payer) ? ' · dáselo a ' + first(people.get(o.payer).name) : ''}. Total ${money(total)}.` }; }
    return { personId: pid, email: p.email, msg: m };
  }).filter(Boolean);
}

/* ---------- Recordatorios diarios (cron) ---------- */
async function daily(sb, res) {
  const space = 'philly';
  const tomorrow = addDays(todayIn(), 1);
  const [people, services, recurring, tasks] = await Promise.all(['people', 'services', 'recurring', 'tasks'].map(c => records(sb, space, c)));
  const P = new Map(people.map(p => [p.id, p]));
  const recById = new Map(recurring.map(r => [r.id, r]));
  const real = services.filter(s => s.date === tomorrow && !s.cancelled);
  const ids = new Set(services.filter(s => s.date === tomorrow).map(s => s.id));
  const last = new Date(addDays(tomorrow, 7) + 'T12:00:00Z').getUTCMonth() !== new Date(tomorrow + 'T12:00:00Z').getUTCMonth();
  const virt = recurring.filter(r => r.active !== false && Number(r.weekday) === dow(tomorrow) && (r.freq === 'last' ? last : !(r.skipLast && last)))
    .map(r => ({ id: 'r-' + r.id + '-' + tomorrow, title: r.title, date: tomorrow, time: r.time, recurringId: r.id, assignments: [] }))
    .filter(s => !ids.has(s.id));
  const targets = [];
  for (const s of [...real, ...virt]) {
    const byPerson = new Map();
    for (const a of lineupOf(s, recById)) {
      const p = a.personId && P.get(a.personId);
      if (!p || p.always || p.status === 'inactivo' || a.status === 'declinado') continue;
      const cur = byPerson.get(a.personId) || { pos: [], pend: false };
      if (a.position) cur.pos.push(a.position);
      cur.pend = cur.pend || a.status !== 'confirmado';
      byPerson.set(a.personId, cur);
    }
    for (const [pid, x] of byPerson) targets.push({ personId: pid, email: P.get(pid).email, msg: {
      title: `⏰ Mañana sirves: ${s.title || 'Servicio'}`,
      body: `${[...new Set(x.pos)].join(', ') || 'Servir'}${s.time ? ' · ' + ampm(s.time) : ''}${x.pend ? ' · aún no confirmas' : ''}`,
      url: '/#turno', route: 'turno', tag: 'rem-' + s.id } });
  }
  for (const t of tasks.filter(t => t.due === tomorrow && t.status !== 'done')) {
    const ass = [...new Set([...(Array.isArray(t.assigneeIds) ? t.assigneeIds : []), t.assigneeId].filter(Boolean))];
    for (const pid of ass) if (P.get(pid)) targets.push({ personId: pid, email: P.get(pid).email, msg: { title: '📌 Tu tarea vence mañana', body: t.title || 'Tarea', url: '/#tareas', route: 'tareas', tag: 'due-' + t.id } });
  }
  const sent = targets.length ? await deliver(targets, 'recordatorios') : 0;
  return res.json({ ok: true, date: tomorrow, targets: targets.length, sent });
}

export default async function handler(req, res) {
  try {
    const sb = supabaseAdmin();
    if (req.method === 'GET') {
      const secret = String(process.env.CRON_SECRET || '').trim();
      if (!secret || req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorized' });
      return await daily(sb, res);
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: 'not_authenticated', message: 'Inicia sesión en Arca primero.' });
    const b = req.body || {};
    const space = b.space === 'jev' ? 'jev' : 'philly';
    const email = lower(user.email);

    if (b.kind === 'test') {
      const subs = await allSubs(), errors = [];
      const mine = subs.filter(s => s.email === email || (b.from && s.personId === String(b.from)));
      const here = b.endpoint ? mine.some(s => s.sub.endpoint === b.endpoint) : null;
      const sent = await deliver([{ email, personId: String(b.from || ''), msg: { title: '🔔 ¡Funciona!', body: 'Así te van a llegar los avisos de Arca.', url: '/#turno', route: 'turno' } }], null, subs, errors);
      return res.json({ ok: true, sent, devices: mine.length, here, errors });
    }

    if (!(await spacesOfEmail(sb, email)).includes(space)) return res.status(403).json({ error: 'no_access', message: 'No perteneces a ese grupo.' });
    const list = await records(sb, space, 'people');
    const people = new Map(list.map(p => [p.id, p]));
    // Quién lo hizo: la persona vinculada a esta cuenta; si no hay, el nombre que eligió en Tú.
    const actor = list.find(p => p.auth_user_id === user.id) || list.find(p => email && lower(p.email) === email) || (b.from && people.get(String(b.from))) || null;

    let targets = [], cat = '';
    if (b.kind === 'assigned') { cat = 'asignaciones'; targets = await assigned(sb, space, b, people, actor); }
    else if (b.kind === 'comida') { cat = 'comida'; targets = await comida(sb, space, b, people, actor); }
    else return res.status(400).json({ error: 'bad_kind' });
    // Nunca te avisa de lo que tú mismo hiciste (salvo un pago que otro marcó por ti).
    if (b.event !== 'paid') targets = targets.filter(t => !(actor && t.personId === actor.id) && !(t.email && lower(t.email) === email));
    const sent = targets.length ? await deliver(targets, cat) : 0;
    res.json({ ok: true, targets: targets.length, sent });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'push_failed', message: /VAPID/.test(e.message || '') ? 'Los avisos aún no están configurados en Vercel.' : 'No se pudo mandar el aviso.' });
  }
}
