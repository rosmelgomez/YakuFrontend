'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import FloatingToast from '@/components/ui/FloatingToast';

interface Alerta {
  id: string;
  titulo: string;
  mensaje: string;
  severidad: 'info' | 'advertencia' | 'critica';
  valor?: number;
}

const NotificationContext = createContext<{ activeAlert: Alerta | null }>({ activeAlert: null });

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [activeAlert, setActiveAlert] = useState<Alerta | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let autoHideTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    let stopped = false;

    const resolveWebSocketUrl = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      const configuredUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (!configuredUrl) return `${protocol}//${hostname}:8000/ws/alertas`;

      try {
        const url = new URL(configuredUrl);
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && ['localhost', '127.0.0.1'].includes(url.hostname)) {
          url.hostname = hostname;
        }
        url.protocol = protocol;
        return url.toString();
      } catch {
        return `${protocol}//${hostname}:8000/ws/alertas`;
      }
    };

    const connectWS = async () => {
      if (stopped) return;
      const wsUrl = resolveWebSocketUrl();

      const scheduleReconnect = () => {
        if (stopped) return 0;
        const delay = Math.min(60000, 5000 * Math.pow(2, reconnectAttempts));
        reconnectAttempts += 1;
        reconnectTimeout = setTimeout(connectWS, delay);
        return delay;
      };

      try {
        const ticketResponse = await fetch('/api/ws-ticket', { method: 'POST' });
        if (!ticketResponse.ok) {
          scheduleReconnect();
          return;
        }
        const { ticket } = await ticketResponse.json();
        const ticketUrl = new URL(wsUrl);
        ticketUrl.searchParams.set('ticket', ticket);
        socket = new WebSocket(ticketUrl.toString());

        socket.onopen = () => {
          reconnectAttempts = 0;
        };

        socket.onmessage = (event) => {
          try {
            const alert: Alerta = JSON.parse(event.data);
            setActiveAlert(alert);
            if (autoHideTimeout) clearTimeout(autoHideTimeout);
            autoHideTimeout = setTimeout(() => setActiveAlert(null), 6000);
          } catch {}
        };

        socket.onclose = () => {
          scheduleReconnect();
        };

        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        scheduleReconnect();
      }
    };

    connectWS();
    return () => {
      stopped = true;
      if (socket) socket.onclose = null;
      socket?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (autoHideTimeout) clearTimeout(autoHideTimeout);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ activeAlert }}>
      {children}
      {activeAlert && <FloatingToast alerta={activeAlert} onClose={() => setActiveAlert(null)} />}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
