// Gendly Service Worker - Background Notifications & Real-Time Sync
const CACHE_NAME = 'gendly-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Click notification handler: opens or focuses the Gendly app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Message handler from frontend
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: 'https://ui-avatars.com/api/?name=Gendly&background=9333ea&color=ffffff',
      badge: 'https://ui-avatars.com/api/?name=G&background=9333ea&color=ffffff',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      ...options
    });
  }
});
