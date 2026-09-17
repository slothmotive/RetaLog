/* RetaLog service worker - offline-first shell.
 * Fonts/images: cache-first. App files: network-first so updates land
 * immediately, falling back to cache when you are offline. */
const V = 'reta-v9';
const CORE = [
  './', './index.html', './styles.css', './app.js',
  './vendor/chart.umd.min.js', './fonts/fonts.css', './manifest.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/apple-touch-icon.png', './icons/maskable-512.png',
  './icons/egg.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(CORE.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isAsset = u => /\.(ttf|woff2?|png|jpg|svg)$/.test(u);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (isAsset(req.url)) {
    e.respondWith((async () => {
      const cache = await caches.open(V);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) { return hit || Response.error(); }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(V);
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
