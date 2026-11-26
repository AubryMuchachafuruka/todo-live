const CACHE_NAME = 'netpulse-admin-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through live API calls; support PWA installability on Android Chrome
  if (event.request.url.includes('/api/')) return;
});
