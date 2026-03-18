/* 書閣 Service Worker v3.0.4 */
const CACHE = 'shuge-v3.0.4';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      // 本機 shell：必須成功，確保導航攔截可用
      await c.addAll(['./index.html', './manifest.json', './icon.svg']);
      // CDN 資源：最佳努力，失敗不中斷安裝
      await Promise.allSettled([
        'https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js',
        'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;700&family=Noto+Sans+TC:wght@400;500;700&family=LXGW+WenKai+TC&family=Chiron+Sung+HK&display=swap'
      ].map(url => fetch(url).then(r => r.ok ? c.put(url, r) : null).catch(() => null)));
      self.skipWaiting();
    })
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
  // 導航請求 → 從快取提供 index.html（飛航模式離線啟動的關鍵）
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(r => r || fetch(e.request)));
    return;
  }
  const url = new URL(e.request.url);
  // 本機 app shell：cache-first
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }
  // CDN 資源：cache-first（離線可用），快取沒有才上網
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => new Response('', {status: 503})))
  );
});
