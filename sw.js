// Service worker: deixa o app instalável e abrindo rápido.
// Estratégia "rede primeiro": sempre pega a versão nova; usa o cache só offline.
const CACHE = 'raiz-v6';
const SHELL = [
  './', './index.html', './css/style.css', './manifest.webmanifest', './icons/icon.svg',
  './js/config.js', './js/sound.js', './js/utils.js', './js/gamification.js', './js/data.js', './js/notify.js',
  './js/exercises.js', './js/focus.js', './js/plan.js', './js/hrt.js', './js/views.js', './js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Lembretes (notificações enviadas pelo Supabase)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Raiz', {
    body: d.body || '',
    tag: d.tag || 'raiz',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: { url: d.url || './' },
    vibrate: [80, 60, 80],
    renotify: true
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Supabase/CDN: direto na rede
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
