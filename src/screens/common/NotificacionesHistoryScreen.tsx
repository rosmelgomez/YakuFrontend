// src/screens/common/NotificacionesHistoryScreen.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Box, Card, Flex, Text, Button, TextField } from '@radix-ui/themes';
import {
  Bell, Check, Trash2, Search, AlertTriangle, Info, CheckCircle2,
  Filter, Clock, ExternalLink, Shield, Droplets
} from 'lucide-react';
import { useNotifications, AppNotification } from '@/components/providers/NotificationProvider';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

const typeConfig: Record<
  AppNotification['severidad'],
  { icon: React.ElementType; label: string; chip: string; bg: string; border: string; text: string }
> = {
  info: {
    icon: Info,
    label: 'Información',
    chip: 'bg-blue-950/80 text-blue-300 border-blue-800',
    bg: 'bg-blue-950/20',
    border: 'border-blue-900/40',
    text: 'text-blue-400',
  },
  advertencia: {
    icon: AlertTriangle,
    label: 'Advertencia',
    chip: 'bg-amber-950/80 text-amber-300 border-amber-800',
    bg: 'bg-amber-950/20',
    border: 'border-amber-900/40',
    text: 'text-amber-400',
  },
  critica: {
    icon: AlertTriangle,
    label: 'Crítica',
    chip: 'bg-red-950/80 text-red-300 border-red-800',
    bg: 'bg-red-950/20',
    border: 'border-red-900/40',
    text: 'text-red-400',
  },
  exito: {
    icon: CheckCircle2,
    label: 'Éxito',
    chip: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-900/40',
    text: 'text-emerald-400',
  },
};

export default function NotificacionesHistoryScreen() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'administrador' || (user as any)?.id_rol === 1;

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [filterSeverity, setFilterSeverity] = useState<'todas' | AppNotification['severidad']>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const matchSeverity = filterSeverity === 'todas' || n.severidad === filterSeverity;
      const matchSearch =
        !searchTerm.trim() ||
        n.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.mensaje.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.origen && n.origen.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSeverity && matchSearch;
    });
  }, [notifications, filterSeverity, searchTerm]);

  const counts = useMemo(() => {
    return {
      todas: notifications.length,
      critica: notifications.filter((n) => n.severidad === 'critica').length,
      advertencia: notifications.filter((n) => n.severidad === 'advertencia').length,
      info: notifications.filter((n) => n.severidad === 'info').length,
      exito: notifications.filter((n) => n.severidad === 'exito').length,
    };
  }, [notifications]);

  return (
    <Box className="page-content" px={{ initial: "2", sm: "4", md: "6" }} py={{ initial: "3", sm: "4", md: "5" }}>
      <div className="w-full space-y-4 sm:space-y-6">
        {/* CABECERA */}
        <Flex justify="between" align={{ initial: 'start', sm: 'center' }} gap="3" wrap="wrap">
          <div>
            <Flex align="center" gap="2.5" mb="1">
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                <Bell size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                Notificaciones
              </h1>
            </Flex>
            <p className="text-xs sm:text-sm text-slate-400">
              {isAdmin
                ? "Registro cronológico de eventos del parque IoT, despliegue de firmware y usuarios."
                : "Registro cronológico de ciclos de riego, incidencias operativas y asignaciones de hardware."}
            </p>
          </div>

          <Flex gap="2" align="center" wrap="wrap">
            {unreadCount > 0 && (
              <Button
                variant="soft"
                color="indigo"
                size="2"
                onClick={markAllAsRead}
                style={{ cursor: 'pointer' }}
              >
                <Check size={16} />
                Marcar todas como leídas ({unreadCount})
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="soft"
                color="red"
                size="2"
                onClick={() => {
                  if (confirm("¿Seguro que deseas vaciar todo el historial de notificaciones?")) {
                    clearNotifications();
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <Trash2 size={16} />
                Vaciar historial
              </Button>
            )}
          </Flex>
        </Flex>

        {/* CONTADORES / FILTROS RESUMEN */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <button
            onClick={() => setFilterSeverity('todas')}
            className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              filterSeverity === 'todas'
                ? 'bg-slate-800/90 border-slate-600 shadow-md ring-1 ring-slate-500'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-300">Todas</span>
              <Filter size={13} className="text-slate-400" />
            </div>
            <div className="mt-1 sm:mt-2 font-mono font-bold text-lg sm:text-2xl text-white">
              {counts.todas}
            </div>
          </button>

          {(['critica', 'advertencia', 'info', 'exito'] as const).map((sev) => {
            const cfg = typeConfig[sev];
            const Icon = cfg.icon;
            const isSelected = filterSeverity === sev;
            return (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`p-2.5 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? `${cfg.bg} ${cfg.border} shadow-md ring-1 ring-current ${cfg.text}`
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-300">{cfg.label}</span>
                  <Icon size={13} className={cfg.text} />
                </div>
                <div className={`mt-1 sm:mt-2 font-mono font-bold text-lg sm:text-2xl ${cfg.text}`}>
                  {counts[sev]}
                </div>
              </button>
            );
          })}
        </div>

        {/* BUSCADOR */}
        <div className="relative">
          <TextField.Root
            placeholder="Buscar por título, descripción o módulo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="2"
            style={{ background: '#0b1329', color: 'white', borderColor: '#1e293b', borderRadius: '10px' }}
          >
            <TextField.Slot>
              <Search size={15} color="#94a3b8" />
            </TextField.Slot>
          </TextField.Root>
        </div>

        {/* LISTA DE NOTIFICACIONES */}
        <div className="space-y-2.5 sm:space-y-3">
          {filtered.map((item) => {
            const cfg = typeConfig[item.severidad] || typeConfig.info;
            const Icon = cfg.icon;
            return (
              <Card
                key={item.id}
                size="1"
                style={{
                  background: item.leida ? '#0a1020' : '#0d1730',
                  borderColor: item.leida ? '#1e293b' : '#334155',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Icono de severidad */}
                  <div className={`shrink-0 p-2 sm:p-2.5 rounded-xl border ${cfg.bg} ${cfg.border} ${cfg.text} mt-0.5`}>
                    <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </div>

                  {/* Detalle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-white text-xs sm:text-sm tracking-wide">
                        {item.titulo}
                      </h4>
                      <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border ${cfg.chip}`}>
                        {cfg.label.toUpperCase()}
                      </span>
                      {!item.leida && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" title="Sin leer" />
                      )}
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed mb-2 break-words">
                      {item.mensaje}
                    </p>

                    <div className="flex items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(item.timestamp).toLocaleString('es-PE', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {item.origen && (
                        <>
                          <span>·</span>
                          <span className="text-slate-500">Origen: {item.origen}</span>
                        </>
                      )}
                      {item.link && (
                        <>
                          <span>·</span>
                          <Link
                            to={item.link}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline font-medium"
                          >
                            Ver en panel
                            <ExternalLink size={11} />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="shrink-0 flex items-center gap-1">
                    {!item.leida && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
                        title="Marcar como leída"
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-semibold text-white text-base">
                No hay notificaciones para mostrar
              </h3>
              <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                {filterSeverity !== 'todas'
                  ? `No se encontraron avisos con severidad "${typeConfig[filterSeverity].label}".`
                  : "Todas las operaciones del sistema y lecturas de telemetría se encuentran al día."}
              </p>
            </div>
          )}
        </div>

        {/* NOTA INFORMATIVA AL PIE (ESTILO YAKU) */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex gap-3 text-xs text-slate-400">
          <Shield size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-200 mb-0.5">
              Acerca de las notificaciones de {isAdmin ? "Administrador" : "Agricultor"}
            </p>
            <p className="leading-relaxed">
              {isAdmin
                ? "Este panel supervisa la trazabilidad del sistema: inventario de microcontroladores ESP32, asignación de nodos en campo, versiones binarias instaladas y estados de conectividad."
                : "Este panel registra de forma personalizada el ciclo completo de su cultivo: aviso de inicio de riego, detección temprana de anomalías en tuberías o presión, confirmación de litros suministrados, y avisos de hardware asignado por el administrador."}
            </p>
          </div>
        </div>
      </div>
    </Box>
  );
}
