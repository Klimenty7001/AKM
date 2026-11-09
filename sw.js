/* ============================================================
   AKM LEGENDS v3.3 — Service Worker
   ОБНОВЛЕНИЕ ВЕРСИИ: менял код на GitHub → подними версию ниже
   (v3.3 → v3.4) и один раз открой приложение с интернетом.
   ============================================================ */
const CACHE_VERSION = 'akm-legends-v3.3';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;

  /* Переходы по навигации офлайн: отдаём оболочку приложения */
  if(req.mode === 'navigate'){
    event.respondWith(
      caches.match('./index.html').then(cached => cached || fetch(req))
    );
    return;
  }

  /* Остальные GET: cache-first + докачка и сохранение (фото и др.) */
  event.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(resp => {
        if(resp && resp.ok && resp.type === 'basic'){
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
