// src/components/layout/TopBar.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications, AppNotification } from '@/components/providers/NotificationProvider';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  X,
} from 'lucide-react';

const routeTitles: Record<string, { title: string; subtitle?: string }> = {
  // Agricultor
  '/dashboard/agricultor': { title: 'Panel de control', subtitle: 'Resumen de telemetría en tiempo real' },
  '/dashboard/agricultor/control': { title: 'Control de Riego', subtitle: 'Gestión de bombas, actuadores y umbrales' },
  '/dashboard/agricultor/historico': { title: 'Histórico', subtitle: 'Tendencias y gráficos multivariable' },
  '/dashboard/agricultor/alertas': { title: 'Historial de notificaciones', subtitle: 'Notificaciones y avisos automáticos' },
  '/dashboard/agricultor/notificaciones': { title: 'Historial de notificaciones', subtitle: 'Avisos de riego, incidencias y hardware' },
  '/dashboard/agricultor/ml': { title: 'Inteligencia IA', subtitle: 'Modelos predictivos y recomendaciones' },
  '/dashboard/agricultor/feedback': { title: 'Valoraciones', subtitle: 'Opiniones y comentarios sobre el sistema' },
  '/dashboard/agricultor/perfil': { title: 'Mi Perfil', subtitle: 'Configuración, finca, notificaciones y seguridad' },
  '/dashboard/agricultor/cultivos': { title: 'Mis Cultivos', subtitle: 'Gestión de parcelas y registro de variedades' },
  '/dashboard/agricultor/fuente-agua': { title: 'Fuente de Agua', subtitle: 'Monitoreo de reservorios y red de suministro' },

  // Administrador
  '/dashboard/administrador': { title: 'Panel de Administración', subtitle: 'Supervisión global de usuarios y dispositivos' },
  '/dashboard/administrador/usuarios': { title: 'Gestión de Usuarios', subtitle: 'Cuentas de agricultores y administradores' },
  '/dashboard/administrador/dispositivos': { title: 'Dispositivos IoT', subtitle: 'Gestión del parque y nodos conectados' },
  '/dashboard/administrador/componentes': { title: 'Componentes IoT', subtitle: 'Gestión de sensores, actuadores y piezas de stock' },
  '/dashboard/administrador/asignar-dispositivo': { title: 'Asignar Dispositivo', subtitle: 'Vinculación de hardware IoT a usuarios y parcelas' },
  '/dashboard/administrador/firmware': { title: 'Firmware', subtitle: 'Flasheo USB serie y versiones binarias' },
  '/dashboard/administrador/catalogo': { title: 'Catálogos del Sistema', subtitle: 'Especies botánicas y división territorial' },
  '/dashboard/administrador/feedback': { title: 'Preguntas de Feedback', subtitle: 'Configuración de encuestas y valoraciones' },
  '/dashboard/administrador/almacenes': { title: 'Almacenes', subtitle: 'Inventario físico y distribución de stock' },
  '/dashboard/administrador/respaldo': { title: 'Respaldo de Base de Datos', subtitle: 'Exportación y copias de seguridad' },
  '/dashboard/administrador/perfil': { title: 'Mi Perfil', subtitle: 'Configuración de cuenta y niveles de seguridad' },
};

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays}d`;
}

function getNotificationIcon(severidad: AppNotification['severidad']) {
  switch (severidad) {
    case 'critica':
      return <AlertTriangle size={16} className="text-red-400" />;
    case 'advertencia':
      return <AlertCircle size={16} className="text-amber-400" />;
    case 'exito':
      return <CheckCircle2 size={16} className="text-emerald-400" />;
    case 'info':
    default:
      return <Info size={16} className="text-indigo-400" />;
  }
}

function getNotificationBg(severidad: AppNotification['severidad']) {
  switch (severidad) {
    case 'critica':
      return 'bg-red-500/15 border-red-500/30';
    case 'advertencia':
      return 'bg-amber-500/15 border-amber-500/30';
    case 'exito':
      return 'bg-emerald-500/15 border-emerald-500/30';
    case 'info':
    default:
      return 'bg-indigo-500/15 border-indigo-500/30';
  }
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const currentInfo = routeTitles[location.pathname] || {
    title: 'Yaku',
    subtitle: 'Sistema de Riego Inteligente',
  };

  const todayStr = new Date().toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isAdmin = location.pathname.startsWith('/dashboard/administrador');

  return (
    <header className="w-full bg-[#030a1c]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div>
        <h1 className="font-bold text-white text-lg leading-tight tracking-tight">{currentInfo.title}</h1>
        {currentInfo.subtitle && (
          <p className="text-slate-400 text-xs mt-0.5">{currentInfo.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden sm:inline-block text-slate-400 text-xs font-mono capitalize">
          {todayStr}
        </span>

        {/* CONTENEDOR DEL BOTÓN Y PANEL FLOTANTE DE NOTIFICACIONES (SOLO PARA AGRICULTOR) */}
        {!isAdmin && (
          <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`relative p-2.5 rounded-xl transition-all cursor-pointer border ${
              isOpen
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/50'
            }`}
            title="Notificaciones y avisos"
            aria-label="Ver notificaciones"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-md shadow-red-950/60 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* SECCIÓN FLOTANTE DE NOTIFICACIONES */}
          {isOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '380px',
                maxWidth: 'calc(100vw - 32px)',
                background: '#081420',
                border: '1px solid #1e293b',
                borderRadius: '20px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                zIndex: 150,
                overflow: 'hidden',
              }}
            >
              {/* CABECERA DE LA SECCIÓN FLOTANTE */}
              <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">Notificaciones</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10.5px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 bg-transparent border-none cursor-pointer"
                      title="Marcar todas como leídas"
                    >
                      <CheckCheck size={13} />
                      <span>Marcar leídas</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors bg-transparent border-none cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* LISTA DE NOTIFICACIONES */}
              <div className="overflow-y-auto" style={{ maxHeight: '360px', scrollbarWidth: 'thin' }}>
                {notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-2.5">
                      <Bell size={22} className="opacity-60" />
                    </div>
                    <p className="text-white text-sm font-medium">Sin notificaciones</p>
                    <p className="text-slate-400 text-xs mt-1 max-w-[230px]">
                      Todo marcha en orden. Aquí verás los avisos de riego, telemetría y alertas automáticas.
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => {
                    const icon = getNotificationIcon(item.severidad);
                    const bgClass = getNotificationBg(item.severidad);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          markAsRead(item.id);
                          if (item.link) {
                            setIsOpen(false);
                            navigate(item.link);
                          }
                        }}
                        className={`px-4 py-3 border-b border-slate-800/50 flex items-start gap-3 transition-colors cursor-pointer ${
                          item.leida ? 'hover:bg-white/[0.03]' : 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${bgClass}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs font-semibold leading-tight truncate ${item.leida ? 'text-slate-300' : 'text-white'}`}>
                              {item.titulo}
                            </p>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-slate-400 mt-1 leading-snug line-clamp-2">
                            {item.mensaje}
                          </p>
                        </div>
                        {!item.leida && (
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" title="No leída" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* PIE DE LA SECCIÓN FLOTANTE */}
              <div className="px-4 py-2.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/dashboard/agricultor/notificaciones');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 bg-transparent border-none cursor-pointer transition-colors"
                >
                  <span>Ver historial completo</span>
                  <ArrowRight size={13} />
                </button>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearNotifications}
                    className="text-slate-500 hover:text-red-400 text-[11px] bg-transparent border-none cursor-pointer transition-colors"
                    title="Vaciar notificaciones"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </header>
  );
}
