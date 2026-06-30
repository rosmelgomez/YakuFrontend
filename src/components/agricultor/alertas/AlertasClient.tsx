// src/components/agricultor/alertas/AlertasClient.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text, Flex, Card, Button, Grid, Badge, Switch, Table } from '@radix-ui/themes';
import {
  guardarNotifConfig,
  getVapidPublicKey,
  registrarSuscripcionPush,
  obtenerDatosAlertaPorCultivo,
  obtenerEstadoSuscripcionPush,
  obtenerNotifConfig,
} from '@/actions/alertas';
import SearchableSelect from '@/components/ui/SearchableSelect';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const categorias = [
  { titulo: "Humedad de suelo", bajoId: 1, altoId: 2 },
  { titulo: "Temperatura de suelo", bajoId: 3, altoId: 4 },
  { titulo: "Temperatura ambiente", bajoId: 5, altoId: 6 },
  { titulo: "Humedad ambiente", bajoId: 7, altoId: 8 },
  { titulo: "Nivel de tanque", bajoId: 9, altoId: 10 }
];

export default function AlertasClient({ 
  userId, 
  cultivos, 
  initialData, 
  initialCultivo, 
  initialNotifConfig, 
  initialHasNotifConfig = false, 
  initialPushRegistered = false 
}: any) {
  const router = useRouter();
  const [selectedCultivoId, setSelectedCultivoId] = useState(initialCultivo);
  const [alertasActivas, setAlertasActivas] = useState(initialData.alertasActivas || []);
  const [historial, setHistorial] = useState(initialData.historial || []);
  const [isLoadingCropData, setIsLoadingCropData] = useState(false);

  const [notifConfigs, setNotifConfigs] = useState(initialNotifConfig || []);
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  // Edit/Lock Mode States
  const [isEditingPreferencias, setIsEditingPreferencias] = useState(false);
  const [originalNotifConfigs, setOriginalNotifConfigs] = useState(initialNotifConfig || []);
  const [hasConfigState, setHasConfigState] = useState(initialHasNotifConfig);

  // Pagination State for Alerts
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sync state if props change (e.g. cultivation switch from parent page)
  useEffect(() => {
    setAlertasActivas(initialData.alertasActivas || []);
    setHistorial(initialData.historial || []);
    setSelectedCultivoId(initialCultivo);
    setCurrentPage(1);
  }, [initialData, initialCultivo]);

  const [isLoadingNotifConfig, setIsLoadingNotifConfig] = useState(
    initialNotifConfig.length === 0
  );

  useEffect(() => {
    let cancelled = false;
    if (initialNotifConfig && initialNotifConfig.length > 0) {
      setNotifConfigs(initialNotifConfig);
      setOriginalNotifConfigs(initialNotifConfig);
      setIsLoadingNotifConfig(false);
      setIsEditingPreferencias(false);
      return;
    }

    setIsLoadingNotifConfig(true);
    obtenerNotifConfig()
      .then((res: any) => {
        if (!cancelled && res.success && res.data) {
          setNotifConfigs(res.data.configs || []);
          setOriginalNotifConfigs(res.data.configs || []);
          setHasConfigState(res.data.has_config || false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNotifConfig(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialNotifConfig]);

  useEffect(() => {
    if (initialNotifConfig && initialNotifConfig.length > 0) {
      setHasConfigState(initialHasNotifConfig);
    }
  }, [initialHasNotifConfig, initialNotifConfig]);

  // Web Push Status States
  const [pushStatus, setPushStatus] = useState<'checking' | 'not-supported' | 'default' | 'granted' | 'denied'>('checking');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [pushRegistered, setPushRegistered] = useState(Boolean(initialPushRegistered));
  const [hasLoadedPushRegistration, setHasLoadedPushRegistration] = useState(Boolean(initialPushRegistered));
  const autoPushAttempted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    obtenerEstadoSuscripcionPush().then((res) => {
      if (!cancelled && res.success) {
        setPushRegistered(Boolean(res.registered));
      }
    }).finally(() => {
      if (!cancelled) setHasLoadedPushRegistration(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestPush = async () => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPushStatus('not-supported');
      return;
    }
    
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      
      if (permission === 'granted' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const resKey = await getVapidPublicKey();
        if (resKey.success && resKey.publicKey) {
          const applicationServerKey = urlBase64ToUint8Array(resKey.publicKey);
          const existingSubscription = await reg.pushManager.getSubscription();
          const subscription = existingSubscription || await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          });
          const registrationResult = await registrarSuscripcionPush(subscription.toJSON());
          if (!registrationResult.success) {
            throw new Error(registrationResult.error || 'No se pudo registrar la suscripción');
          }
          setPushRegistered(true);
        }
      }
    } catch {
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsSecure(window.isSecureContext);

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushStatus('not-supported');
      return;
    }

    const currentPermission = Notification.permission;
    setPushStatus(currentPermission as any);
  }, []);

  useEffect(() => {
    if (
      pushRegistered ||
      !hasLoadedPushRegistration ||
      autoPushAttempted.current ||
      !isSecure ||
      pushStatus === 'checking' ||
      pushStatus === 'not-supported' ||
      pushStatus === 'denied'
    ) {
      return;
    }

    autoPushAttempted.current = true;
    handleRequestPush();
  }, [pushRegistered, hasLoadedPushRegistration, isSecure, pushStatus]);

  const handleTestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification("Yaku - Alerta de Prueba", {
        body: "¡Felicidades! Las notificaciones en tu pantalla están configuradas y funcionando con éxito.",
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
      } as any);
    } catch (err) {
      new Notification("Yaku - Alerta de Prueba", {
        body: "¡Felicidades! Las notificaciones están activas en tu navegador.",
        icon: '/favicon.ico'
      });
    }
  };



  const handleNotifToggle = (id_tipo_alerta: number, channel: 'canal_email' | 'canal_dashboard') => {
    setNotifConfigs(notifConfigs.map((c: any) => 
      c.id_tipo_alerta === id_tipo_alerta 
        ? { ...c, [channel]: !c[channel] } 
        : c
    ));
  };

  const handleReminderChange = (id_tipo_alerta: number, value: number) => {
    const minutes = Math.max(5, Math.min(1440, value || 5));
    setNotifConfigs(notifConfigs.map((config: any) =>
      config.id_tipo_alerta === id_tipo_alerta
        ? { ...config, recordatorio_minutos: minutes }
        : config
    ));
  };

  const handleSaveNotif = async () => {
    setIsSavingNotif(true);
    try {
      const updates = notifConfigs.map((c: any) => ({
        id_tipo_alerta: c.id_tipo_alerta,
        canal_email: c.canal_email,
        canal_dashboard: c.canal_dashboard,
        recordatorio_minutos: c.recordatorio_minutos || 30
      }));
      await guardarNotifConfig(updates);
      setOriginalNotifConfigs(notifConfigs);
      setIsEditingPreferencias(false);
      setHasConfigState(true);
    } catch {
    } finally {
      setIsSavingNotif(false);
    }
  };

  const handleCancelPreferencias = () => {
    setNotifConfigs(originalNotifConfigs);
    setIsEditingPreferencias(false);
  };

  const handleCultivoChange = async (newIdStr: string) => {
    const newId = parseInt(newIdStr, 10);
    if (isNaN(newId)) return;
    
    setIsLoadingCropData(true);
    setSelectedCultivoId(newId);
    setCurrentPage(1);
    
    try {
      const res = await obtenerDatosAlertaPorCultivo(newId);
      if (res.success && res.data) {
        setAlertasActivas(res.data.alertasActivas || []);
        setHistorial(res.data.historial || []);
      } else {
        alert(res.error || "Error al cargar los datos del cultivo.");
      }
    } catch (err: any) {
      alert("Error al conectar con el servidor.");
    } finally {
      setIsLoadingCropData(false);
    }
  };

  return (
    <Box style={{ opacity: isLoadingCropData ? 0.6 : 1, transition: 'opacity 0.2s ease-in-out' }}>
      <Flex justify="between" mb="6">
        <Text size="6" weight="bold" color="indigo">Alertas</Text>
        <SearchableSelect
          value={selectedCultivoId.toString()}
          onValueChange={handleCultivoChange}
          placeholder="Seleccionar cultivo"
          searchPlaceholder="Buscar cultivo..."
          style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)', width: 240 }}
          options={cultivos.map((c: any) => ({ value: c.id.toString(), label: c.nombre_planta }))}
          disabled={isLoadingCropData}
        />
      </Flex>


      <style dangerouslySetInnerHTML={{
        __html: `
          .top-cards-container {
            margin-bottom: 20px;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(99, 102, 241, 0.2);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(99, 102, 241, 0.4);
          }
          .threshold-input::-webkit-outer-spin-button,
          .threshold-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .threshold-input {
            -moz-appearance: textfield;
          }
        `
      }} />

      <Card size="2" mb="4" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)' }}>
        <Flex justify="between" align={{ initial: 'start', sm: 'center' }} gap="3" wrap="wrap">
          <Box>
            <Text size="3" weight="bold" color="indigo" as="div">Notificaciones del navegador</Text>
            <Text size="2" color="gray" as="div">
              {pushStatus === 'granted' && 'Activadas y sincronizadas con Yaku.'}
              {pushStatus === 'default' && 'Actívalas para recibir alertas aunque el panel no esté abierto.'}
              {pushStatus === 'denied' && 'Bloqueadas por el navegador. Debes habilitarlas desde los permisos del sitio.'}
              {pushStatus === 'not-supported' && 'Este navegador no admite notificaciones Push.'}
              {pushStatus === 'checking' && 'Comprobando compatibilidad…'}
              {!isSecure && ' Se requiere HTTPS o localhost.'}
            </Text>
          </Box>
          <Flex gap="2">
            {pushStatus === 'default' && isSecure && (
              <Button onClick={handleRequestPush} disabled={isSubscribing}>
                {isSubscribing ? 'Activando…' : 'Activar notificaciones'}
              </Button>
            )}
            {pushStatus === 'granted' && (
              <Button variant="soft" onClick={handleTestNotification}>Probar notificación</Button>
            )}
          </Flex>
        </Flex>
      </Card>

      <div className="top-cards-container">
        {/* Card 2: Preferencias de Canales */}
        <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text size="4" weight="bold" color="indigo" mb="5" as="div">Preferencias de canales</Text>
          <Flex direction="column" gap="4" style={{ flexGrow: 1 }}>
            
            {/* Lista agrupada en pequeños cards en un grid de 2 columnas */}
            <Box style={{ flexGrow: 1, paddingRight: '6px' }}>
              {isLoadingNotifConfig ? (
                <Flex direction="column" align="center" justify="center" p="5" style={{ minHeight: '220px' }}>
                  <Text size="2" color="gray">Cargando preferencias...</Text>
                </Flex>
              ) : !hasConfigState && !isEditingPreferencias ? (
                <Flex 
                  direction="column" 
                  align="center" 
                  justify="center" 
                  p="5" 
                  style={{ 
                    background: 'rgba(30, 41, 59, 0.2)', 
                    border: '1px dashed var(--border-mockup)', 
                    borderRadius: '8px',
                    minHeight: '220px',
                    textAlign: 'center'
                  }}
                >
                  <Text size="5" mb="2" style={{ display: 'block' }}>🔔</Text>
                  <Text size="3" weight="bold" color="indigo" mb="2" as="div">
                    Realiza la configuración
                  </Text>
                  <Text size="2" color="gray" style={{ maxWidth: '320px' }}>
                    No tienes preferencias de canales guardadas aún. Presiona "Actualizar" para activar correo o panel de alertas.
                  </Text>
                </Flex>
              ) : (
                <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="3" mb="3">
                  {categorias.map((cat) => {
                    const bajo = notifConfigs.find((c: any) => c.id_tipo_alerta === cat.bajoId);
                    const alto = notifConfigs.find((c: any) => c.id_tipo_alerta === cat.altoId);
                    const standardOptions = [5, 15, 30, 60, 240, 720, 1440];
                    
                    return (
                      <Card key={cat.titulo} size="1" style={{ background: 'rgba(30, 41, 59, 0.45)', borderColor: 'var(--border-mockup)', padding: '10px 12px', borderRadius: '8px' }}>
                        <Text size="2" weight="bold" color="indigo" mb="1" as="div">{cat.titulo}</Text>
                        
                        {/* Límite Bajo */}
                        {bajo && (
                          <Box mb="2" pb="1.5" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <Text size="1" color="gray" weight="bold" mb="1" as="div">Si baja del mínimo (Bajo)</Text>
                            {isEditingPreferencias ? (
                              <>
                                <Flex justify="between" align="center">
                                  <Flex align="center" gap="2">
                                    <Text size="1" color="gray">Correo</Text>
                                    <Switch 
                                      checked={bajo.canal_email} 
                                      onCheckedChange={() => handleNotifToggle(cat.bajoId, 'canal_email')}
                                      size="1"
                                      color="indigo"
                                      style={{ 
                                        pointerEvents: isEditingPreferencias ? 'auto' : 'none',
                                        cursor: isEditingPreferencias ? 'pointer' : 'default' 
                                      }}
                                    />
                                  </Flex>
                                  <Flex align="center" gap="2">
                                    <Text size="1" color="gray">Panel Yaku</Text>
                                    <Switch 
                                      checked={bajo.canal_dashboard} 
                                      onCheckedChange={() => handleNotifToggle(cat.bajoId, 'canal_dashboard')}
                                      size="1"
                                      color="indigo"
                                      style={{ 
                                        pointerEvents: isEditingPreferencias ? 'auto' : 'none',
                                        cursor: isEditingPreferencias ? 'pointer' : 'default' 
                                      }}
                                    />
                                  </Flex>
                                </Flex>
                                <Flex justify="between" align="center" mt="2" gap="1">
                                  <Text size="1" color="gray">Recordar cada</Text>
                                  <select
                                    aria-label={`Intervalo bajo de ${cat.titulo}`}
                                    value={bajo.recordatorio_minutos || 30}
                                    disabled={!isEditingPreferencias}
                                    onChange={(event) => handleReminderChange(cat.bajoId, Number(event.target.value))}
                                    style={{
                                      background: 'rgba(30, 41, 59, 0.9)',
                                      border: '1px solid var(--border-mockup)',
                                      borderRadius: '4px',
                                      color: 'white',
                                      padding: '3px 6px',
                                      fontSize: '12px',
                                      cursor: isEditingPreferencias ? 'pointer' : 'not-allowed',
                                      outline: 'none',
                                      opacity: isEditingPreferencias ? 1 : 0.7
                                    }}
                                  >
                                    {!standardOptions.includes(bajo.recordatorio_minutos || 30) && (
                                      <option value={bajo.recordatorio_minutos || 30}>
                                        {(bajo.recordatorio_minutos || 30)} min (personalizado)
                                      </option>
                                    )}
                                    <option value={5}>5 min</option>
                                    <option value={15}>15 min</option>
                                    <option value={30}>30 min</option>
                                    <option value={60}>1 hora</option>
                                    <option value={240}>4 horas</option>
                                    <option value={720}>12 horas</option>
                                    <option value={1440}>Diario (24h)</option>
                                  </select>
                                </Flex>
                              </>
                            ) : (
                              <>
                                <Flex gap="2" mt="1.5" mb="1.5" wrap="wrap">
                                  {bajo.canal_email && <Badge color="green">Correo</Badge>}
                                  {bajo.canal_dashboard && <Badge color="indigo">Panel Yaku</Badge>}
                                  {!bajo.canal_email && !bajo.canal_dashboard && <Badge color="red">Desactivado</Badge>}
                                </Flex>
                                {(bajo.canal_email || bajo.canal_dashboard) && (
                                  <Text size="1" color="gray" as="div">
                                    Recordatorio: <span style={{ color: 'var(--indigo-11)', fontWeight: 'bold' }}>
                                      {bajo.recordatorio_minutos === 60 ? '1 hora' : 
                                       bajo.recordatorio_minutos === 240 ? '4 horas' :
                                       bajo.recordatorio_minutos === 720 ? '12 horas' :
                                       bajo.recordatorio_minutos === 1440 ? 'Diario (24h)' : 
                                       `${bajo.recordatorio_minutos || 30} min`}
                                    </span>
                                  </Text>
                                )}
                              </>
                            )}
                          </Box>
                        )}

                        {/* Límite Alto */}
                        {alto && (
                          <Box>
                            <Text size="1" color="gray" weight="bold" mb="1" as="div">Si supera el máximo (Alto)</Text>
                            {isEditingPreferencias ? (
                              <>
                                <Flex justify="between" align="center">
                                  <Flex align="center" gap="2">
                                    <Text size="1" color="gray">Correo</Text>
                                    <Switch 
                                      checked={alto.canal_email} 
                                      onCheckedChange={() => handleNotifToggle(cat.altoId, 'canal_email')}
                                      size="1"
                                      color="indigo"
                                      style={{ 
                                        pointerEvents: isEditingPreferencias ? 'auto' : 'none',
                                        cursor: isEditingPreferencias ? 'pointer' : 'default' 
                                      }}
                                    />
                                  </Flex>
                                  <Flex align="center" gap="2">
                                    <Text size="1" color="gray">Panel Yaku</Text>
                                    <Switch 
                                      checked={alto.canal_dashboard} 
                                      onCheckedChange={() => handleNotifToggle(cat.altoId, 'canal_dashboard')}
                                      size="1"
                                      color="indigo"
                                      style={{ 
                                        pointerEvents: isEditingPreferencias ? 'auto' : 'none',
                                        cursor: isEditingPreferencias ? 'pointer' : 'default' 
                                      }}
                                    />
                                  </Flex>
                                </Flex>
                                <Flex justify="between" align="center" mt="2" gap="1">
                                  <Text size="1" color="gray">Recordar cada</Text>
                                  <select
                                    aria-label={`Intervalo alto de ${cat.titulo}`}
                                    value={alto.recordatorio_minutos || 30}
                                    disabled={!isEditingPreferencias}
                                    onChange={(event) => handleReminderChange(cat.altoId, Number(event.target.value))}
                                    style={{
                                      background: 'rgba(30, 41, 59, 0.9)',
                                      border: '1px solid var(--border-mockup)',
                                      borderRadius: '4px',
                                      color: 'white',
                                      padding: '3px 6px',
                                      fontSize: '12px',
                                      cursor: isEditingPreferencias ? 'pointer' : 'not-allowed',
                                      outline: 'none',
                                      opacity: isEditingPreferencias ? 1 : 0.7
                                    }}
                                  >
                                    {!standardOptions.includes(alto.recordatorio_minutos || 30) && (
                                      <option value={alto.recordatorio_minutos || 30}>
                                        {(alto.recordatorio_minutos || 30)} min (personalizado)
                                      </option>
                                    )}
                                    <option value={5}>5 min</option>
                                    <option value={15}>15 min</option>
                                    <option value={30}>30 min</option>
                                    <option value={60}>1 hora</option>
                                    <option value={240}>4 horas</option>
                                    <option value={720}>12 horas</option>
                                    <option value={1440}>Diario (24h)</option>
                                  </select>
                                </Flex>
                              </>
                            ) : (
                              <>
                                <Flex gap="2" mt="1.5" mb="1.5" wrap="wrap">
                                  {alto.canal_email && <Badge color="green">Correo</Badge>}
                                  {alto.canal_dashboard && <Badge color="indigo">Panel Yaku</Badge>}
                                  {!alto.canal_email && !alto.canal_dashboard && <Badge color="red">Desactivado</Badge>}
                                </Flex>
                                {(alto.canal_email || alto.canal_dashboard) && (
                                  <Text size="1" color="gray" as="div">
                                    Recordatorio: <span style={{ color: 'var(--indigo-11)', fontWeight: 'bold' }}>
                                      {alto.recordatorio_minutos === 60 ? '1 hora' : 
                                       alto.recordatorio_minutos === 240 ? '4 horas' :
                                       alto.recordatorio_minutos === 720 ? '12 horas' :
                                       alto.recordatorio_minutos === 1440 ? 'Diario (24h)' : 
                                       `${alto.recordatorio_minutos || 30} min`}
                                    </span>
                                  </Text>
                                )}
                              </>
                            )}
                          </Box>
                        )}
                      </Card>
                    );
                  })}
                </Grid>
              )}
            </Box>

            {!isEditingPreferencias ? (
              <Button 
                onClick={() => setIsEditingPreferencias(true)} 
                style={{ marginTop: 'auto', cursor: 'pointer' }}
              >
                Actualizar
              </Button>
            ) : (
              <Flex gap="3" style={{ marginTop: 'auto' }}>
                <Button 
                  onClick={handleSaveNotif} 
                  disabled={isSavingNotif} 
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  {isSavingNotif ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button 
                  onClick={handleCancelPreferencias} 
                  variant="soft" 
                  color="gray" 
                  disabled={isSavingNotif} 
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  Cancelar
                </Button>
              </Flex>
            )}
          </Flex>
        </Card>
      </div>

      {/* Card 3: Historial y Alertas Activas (a lo ancho completo debajo) */}
      <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)' }}>
        <Text size="4" weight="bold" color="indigo" mb="5" as="div">Historial y estado de alertas</Text>
        {(!alertasActivas || alertasActivas.length === 0) && (!historial || historial.length === 0) ? (
          <Text size="2" color="gray">No hay registro de alertas activas ni resueltas.</Text>
        ) : (
          (() => {
            const combinedAlerts = [
              ...(alertasActivas || []).map((a: any) => ({ ...a, itemType: 'active' })),
              ...(historial || []).map((h: any) => ({ ...h, itemType: 'resolved' }))
            ];
            const totalItems = combinedAlerts.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const indexOfLastItem = currentPage * itemsPerPage;
            const indexOfFirstItem = indexOfLastItem - itemsPerPage;
            const currentItems = combinedAlerts.slice(indexOfFirstItem, indexOfLastItem);

            return (
              <>
                <Box style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <Table.Root variant="surface" style={{ background: 'rgba(30, 41, 59, 0.2)' }}>
                    <Table.Header>
                      <Table.Row style={{ borderColor: 'var(--border-mockup)' }}>
                        <Table.ColumnHeaderCell style={{ color: 'var(--indigo-11)' }}>Estado</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{ color: 'var(--indigo-11)' }}>Alerta</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{ color: 'var(--indigo-11)' }}>Detalle / Mensaje</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell style={{ color: 'var(--indigo-11)' }}>Fecha</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {currentItems.map((item: any) => {
                        if (item.itemType === 'active') {
                          const isWarning = item.titulo?.toLowerCase().includes('advertencia') || item.mensaje?.toLowerCase().includes('alto') || item.mensaje?.toLowerCase().includes('baja');
                          const textCol = isWarning ? 'var(--amber)' : 'var(--red)';
                          const badgeCol = isWarning ? 'orange' : 'red';
                          return (
                            <Table.Row key={`act-${item.id}`} style={{ background: 'rgba(239, 68, 68, 0.04)', borderColor: 'var(--border-mockup)' }}>
                              <Table.Cell>
                                <Badge color={badgeCol as any} size="1">Activa</Badge>
                              </Table.Cell>
                              <Table.Cell>
                                <Text size="2" style={{ color: textCol, fontWeight: 'bold' }}>{item.titulo}</Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Text color="gray" size="2">{item.sensor}: {item.valor}{item.unidad} - {item.mensaje}</Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Text size="2" color="gray">{item.fecha || 'Reciente'}</Text>
                              </Table.Cell>
                            </Table.Row>
                          );
                        } else {
                          return (
                            <Table.Row key={`hist-${item.id}`} style={{ borderColor: 'var(--border-mockup)' }}>
                              <Table.Cell>
                                <Badge color="blue" size="1">Resuelta</Badge>
                              </Table.Cell>
                              <Table.Cell>
                                <Text size="2" color="blue" weight="medium">{item.tipo}</Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Text color="gray" size="2">Historial de alerta resuelta / control normalizado</Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Text size="2" color="gray">{item.fecha}</Text>
                              </Table.Cell>
                            </Table.Row>
                          );
                        }
                      })}
                    </Table.Body>
                  </Table.Root>
                </Box>
                {totalPages > 1 && (
                  <Flex justify="center" align="center" gap="4" mt="4">
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      style={{ cursor: currentPage === 1 ? 'default' : 'pointer' }}
                    >
                      Anterior
                    </Button>
                    <Text size="2" color="gray">
                      Página {currentPage} de {totalPages}
                    </Text>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      style={{ cursor: currentPage === totalPages ? 'default' : 'pointer' }}
                    >
                      Siguiente
                    </Button>
                  </Flex>
                )}
              </>
            );
          })()
        )}
      </Card>
    </Box>
  );
}
