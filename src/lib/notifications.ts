// src/lib/notifications.ts

export interface AppNotification {
  id: string;
  titulo: string;
  mensaje: string;
  severidad: 'info' | 'advertencia' | 'critica' | 'exito';
  timestamp: number;
  leida: boolean;
  link?: string;
  origen?: string;
  rolDestino?: 'agricultor';
}

export const DEFAULT_AGRICULTOR_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-agri-1',
    titulo: 'Riego iniciado en Parcela',
    mensaje: 'Se ha iniciado el ciclo de riego programado en Sector 1. Electroválvula abierta y caudal nominal estable.',
    severidad: 'info',
    timestamp: Date.now() - 1000 * 60 * 12, // Hace 12m
    leida: false,
    link: '/dashboard/agricultor/control',
    origen: 'Sistema de Riego',
    rolDestino: 'agricultor',
  },
  {
    id: 'notif-agri-2',
    titulo: 'Problema durante el riego',
    mensaje: 'Alerta en Sector 1: Disminución anómala de caudal y presión. Verifique la tubería o fuente de agua.',
    severidad: 'critica',
    timestamp: Date.now() - 1000 * 60 * 45, // Hace 45m
    leida: false,
    link: '/dashboard/agricultor/control',
    origen: 'Sensor de Flujo',
    rolDestino: 'agricultor',
  },
  {
    id: 'notif-agri-3',
    titulo: 'Riego completado con éxito',
    mensaje: 'La sesión de riego en Sector 1 finalizó correctamente. Se aplicaron 180 L de agua en 25 minutos.',
    severidad: 'exito',
    timestamp: Date.now() - 1000 * 60 * 130, // Hace ~2h
    leida: true,
    link: '/dashboard/agricultor/control',
    origen: 'Control Inteligente',
    rolDestino: 'agricultor',
  },
  {
    id: 'notif-agri-4',
    titulo: 'Nuevo dispositivo asignado',
    mensaje: 'El administrador ha vinculado el nodo IoT (ESP32-YKU-02) a tu parcela para monitoreo y control de electroválvulas.',
    severidad: 'info',
    timestamp: Date.now() - 1000 * 60 * 360, // Hace 6h
    leida: true,
    link: '/dashboard/agricultor/control',
    origen: 'Administración IoT',
    rolDestino: 'agricultor',
  },
  {
    id: 'notif-agri-5',
    titulo: 'Firmware actualizado en tu nodo',
    mensaje: 'Se completó con éxito la instalación del firmware Yaku v2.4.1 en tu dispositivo de campo.',
    severidad: 'exito',
    timestamp: Date.now() - 1000 * 60 * 1440, // Hace 1d
    leida: true,
    link: '/dashboard/agricultor/control',
    origen: 'Servicio OTA / WebSerial',
    rolDestino: 'agricultor',
  },
];

/**
 * Emite una notificación para el agricultor guardándola en localStorage
 * y disparando un CustomEvent para actualización en tiempo real en la pestaña activa.
 */
export function emitirNotificacion(notif: {
  titulo: string;
  mensaje: string;
  severidad: 'info' | 'advertencia' | 'critica' | 'exito';
  rolDestino?: 'agricultor';
  link?: string;
  origen?: string;
}) {
  if (typeof window === 'undefined') return;

  const nuevaNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    titulo: notif.titulo,
    mensaje: notif.mensaje,
    severidad: notif.severidad,
    timestamp: Date.now(),
    leida: false,
    link: notif.link,
    origen: notif.origen,
    rolDestino: 'agricultor',
  };

  try {
    const storageKey = 'yaku_notifications_agricultor';
    const saved = localStorage.getItem(storageKey);
    let list: AppNotification[] = saved ? JSON.parse(saved) : [];
    list = [nuevaNotif, ...list].slice(0, 50);
    localStorage.setItem(storageKey, JSON.stringify(list));
  } catch {}

  window.dispatchEvent(
    new CustomEvent('yaku:nueva_notificacion', {
      detail: nuevaNotif,
    })
  );
}
