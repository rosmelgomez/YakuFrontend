'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import FloatingToast from '@/components/ui/FloatingToast';
import { useAuth } from '@/context/AuthContext';
import { AppNotification } from '@/lib/notifications';
import { apiClient } from '@/services/apiClient';
import {
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  limpiarNotificaciones,
} from '@/services/notificaciones';

export type { AppNotification };

export interface Alerta {
  id: string;
  titulo: string;
  mensaje: string;
  severidad: 'info' | 'advertencia' | 'critica' | 'exito';
  valor?: number;
  link?: string;
}

export interface NotificationContextType {
  activeAlert: Alerta | null;
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'leida'> & { id?: string }) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  activeAlert: null,
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotifications: () => {},
  addNotification: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'administrador' || (user as any)?.id_rol === 1;

  const [activeAlert, setActiveAlert] = useState<Alerta | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // El backend es la única fuente de verdad: así el estado leído/eliminado
  // queda igual en todos los dispositivos de la misma cuenta.
  const fetchNotificaciones = useCallback(async () => {
    if (isAdmin) {
      setNotifications([]);
      return;
    }
    try {
      setNotifications(await getNotificaciones());
    } catch {}
  }, [isAdmin]);

  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  const markAsRead = (id: string) => {
    if (isAdmin) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    marcarNotificacionLeida(id).catch(() => {});
  };

  const markAllAsRead = () => {
    if (isAdmin) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
    marcarTodasLeidas().catch(() => {});
  };

  const clearNotifications = () => {
    if (isAdmin) return;
    setNotifications([]);
    limpiarNotificaciones().catch(() => {});
  };

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'leida'> & { id?: string }) => {
    if (isAdmin) return;
    const newNotif: AppNotification = {
      id: notif.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      titulo: notif.titulo,
      mensaje: notif.mensaje,
      severidad: notif.severidad || 'info',
      timestamp: Date.now(),
      leida: false,
      link: notif.link,
      origen: notif.origen,
      rolDestino: 'agricultor',
    };
    setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)].slice(0, 30));
  }, [isAdmin]);

  const unreadCount = isAdmin ? 0 : notifications.filter((n) => !n.leida).length;

  // Escuchar eventos internos para el agricultor
  useEffect(() => {
    if (isAdmin || typeof window === 'undefined') return;

    let autoHideTimeout: NodeJS.Timeout | null = null;

    const showToastAlert = (alerta: Alerta) => {
      setActiveAlert(alerta);
      if (autoHideTimeout) clearTimeout(autoHideTimeout);
      autoHideTimeout = setTimeout(() => setActiveAlert(null), 6000);
    };

    // 1. Nueva notificación directa
    const handleNuevaNotif = (e: Event) => {
      const customEvent = e as CustomEvent<AppNotification>;
      const item = customEvent.detail;
      if (!item) return;

      addNotification(item);
      showToastAlert({
        id: item.id,
        titulo: item.titulo,
        mensaje: item.mensaje,
        severidad: item.severidad,
      });
    };

    // 2. Dispositivo asignado
    const handleDeviceAssigned = (e: Event) => {
      const customEvent = e as CustomEvent<{ deviceNombre?: string; userNombre?: string; cropNombre?: string }>;
      const { deviceNombre, cropNombre } = customEvent.detail || {};
      const dev = deviceNombre || 'Nodo IoT';
      const crp = cropNombre || 'Parcela';

      const notif = {
        titulo: 'Nuevo dispositivo asignado',
        mensaje: `El administrador ha vinculado el dispositivo '${dev}' a tu parcela '${crp}'.`,
        severidad: 'info' as const,
        link: '/dashboard/agricultor/control',
        origen: 'Administración IoT',
        rolDestino: 'agricultor' as const,
      };
      addNotification(notif);
      showToastAlert({ id: `asg-${Date.now()}`, ...notif });
    };

    // 3. Firmware instalado
    const handleFirmwareInstalled = (e: Event) => {
      const customEvent = e as CustomEvent<{ deviceNombre?: string; version?: string }>;
      const { deviceNombre, version } = customEvent.detail || {};
      const dev = deviceNombre || 'Dispositivo IoT';
      const ver = version || 'v2.4.1';

      const notif = {
        titulo: 'Firmware actualizado en tu nodo',
        mensaje: `Se ha instalado la versión de firmware ${ver} en tu dispositivo '${dev}'.`,
        severidad: 'exito' as const,
        link: '/dashboard/agricultor/control',
        origen: 'Flasher OTA',
        rolDestino: 'agricultor' as const,
      };
      addNotification(notif);
      showToastAlert({ id: `fw-${Date.now()}`, ...notif });
    };

    // 4. Eventos de riego
    const handleRiegoEvento = (e: Event) => {
      const customEvent = e as CustomEvent<{
        tipo: 'inicio' | 'problema' | 'fin';
        parcela?: string;
        volumen?: number;
        motivo?: string;
      }>;
      const { tipo, parcela = 'Sector 1', volumen = 180, motivo } = customEvent.detail || {};

      if (tipo === 'inicio') {
        const notif = {
          titulo: 'Riego iniciado en Parcela',
          mensaje: `Se ha iniciado el ciclo de riego en ${parcela}. Electroválvula abierta y caudal nominal activo.`,
          severidad: 'info' as const,
          link: '/dashboard/agricultor/control',
          origen: 'Sistema de Riego',
          rolDestino: 'agricultor' as const,
        };
        addNotification(notif);
        showToastAlert({ id: `rg-${Date.now()}`, ...notif });
      } else if (tipo === 'problema') {
        const notif = {
          titulo: 'Problema durante el riego',
          mensaje: motivo
            ? `Incidencia en ${parcela}: ${motivo}. Ciclo pausado por precaución.`
            : `Alerta en ${parcela}: Presión insuficiente o ausencia de flujo detectada.`,
          severidad: 'critica' as const,
          link: '/dashboard/agricultor/control',
          origen: 'Sensor de Flujo',
          rolDestino: 'agricultor' as const,
        };
        addNotification(notif);
        showToastAlert({ id: `rg-err-${Date.now()}`, ...notif });
      } else if (tipo === 'fin') {
        const notif = {
          titulo: 'Riego completado con éxito',
          mensaje: `El ciclo de riego en ${parcela} ha concluido satisfactoriamente. Se suministraron ${volumen} L de agua.`,
          severidad: 'exito' as const,
          link: '/dashboard/agricultor/control',
          origen: 'Control Inteligente',
          rolDestino: 'agricultor' as const,
        };
        addNotification(notif);
        showToastAlert({ id: `rg-fin-${Date.now()}`, ...notif });
      }
    };

    window.addEventListener('yaku:nueva_notificacion', handleNuevaNotif);
    window.addEventListener('yaku:device_assigned', handleDeviceAssigned);
    window.addEventListener('yaku:firmware_installed', handleFirmwareInstalled);
    window.addEventListener('yaku:riego_evento', handleRiegoEvento);

    return () => {
      window.removeEventListener('yaku:nueva_notificacion', handleNuevaNotif);
      window.removeEventListener('yaku:device_assigned', handleDeviceAssigned);
      window.removeEventListener('yaku:firmware_installed', handleFirmwareInstalled);
      window.removeEventListener('yaku:riego_evento', handleRiegoEvento);
      if (autoHideTimeout) clearTimeout(autoHideTimeout);
    };
  }, [isAdmin, addNotification]);

  // Conexión WebSocket para telemetría
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let autoHideTimeout: NodeJS.Timeout | null = null;
    let idleTimeout: number | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    let stopped = false;

    const resolveWebSocketUrl = () => {
      // Mismo origen que la página (proxeado por Vite en dev / el reverse
      // proxy en prod): el navegador no debe abrir un WS directo a
      // localhost/IP privada cuando la app se sirve desde un origen publico
      // como un devtunnel (dispara el permiso "Local Network Access").
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws/alertas`;
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
        const { ticket } = await apiClient<{ ticket: string }>('/ws-ticket', {
          method: 'POST',
        });
        const ticketUrl = new URL(wsUrl);
        ticketUrl.searchParams.set('ticket', ticket);
        socket = new WebSocket(ticketUrl.toString());

        socket.onopen = () => {
          reconnectAttempts = 0;
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.tipo === 'control_update' || payload.event === 'control_update' || payload.tipo === 'telemetria') {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('yaku:control_update', { detail: payload }));
              }
            }
            if (payload.tipo === 'notificaciones_sync') {
              if (!isAdmin) void fetchNotificaciones();
              return;
            }
            if (!isAdmin && (payload.severidad || payload.titulo)) {
              const alerta = payload as Alerta;
              setActiveAlert(alerta);
              if (autoHideTimeout) clearTimeout(autoHideTimeout);
              autoHideTimeout = setTimeout(() => setActiveAlert(null), 6000);

              addNotification({
                id: alerta.id,
                titulo: alerta.titulo,
                mensaje: alerta.mensaje,
                severidad: alerta.severidad,
                // El backend indica a dónde debe llevar el clic según el tipo
                // de evento (p. ej. control/actuadores para riego); si no lo
                // manda, se cae al historial de notificaciones.
                link: (payload as any).link || '/dashboard/agricultor/notificaciones',
              });
            }
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

    const startWhenIdle = () => {
      if (typeof window === 'undefined') return;
      if ('requestIdleCallback' in window) {
        idleTimeout = window.requestIdleCallback(() => void connectWS(), { timeout: 3000 });
        return;
      }
      fallbackTimeout = setTimeout(() => void connectWS(), 1500);
    };

    startWhenIdle();
    return () => {
      stopped = true;
      if (idleTimeout !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleTimeout);
      }
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (socket) socket.onclose = null;
      socket?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (autoHideTimeout) clearTimeout(autoHideTimeout);
    };
  }, [isAdmin, addNotification, fetchNotificaciones]);

  return (
    <NotificationContext.Provider
      value={{
        activeAlert,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        addNotification,
      }}
    >
      {children}
      {!isAdmin && activeAlert && <FloatingToast alerta={activeAlert} onClose={() => setActiveAlert(null)} />}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
