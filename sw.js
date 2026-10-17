// Keeps Shop Till working offline. Bump VERSION (and APP_VERSION in index.html) when you upload a new index.html.
const VERSION = 'shoptill-v7';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js',
];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's normal cache, so a new version always stores fresh files
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Online: get the latest files (and keep a copy). Offline or slow (>4s): use the saved copy.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const ours = url.origin === location.origin || FILES.indexOf(req.url) >= 0;
  if (!ours) return; // e.g. Open Food Facts lookups go straight to the network
  e.respondWith(caches.open(VERSION).then(cache => {
    const fromCache = () => cache.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? cache.match('./index.html') : undefined));
    const net = fetch(req, { cache: 'no-cache' }).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    const slow = new Promise(r => setTimeout(r, 4000)).then(fromCache);
    return Promise.race([net.catch(fromCache), slow.then(hit => hit || net)]).then(res => res || fromCache());
  }));
});
