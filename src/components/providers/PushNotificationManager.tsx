'use client';

import { useEffect } from 'react';
import { getVapidPublicKey, registrarSuscripcionPush } from '@/actions/alertas';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export default function PushNotificationManager() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return;
    }
    if (!window.isSecureContext) {
      return;
    }

    navigator.serviceWorker.register('/sw.js')
      .then(async (registration) => {
        if (Notification.permission !== 'granted') return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const keyResult = await getVapidPublicKey();
          if (!keyResult.success || !keyResult.publicKey) {
            throw new Error(keyResult.error || 'No se pudo obtener la llave VAPID');
          }
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyResult.publicKey),
          });
        }

        // Sincronizar incluso una suscripción existente permite asociarla
        // correctamente al usuario que acaba de iniciar sesión.
        const result = await registrarSuscripcionPush(subscription.toJSON());
        if (!result.success) throw new Error(result.error);
      })
      .catch(() => undefined);
  }, []);

  return null;
}
