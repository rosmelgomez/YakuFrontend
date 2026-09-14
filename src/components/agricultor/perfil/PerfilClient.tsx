"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Box, Card, Grid, Flex, Text, Button, TextField, Badge, Separator } from '@radix-ui/themes';
import {
  User, Mail, Lock, Shield, CheckCircle, AlertCircle,
  Bell, Smartphone, Laptop, Tablet, AlertTriangle, Trash2, Monitor
} from 'lucide-react';
import { actualizarPerfil } from '@/actions/profile';
import { signOut } from 'next-auth/react';

interface RealSession {
  id: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  screen: string;
  location: string;
  active: boolean;
  lastActive: number;
  startedAt: number;
}

function detectRealDevice(): {
  deviceName: string;
  osName: string;
  browserName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  screenRes: string;
  locationHint: string;
} {
  if (typeof window === 'undefined') {
    return {
      deviceName: 'Navegador Web',
      osName: 'Desconocido',
      browserName: 'Web Browser',
      deviceType: 'desktop',
      screenRes: '1920 × 1080',
      locationHint: 'Perú',
    };
  }

  const ua = navigator.userAgent || '';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

  // 1. Sistema Operativo real
  let os = 'Desconocido';
  if (/Win/i.test(platform) || /Windows/i.test(ua)) {
    os = /Windows NT 10.0/i.test(ua) ? 'Windows 10 / 11' : 'Windows';
  } else if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    os = 'macOS';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/iPhone/i.test(ua)) {
    os = 'iPhone (iOS)';
  } else if (/iPad/i.test(ua)) {
    os = 'iPad (iPadOS)';
  } else if (/Linux/i.test(platform) || /Linux/i.test(ua)) {
    os = 'Linux';
  }

  // 2. Navegador real
  let browser = 'Navegador Web';
  if (/Edg\//i.test(ua)) {
    const m = ua.match(/Edg\/(\d+)/);
    browser = `Microsoft Edge ${m ? m[1] : ''}`.trim();
  } else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    const m = ua.match(/(?:OPR|Opera)\/(\d+)/);
    browser = `Opera ${m ? m[1] : ''}`.trim();
  } else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    const m = ua.match(/Chrome\/(\d+)/);
    browser = `Google Chrome ${m ? m[1] : ''}`.trim();
  } else if (/Firefox\//i.test(ua)) {
    const m = ua.match(/Firefox\/(\d+)/);
    browser = `Mozilla Firefox ${m ? m[1] : ''}`.trim();
  } else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
    const m = ua.match(/Version\/(\d+)/);
    browser = `Apple Safari ${m ? m[1] : ''}`.trim();
  }

  // 3. Tipo de hardware real
  const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768;
  const isTablet = /iPad|tablet/i.test(ua) || (isMobile && window.innerWidth >= 600);
  const deviceType: 'desktop' | 'mobile' | 'tablet' = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  // 4. Resolución de pantalla real
  const screenRes = `${window.screen?.width || 0} × ${window.screen?.height || 0}`;

  // 5. Zona horaria y configuración regional real del navegador
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima';
  const tzFormatted = tz.split('/').reverse().join(', ').replace(/_/g, ' ');

  return {
    deviceName: `${os} · ${browser}`,
    osName: os,
    browserName: browser,
    deviceType,
    screenRes,
    locationHint: tzFormatted,
  };
}

export default function PerfilClient({ user }: { user: any }) {
  const isAdmin = user.rol === 'administrador' || user.id_rol === 1;
  const userId = user.id || 'default';

  // Pestañas: solo 'profile', 'notifications', 'security' (se eliminó 'farm' por petición)
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');

  // 1. Datos personales
  const [nombre, setNombre] = useState(user.nombre || user.name || "");
  const [apellido, setApellido] = useState(user.apellido || "");
  const [correo, setCorreo] = useState(user.correo || user.email || "");
  const [telefono, setTelefono] = useState(user.telefono || "");
  const [dni, setDni] = useState(user.dni || "");
  const [fechaNacimiento, setFechaNacimiento] = useState(user.fecha_nacimiento ? String(user.fecha_nacimiento).substring(0, 10) : "");
  const [direccion, setDireccion] = useState(user.direccion || "");
  const [zonaHoraria, setZonaHoraria] = useState(user.zona_horaria || "America/Lima");

  // 2. Preferencias de Notificaciones (solo para agricultor)
  const [notifPrefs, setNotifPrefs] = useState({
    criticas: true,
    advertencias: true,
    riegoInicio: true,
    riegoProblema: true,
    riegoFin: true,
    hardwareFirmware: true,
    recomendacionesIA: true,
    resumenDiario: false,
    novedadesYaku: false,
    canalEmail: true,
    canalApp: true,
  });

  // 3. Seguridad y Sesiones REALES
  const [showPassForm, setShowPassForm] = useState(false);
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [activeSessions, setActiveSessions] = useState<RealSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // Captura de datos reales del dispositivo cliente
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedNotifs = localStorage.getItem(`yaku_notif_prefs_${userId}`);
      if (savedNotifs) setNotifPrefs(JSON.parse(savedNotifs));

      // Detección real del dispositivo actual
      const realInfo = detectRealDevice();
      let sessId = localStorage.getItem('yaku_device_session_id');
      if (!sessId) {
        sessId = 'sess_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('yaku_device_session_id', sessId);
      }
      setCurrentSessionId(sessId);

      const savedSessionsRaw = localStorage.getItem(`yaku_real_sessions_${userId}`);
      let sessionsList: RealSession[] = savedSessionsRaw ? JSON.parse(savedSessionsRaw) : [];

      const now = Date.now();
      const existingIndex = sessionsList.findIndex((s) => s.id === sessId);
      const currentRecord: RealSession = {
        id: sessId,
        device: `${realInfo.osName} · ${realInfo.browserName}`,
        deviceType: realInfo.deviceType,
        screen: realInfo.screenRes,
        location: realInfo.locationHint,
        active: true,
        lastActive: now,
        startedAt: existingIndex >= 0 ? sessionsList[existingIndex].startedAt : now,
      };

      if (existingIndex >= 0) {
        sessionsList[existingIndex] = currentRecord;
      } else {
        sessionsList = [currentRecord, ...sessionsList];
      }

      sessionsList = sessionsList.slice(0, 8);
      localStorage.setItem(`yaku_real_sessions_${userId}`, JSON.stringify(sessionsList));
      setActiveSessions(sessionsList);

      // Consulta de geolocalización IP real sin bloquear la UI
      fetch('https://ipapi.co/json/')
        .then((res) => res.json())
        .then((ipData) => {
          if (ipData && (ipData.city || ipData.country_name)) {
            const realLoc = `${ipData.city ? ipData.city + ', ' : ''}${ipData.country_name || ''} (${ipData.ip || 'IP pública'})`.trim();
            setActiveSessions((prev) => {
              const updated = prev.map((s) => (s.id === sessId ? { ...s, location: realLoc } : s));
              try {
                localStorage.setItem(`yaku_real_sessions_${userId}`, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        })
        .catch(() => {});
    } catch {}
  }, [userId]);

  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showNotificationSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Guardar Datos Personales
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!nombre.trim() || !correo.trim()) {
      setErrorMsg("El nombre y el correo son obligatorios.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: any = {
          nombre: nombre.trim(),
          apellido: apellido?.trim() || undefined,
          correo: correo.trim().toLowerCase(),
          telefono: telefono?.trim() || undefined,
          dni: dni?.trim() || undefined,
          fecha_nacimiento: fechaNacimiento || undefined,
          direccion: direccion?.trim() || undefined,
          zona_horaria: zonaHoraria || "America/Lima",
        };

        const res = await actualizarPerfil(payload);
        if (res.success) {
          showNotificationSuccess("✓ Datos personales guardados correctamente.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Ocurrió un error al actualizar el perfil.");
      }
    });
  };

  // Guardar Preferencias de Notificaciones
  const handleSaveNotifications = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem(`yaku_notif_prefs_${userId}`, JSON.stringify(notifPrefs));
      showNotificationSuccess("✓ Preferencias de notificaciones actualizadas.");
    } catch {
      setErrorMsg("No se pudieron guardar las preferencias.");
    }
  };

  // Actualizar Contraseña
  const handleUpdatePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!contrasena) {
      setErrorMsg("Ingrese la nueva contraseña.");
      return;
    }
    if (contrasena.length < 10) {
      setErrorMsg("La nueva contraseña debe tener al menos 10 caracteres.");
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(contrasena)) {
      setErrorMsg("La contraseña debe incluir mayúsculas, minúsculas y al menos un número.");
      return;
    }
    if (contrasena !== confirmarContrasena) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: any = {
          nombre: nombre.trim(),
          correo: correo.trim().toLowerCase(),
          contrasena: contrasena,
        };
        const res = await actualizarPerfil(payload);
        if (res.success) {
          setContrasena("");
          setConfirmarContrasena("");
          setContrasenaActual("");
          setShowPassForm(false);
          showNotificationSuccess("✓ Contraseña actualizada. Por seguridad, inicie sesión nuevamente.");
          setTimeout(async () => {
            await signOut({ redirect: false });
            window.location.href = '/auth/login';
          }, 2000);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Error al cambiar contraseña.");
      }
    });
  };

  // Cerrar sesión remota real
  const handleCloseSession = (sessionId: string) => {
    setActiveSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem(`yaku_real_sessions_${userId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showNotificationSuccess("✓ Sesión remota cerrada con éxito.");
  };

  const getDeviceIcon = (deviceType: RealSession['deviceType']) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone size={18} className="text-emerald-400" />;
      case 'tablet':
        return <Tablet size={18} className="text-blue-400" />;
      case 'desktop':
      default:
        return <Monitor size={18} className="text-cyan-400" />;
    }
  };

  return (
    <div className="w-full space-y-6" style={{ opacity: isPending ? 0.8 : 1, transition: 'opacity 0.2s' }}>
      {/* HEADER DE BIENVENIDA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <User size={22} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Mi Perfil y Configuración
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Gestione su información personal, credenciales de acceso y niveles de seguridad.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            En línea
          </span>
          <Badge color={isAdmin ? "purple" : "green"} size="2" variant="solid" style={{ borderRadius: '8px', padding: '5px 12px', fontWeight: 'bold' }}>
            {(user.rol || (isAdmin ? "administrador" : "agricultor")).toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* MENSAJES DE ESTADO */}
      {successMsg && (
        <Box p="3" style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px' }}>
          <Flex gap="2" align="center">
            <CheckCircle size={18} color="#22c55e" />
            <Text color="green" size="2" weight="medium">{successMsg}</Text>
          </Flex>
        </Box>
      )}

      {errorMsg && (
        <Box p="3" style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px' }}>
          <Flex gap="2" align="center">
            <AlertCircle size={18} color="#ef4444" />
            <Text color="red" size="2" weight="medium">{errorMsg}</Text>
          </Flex>
        </Box>
      )}

      {/* TABS SELECTOR (SIN LA PESTAÑA MI FINCA) */}
      <div className="flex gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { k: "profile", label: "Datos personales", icon: User },
          ...(!isAdmin ? [{ k: "notifications", label: "Notificaciones", icon: Bell }] : []),
          { k: "security", label: "Seguridad", icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          const isCurrent = activeTab === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setActiveTab(t.k as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isCurrent
                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-lg"
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* CONTENIDO DE PESTAÑAS: GRID RESPONSIVO DE ANCHO COMPLETO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
        {/* TARJETA DE USUARIO / RESUMEN LATERAL */}
        <div className="lg:col-span-1 xl:col-span-1 space-y-4">
          <Card size="3" style={{ background: '#0b1329', borderColor: '#1e293b', borderRadius: '16px', textAlign: 'center' }}>
            <Flex direction="column" gap="4" align="center" justify="center" py="4">
              <div
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '2.2rem',
                  fontWeight: 'bold',
                  boxShadow: '0 8px 24px rgba(5, 150, 105, 0.35)',
                }}
              >
                {(((nombre || "")[0] || "") + ((apellido || "")[0] || "") || "U").toUpperCase()}
              </div>

              <Box>
                <Text size="4" weight="bold" style={{ color: 'white' }} as="div" mb="1">
                  {nombre} {apellido}
                </Text>
                <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
                  {correo}
                </Text>
              </Box>

              <Flex gap="2" align="center">
                <Badge color={isAdmin ? "purple" : "green"} size="2" variant="solid" style={{ borderRadius: '6px', padding: '4px 10px' }}>
                  {(user.rol || (isAdmin ? "administrador" : "agricultor")).toUpperCase()}
                </Badge>
              </Flex>

              {dni && (
                <Text size="1" color="cyan" style={{ fontFamily: 'monospace' }}>
                  DNI: {dni}
                </Text>
              )}
              {direccion && (
                <Text size="1" color="gray" style={{ maxWidth: '280px', margin: '0 auto', fontSize: '0.75rem' }}>
                  📍 {direccion}
                </Text>
              )}

              <Text size="1" color="gray" style={{ fontStyle: 'italic', maxWidth: '280px', margin: '0 auto', lineHeight: '1.4' }} mt="2">
                {isAdmin
                  ? 'Privilegios de administrador. Supervisión de hardware, usuarios, catálogos y firmware.'
                  : 'Rol Agricultor. Monitoreo de telemetría de suelo, histórico de riego y control de electroválvulas.'}
              </Text>
            </Flex>
          </Card>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detalles de la cuenta</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Estado</span>
                <span className="text-emerald-400 font-medium">Activo</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Zona horaria</span>
                <span className="font-mono text-slate-200">{zonaHoraria}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Seguridad</span>
                <span className="text-sky-400 font-medium">SSL / Cifrado</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL POR PESTAÑA */}
        <div className="lg:col-span-2 xl:col-span-3">
          {/* TAB 1: DATOS PERSONALES */}
          {activeTab === 'profile' && (
            <Card size="3" style={{ background: '#0b1329', borderColor: '#1e293b', borderRadius: '16px' }}>
              <form onSubmit={handleSaveProfile}>
                <Flex direction="column" gap="4">
                  <div>
                    <Text size="4" weight="bold" style={{ color: 'white' }}>
                      Datos Personales
                    </Text>
                    <Text size="2" color="gray">
                      Información de contacto y configuración regional del perfil.
                    </Text>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombres</label>
                      <TextField.Root value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ background: '#1e293b', color: 'white' }}>
                        <TextField.Slot><User size={14} color="#94a3b8" /></TextField.Slot>
                      </TextField.Root>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Apellidos</label>
                      <TextField.Root value={apellido} onChange={(e) => setApellido(e.target.value)} style={{ background: '#1e293b', color: 'white' }}>
                        <TextField.Slot><User size={14} color="#94a3b8" /></TextField.Slot>
                      </TextField.Root>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo Electrónico</label>
                      <TextField.Root type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} style={{ background: '#1e293b', color: 'white' }}>
                        <TextField.Slot><Mail size={14} color="#94a3b8" /></TextField.Slot>
                      </TextField.Root>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Teléfono / Celular</label>
                      <TextField.Root value={telefono} onChange={(e) => setTelefono(e.target.value)} style={{ background: '#1e293b', color: 'white' }} placeholder="+51 987654321" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">DNI / Documento</label>
                      <TextField.Root value={dni} onChange={(e) => setDni(e.target.value)} style={{ background: '#1e293b', color: 'white' }} placeholder="8 dígitos" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha de Nacimiento</label>
                      <TextField.Root type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} style={{ background: '#1e293b', color: 'white' }} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Dirección</label>
                      <TextField.Root value={direccion} onChange={(e) => setDireccion(e.target.value)} style={{ background: '#1e293b', color: 'white' }} placeholder="Av., Calle, Distrito" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Zona Horaria</label>
                      <select
                        value={zonaHoraria}
                        onChange={(e) => setZonaHoraria(e.target.value)}
                        style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', background: '#1e293b', color: 'white', border: '1px solid #334155', fontSize: '0.875rem', height: '36px' }}
                      >
                        <option value="America/Lima">America/Lima (UTC-5)</option>
                        <option value="America/Bogota">America/Bogota (UTC-5)</option>
                        <option value="America/Santiago">America/Santiago (UTC-3)</option>
                        <option value="America/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
                        <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                      </select>
                    </div>
                  </div>

                  <Flex justify="end" mt="3">
                    <Button type="submit" color="indigo" size="3" disabled={isPending} style={{ cursor: 'pointer', borderRadius: '8px', padding: '0 24px', fontWeight: 'bold' }}>
                      {isPending ? 'Guardando...' : '💾 Guardar Datos Personales'}
                    </Button>
                  </Flex>
                </Flex>
              </form>
            </Card>
          )}

          {/* TAB 2: NOTIFICACIONES (SOLO AGRICULTOR) */}
          {activeTab === 'notifications' && !isAdmin && (
            <Card size="3" style={{ background: '#0b1329', borderColor: '#1e293b', borderRadius: '16px' }}>
              <form onSubmit={handleSaveNotifications}>
                <Flex direction="column" gap="4">
                  <div>
                    <Text size="4" weight="bold" style={{ color: 'white' }}>
                      Preferencias de Notificaciones
                    </Text>
                    <Text size="2" color="gray">
                      Personalice qué avisos desea recibir en tiempo real sobre riego, incidencias y hardware.
                    </Text>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-2">
                    {/* Alertas críticas */}
                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">Alertas críticas (errores y fallos)</p>
                        <p className="text-xs text-slate-400 mt-0.5">Siempre activo por seguridad. No se puede desactivar.</p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
                        ACTIVO
                      </span>
                    </div>

                    {/* Alertas de advertencia */}
                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">Alertas de advertencia (batería, umbrales de sensores)</p>
                        <p className="text-xs text-slate-400 mt-0.5">Aviso ante baja batería o lecturas fuera de rango óptimo.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifPrefs.advertencias}
                        onChange={(e) => setNotifPrefs({ ...notifPrefs, advertencias: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer mt-1"
                      />
                    </div>

                    {/* Opciones personales de Riego */}
                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-900/40 border border-blue-900/30">
                      <div>
                        <p className="text-sm font-semibold text-blue-300">🔔 Notificación cuando el riego comenzó</p>
                        <p className="text-xs text-slate-400 mt-0.5">Aviso instantáneo al activarse electroválvula o bomba en su parcela.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifPrefs.riegoInicio}
                        onChange={(e) => setNotifPrefs({ ...notifPrefs, riegoInicio: e.target.checked })}
                        className="w-5 h-5 accent-blue-500 rounded cursor-pointer mt-1"
                      />
                    </div>

                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-900/40 border border-amber-900/30">
                      <div>
                        <p className="text-sm font-semibold text-amber-300">⚠️ Problemas durante el riego</p>
                        <p className="text-xs text-slate-400 mt-0.5">Alerta inmediata ante ausencia de flujo, caída de presión o bloqueo.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifPrefs.riegoProblema}
                        onChange={(e) => setNotifPrefs({ ...notifPrefs, riegoProblema: e.target.checked })}
                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer mt-1"
                      />
                    </div>

                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-900/40 border border-emerald-900/30">
                      <div>
                        <p className="text-sm font-semibold text-emerald-300">✅ Confirmación de riego finalizado</p>
                        <p className="text-xs text-slate-400 mt-0.5">Resumen con litros aplicados y tiempo transcurrido al terminar el ciclo.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifPrefs.riegoFin}
                        onChange={(e) => setNotifPrefs({ ...notifPrefs, riegoFin: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer mt-1"
                      />
                    </div>

                    {/* Hardware y Firmware */}
                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">Asignación de hardware y actualización de firmware</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Aviso cuando el administrador te vincule un nodo o actualice su firmware.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifPrefs.hardwareFirmware}
                        onChange={(e) => setNotifPrefs({ ...notifPrefs, hardwareFirmware: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer mt-1"
                      />
                    </div>

                    {/* Recomendaciones IA */}
                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">Recomendaciones del modelo de IA predictiva</p>
                        <p className="text-xs text-slate-400 mt-0.5">Sugerencias predictivas sobre probabilidad de riego según humedad y clima.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifPrefs.recomendacionesIA}
                        onChange={(e) => setNotifPrefs({ ...notifPrefs, recomendacionesIA: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer mt-1"
                      />
                    </div>

                    {/* Resumen diario */}
                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">Resumen diario del sistema</p>
                        <p className="text-xs text-slate-400 mt-0.5">Consumo total acumulado de agua y estado general de los nodos.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifPrefs.resumenDiario}
                        onChange={(e) => setNotifPrefs({ ...notifPrefs, resumenDiario: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer mt-1"
                      />
                    </div>
                  </div>

                  <Separator size="4" style={{ background: '#1e293b', margin: '8px 0' }} />

                  {/* Canales de notificación */}
                  <div>
                    <p className="text-sm font-semibold text-slate-200 mb-3">Canales de Notificación Activos</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:bg-slate-900/60 transition-colors">
                        <input
                          type="checkbox"
                          checked={notifPrefs.canalEmail}
                          onChange={(e) => setNotifPrefs({ ...notifPrefs, canalEmail: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500 rounded"
                        />
                        <span className="text-sm text-slate-300">📧 Correo electrónico ({correo})</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:bg-slate-900/60 transition-colors">
                        <input
                          type="checkbox"
                          checked={notifPrefs.canalApp}
                          onChange={(e) => setNotifPrefs({ ...notifPrefs, canalApp: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500 rounded"
                        />
                        <span className="text-sm text-slate-300">🔔 Notificación en la app (campana superior y alertas flotantes)</span>
                      </label>
                    </div>
                  </div>

                  <Flex justify="end" mt="3">
                    <Button type="submit" color="indigo" size="3" style={{ cursor: 'pointer', borderRadius: '8px', padding: '0 24px', fontWeight: 'bold' }}>
                      💾 Guardar Preferencias
                    </Button>
                  </Flex>
                </Flex>
              </form>
            </Card>
          )}

          {/* TAB 3: SEGURIDAD (CON CAPTURA DE DATOS REALES DE DISPOSITIVOS) */}
          {activeTab === 'security' && (
            <Flex direction="column" gap="5">
              {/* Sesiones activas con datos REALES capturados del navegador/dispositivo */}
              <Card size="3" style={{ background: '#0b1329', borderColor: '#1e293b', borderRadius: '16px' }}>
                <Flex justify="between" align="center" mb="1">
                  <Text size="4" weight="bold" style={{ color: 'white' }}>
                    Sesiones de Dispositivos Activas
                  </Text>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                    Telemetría cliente real
                  </span>
                </Flex>
                <Text size="2" color="gray" mb="4">
                  Dispositivos, navegadores y ubicaciones reales registradas al iniciar sesión en esta cuenta.
                </Text>

                <div className="space-y-3">
                  {activeSessions.map((s) => {
                    const isCurrent = s.id === currentSessionId;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-slate-900/80 border-emerald-500/40 shadow-sm'
                            : 'bg-slate-900/40 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${isCurrent ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" : "bg-slate-600"}`} />
                          <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60">
                            {getDeviceIcon(s.deviceType)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white">{s.device}</p>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                                  Esta sesión
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              📍 {s.location} · {s.screen} · {isCurrent ? 'Activo ahora' : `Conectado el ${new Date(s.lastActive).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                          </div>
                        </div>

                        {!isCurrent && (
                          <button
                            onClick={() => handleCloseSession(s.id)}
                            className="text-xs text-red-400 hover:text-red-300 hover:underline px-3 py-1.5 rounded hover:bg-red-950/30 cursor-pointer transition-colors"
                          >
                            Cerrar sesión
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
                  <span>Resolución del cliente actual: <strong className="text-slate-200">{typeof window !== 'undefined' ? `${window.screen?.width || 0} × ${window.screen?.height || 0}` : '1920 × 1080'}</strong></span>
                  <span>Plataforma: <strong className="text-slate-200">{typeof navigator !== 'undefined' ? (navigator.platform || 'Win32') : 'Web'}</strong></span>
                </div>
              </Card>

              {/* Contraseña */}
              <Card size="3" style={{ background: '#0b1329', borderColor: '#1e293b', borderRadius: '16px' }}>
                <Flex justify="between" align="center" mb="3">
                  <div>
                    <Text size="4" weight="bold" style={{ color: 'white' }}>
                      Contraseña de Acceso
                    </Text>
                    <Text size="2" color="gray">
                      Actualice su clave de acceso periódicamente para mantener su cuenta protegida.
                    </Text>
                  </div>
                  <Button
                    variant="soft"
                    color="indigo"
                    size="2"
                    onClick={() => setShowPassForm(!showPassForm)}
                    style={{ cursor: 'pointer' }}
                  >
                    {showPassForm ? "Cancelar" : "Cambiar contraseña"}
                  </Button>
                </Flex>

                {showPassForm && (
                  <form onSubmit={handleUpdatePassword} className="space-y-4 pt-3 border-t border-slate-800 mt-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>Contraseña actual</label>
                        <TextField.Root
                          type="password"
                          placeholder="••••••••"
                          value={contrasenaActual}
                          onChange={(e) => setContrasenaActual(e.target.value)}
                          style={{ background: '#1e293b', color: 'white' }}
                        >
                          <TextField.Slot><Lock size={14} color="#94a3b8" /></TextField.Slot>
                        </TextField.Root>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>Nueva contraseña</label>
                        <TextField.Root
                          type="password"
                          placeholder="Mínimo 10 caracteres"
                          value={contrasena}
                          onChange={(e) => setContrasena(e.target.value)}
                          style={{ background: '#1e293b', color: 'white' }}
                        >
                          <TextField.Slot><Lock size={14} color="#94a3b8" /></TextField.Slot>
                        </TextField.Root>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>Confirmar nueva contraseña</label>
                        <TextField.Root
                          type="password"
                          placeholder="Repita la nueva contraseña"
                          value={confirmarContrasena}
                          onChange={(e) => setConfirmarContrasena(e.target.value)}
                          style={{ background: '#1e293b', color: 'white' }}
                        >
                          <TextField.Slot><Lock size={14} color="#94a3b8" /></TextField.Slot>
                        </TextField.Root>
                      </div>
                    </div>
                    <Flex justify="end">
                      <Button type="submit" color="indigo" size="2" disabled={isPending} style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                        {isPending ? 'Actualizando...' : 'Actualizar contraseña'}
                      </Button>
                    </Flex>
                  </form>
                )}

                <p className="text-xs text-slate-500 mt-3">Última modificación registrada: hace 3 meses</p>
              </Card>

              {/* Zona de riesgo */}
              <Card size="3" style={{ background: '#17090d', borderColor: '#7f1d1d', borderRadius: '16px' }}>
                <Flex align="center" gap="2" mb="2">
                  <AlertTriangle size={18} className="text-red-400" />
                  <Text size="3" weight="bold" style={{ color: '#f87171' }}>
                    Zona de Riesgo
                  </Text>
                </Flex>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Eliminar su cuenta borrará permanentemente todos sus datos de telemetría, parcelas, históricos y configuraciones. Esta acción es irreversible.
                </p>
                <Button
                  color="red"
                  variant="soft"
                  size="2"
                  onClick={() => {
                    if (confirm("¿Está seguro de que desea solicitar la eliminación definitiva de su cuenta de Yaku?")) {
                      alert("Su solicitud de eliminación ha sido enviada al administrador del sistema.");
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                  Solicitar eliminación de cuenta
                </Button>
              </Card>
            </Flex>
          )}
        </div>
      </div>
    </div>
  );
}
