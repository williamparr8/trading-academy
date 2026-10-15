/* Trading Academy — service worker (hors ligne). Deux marqueurs de génération (version et liste des fichiers)
   sont remplacés par tools/build-pages.mjs. La coquille (page et scripts) passe par le réseau d'abord, avec le cache en secours ;
   les cotes historiques (data/*.json) sont servies depuis le cache puis rafraîchies en arrière-plan. */
const BUILD = '__BUILD__';
const SHELL = __SHELL__;
const SHELL_CACHE = 'ta-shell-' + BUILD;
const DATA_CACHE = 'ta-data-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('ta-shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/data\/[^/]+\.json$/.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(DATA_CACHE);
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || new Response('', { status: 504, statusText: 'Hors ligne' });
    })());
    return;
  }
  e.respondWith(
    fetch(req)
      .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(SHELL_CACHE).then((c) => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((m) => m || caches.match('index.html'))),
  );
});
