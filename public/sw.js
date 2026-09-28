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
          // El backend indica a dónde debe llevar el clic (p. ej. el panel
          // de control para eventos de riego); si no lo manda, se cae al
          // historial de notificaciones.
          url: data.url || '/dashboard/agricultor/notificaciones'
        },
        actions: [
          { action: 'open', title: 'Ver' }
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
      const destino = new URL(urlToOpen, self.location.origin).href;
      // Si ya hay una ventana de Yaku en esa página, enfocarla
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === destino && 'focus' in client) {
          return client.focus();
        }
      }
      // Si hay una ventana de Yaku en otra página, llevarla a la que corresponde
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.startsWith(self.location.origin) && 'navigate' in client) {
          return client.navigate(destino).then(function(c) { return (c || client).focus(); });
        }
      }
      // Si no, abrir una pestaña nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
