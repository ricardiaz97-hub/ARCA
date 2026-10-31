// Service worker de Arca: permite "Instalar app" y recibe los avisos (push).
// No guarda nada en caché, así siempre se ve la versión más nueva de Arca.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Arca', {
    body: d.body || '',
    icon: '/img/icon-192.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || '/#turno', route: d.route || '', comidaId: d.comidaId || '' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  const url = new URL(d.url || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = list.find(c => c.url.startsWith(self.location.origin));
    if (open) {
      if (d.route) open.postMessage({ arcaRoute: d.route, comidaId: d.comidaId });
      return open.focus();
    }
    return self.clients.openWindow(url);
  })());
});
