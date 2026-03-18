/* 書閣 Service Worker v3.0.3 */
const CACHE = 'shuge-v3.0.3';
const SHELL = [
  './index.html','./manifest.json','./icon.svg',
  /* 預快取外部依賴，確保離線（飛航模式）可用 */
  'https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js',
  'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;700&family=Noto+Sans+TC:wght@400;500;700&family=LXGW+WenKai+TC&family=Chiron+Sung+HK&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // App shell: cache-first
  if (SHELL.some(s => url.pathname.endsWith(s.replace('./', '')))) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }
  // CDN resources (fonts, opencc): network-first, fallback to cache
  if (url.origin !== location.origin) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});
