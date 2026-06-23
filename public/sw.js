// Yaku-Next-App-main/public/sw.js

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Alerta Yaku';
      const options = {
        body: data.message || 'Se ha detectado una lectura fuera de rango.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [150, 75, 150, 75, 200],
        data: {
          url: '/dashboard/agricultor/alertas'
        },
        actions: [
          { action: 'open', title: 'Ver Alertas' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch {}
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data ? event.notification.data.url : '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Si ya hay una ventana abierta de Yaku, enfocarla
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir una pestaña nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
