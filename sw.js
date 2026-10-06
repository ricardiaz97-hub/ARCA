// Service worker mínimo: permite "Instalar app" en Android/Chrome.
// No guarda nada en caché, así siempre se ve la versión más nueva de Arca.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
