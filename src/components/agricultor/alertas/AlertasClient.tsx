// src/components/agricultor/alertas/AlertasClient.tsx
"use client";

import { useState, useEffect } from 'react';
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
const TIPOS_NOTIFICACION = [
  {
    id_tipo_alerta: 11,
    codigo: "RIEGO_ML",
    titulo: "Riego activado por IA",
    descripcion: "Avisos del ciclo de riego: inicio con las lecturas de las 4 variables de la IA, y finalización con los litros de agua consumidos durante el riego.",
    badgeColor: "indigo",
  },
  {
    id_tipo_alerta: 12,
    codigo: "PROBLEMA_RIEGO",
    titulo: "Incidencias y problemas de riego",
    descripcion: "Avisos inmediatos en el instante que ocurre un problema: riego fallido, interrupción, parada sin confirmar o desconexión durante el ciclo.",
    badgeColor: "red",
  },
];

function ensureValidConfigs(configs: any[]) {
  const clean = (configs || []).filter((c: any) => {
    const name = (c.nombre || '').toLowerCase();
    return (
      c.id_tipo_alerta >= 11 &&
      !name.includes('humedad') &&
      !name.includes('temperatura') &&
      !name.includes('tanque')
    );
  });

  return TIPOS_NOTIFICACION.map((tipo) => {
    const existing = clean.find((c: any) => c.id_tipo_alerta === tipo.id_tipo_alerta);
    if (existing) {
      return {
        ...existing,
        nombre: tipo.titulo,
        recordatorio_minutos: existing.recordatorio_minutos || 15,
      };
    }
    return {
      id_tipo_alerta: tipo.id_tipo_alerta,
      nombre: tipo.titulo,
      canal_email: false,
      canal_push: false,
      recordatorio_minutos: 15,
    };
  });
}



export default function AlertasClient({ 
  userId, 
  cultivos = [], 
  initialData = { alertasActivas: [], historial: [] }, 
  initialCultivo = "", 
  initialNotifConfig = [], 
  initialHasNotifConfig = false, 
  initialPushRegistered = false 
}: any) {
  const router = useRouter();
  const [selectedCultivoId, setSelectedCultivoId] = useState(initialCultivo);
  const [alertasActivas, setAlertasActivas] = useState(initialData?.alertasActivas || []);
  const [historial, setHistorial] = useState(initialData?.historial || []);
  const [isLoadingCropData, setIsLoadingCropData] = useState(false);

  const [notifConfigs, setNotifConfigs] = useState(initialNotifConfig || []);
  const [hasConfigState, setHasConfigState] = useState(initialHasNotifConfig);


  // Pagination State for Alerts
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sync state if props change (e.g. cultivation switch from parent page)
  useEffect(() => {
    setAlertasActivas(initialData?.alertasActivas || []);
    setHistorial(initialData?.historial || []);
    setSelectedCultivoId(initialCultivo);
    setCurrentPage(1);
  }, [initialData, initialCultivo]);

  const [isLoadingNotifConfig, setIsLoadingNotifConfig] = useState(
    !initialNotifConfig || initialNotifConfig.length === 0
  );

  useEffect(() => {
    let cancelled = false;
    if (initialNotifConfig && initialNotifConfig.length > 0) {
      const valid = ensureValidConfigs(initialNotifConfig);
      setNotifConfigs(valid);
      setIsLoadingNotifConfig(false);
      return;
    }

    setIsLoadingNotifConfig(true);
    obtenerNotifConfig()
      .then((res: any) => {
        if (!cancelled) {
          const raw = (res?.success && res?.data?.configs) ? res.data.configs : [];
          const valid = ensureValidConfigs(raw);
          setNotifConfigs(valid);
          setHasConfigState(res?.data?.has_config || false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const defaults = ensureValidConfigs([]);
          setNotifConfigs(defaults);
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



  const handlePushToggle = async (id_tipo_alerta: number) => {
    const updated = notifConfigs.map((c: any) => 
      c.id_tipo_alerta === id_tipo_alerta 
        ? { ...c, canal_push: !c.canal_push } 
        : c
    );
    setNotifConfigs(updated);

    try {
      const updates = updated.map((c: any) => ({
        id_tipo_alerta: c.id_tipo_alerta,
        canal_email: false,
        canal_push: Boolean(c.canal_push),
        recordatorio_minutos: c.recordatorio_minutos || 15,
      }));
      await guardarNotifConfig(updates);
      setHasConfigState(true);
    } catch (err) {
      console.error("Error al guardar preferencia de notificación:", err);
    }
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
      <Flex justify="between" align={{ initial: 'start', sm: 'center' }} direction={{ initial: 'column', sm: 'row' }} gap="3" mb={{ initial: "4", sm: "6" }}>
        <Text size={{ initial: "5", sm: "6" }} weight="bold" color="indigo">Notificaciones y Alertas</Text>
        <Box style={{ width: '100%', maxWidth: '280px' }}>
          <SearchableSelect
            value={selectedCultivoId.toString()}
            onValueChange={handleCultivoChange}
            placeholder="Seleccionar cultivo"
            searchPlaceholder="Buscar cultivo..."
            style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)', width: '100%' }}
            options={cultivos.map((c: any) => ({ value: c.id.toString(), label: c.nombre_planta }))}
            disabled={isLoadingCropData}
          />
        </Box>
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

      <Box mb="4">
        {/* Card 1: Notificaciones del navegador */}
        <Card size={{ initial: "1", sm: "2" }} mb="4" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)' }}>
          <Flex justify="between" align={{ initial: 'start', sm: 'center' }} gap="3" wrap="wrap">
            <Box>
              <Text size={{ initial: "2", sm: "3" }} weight="bold" color="indigo" as="div">Notificaciones del navegador</Text>
              <Text size={{ initial: "1", sm: "2" }} color="gray" as="div">
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
                <Button size="2" onClick={handleRequestPush} disabled={isSubscribing}>
                  {isSubscribing ? 'Activando…' : 'Activar notificaciones'}
                </Button>
              )}
              {pushStatus === 'granted' && (
                <Button size="2" variant="soft" onClick={handleTestNotification}>Probar notificación</Button>
              )}
            </Flex>
          </Flex>
        </Card>

        {/* Card 2: Preferencias de Notificaciones */}
        <Card size={{ initial: "2", sm: "3" }} style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', display: 'flex', flexDirection: 'column', height: 'auto' }}>
          <Text size={{ initial: "3", sm: "4" }} weight="bold" color="indigo" mb="3" as="div">Preferencias de notificaciones</Text>
          <Flex direction="column" gap="3" style={{ flexGrow: 1 }}>
            
            <Box style={{ flexGrow: 1 }}>
              {isLoadingNotifConfig ? (
                <Flex direction="column" align="center" justify="center" p="5" style={{ minHeight: '160px' }}>
                  <Text size="2" color="gray">Cargando preferencias...</Text>
                </Flex>
              ) : (
                <Grid columns={{ initial: '1', sm: '2' }} gap="3">
                  {TIPOS_NOTIFICACION.map((tipo) => {
                    const config = notifConfigs.find((c: any) => c.id_tipo_alerta === tipo.id_tipo_alerta) || {
                      id_tipo_alerta: tipo.id_tipo_alerta,
                      canal_push: false,
                      recordatorio_minutos: 15,
                    };
                    return (
                      <Card key={tipo.codigo} size="1" style={{ background: 'rgba(30, 41, 59, 0.45)', borderColor: 'var(--border-mockup)', padding: '12px 14px', borderRadius: '10px' }}>
                        <Flex justify="between" align="center" mb="1">
                          <Text size="2" weight="bold" color={tipo.badgeColor as any} as="div">{tipo.titulo}</Text>
                          <Badge color={tipo.badgeColor as any} size="1">
                            {tipo.codigo === 'RIEGO_ML' ? 'IA / Sensores' : 'Crítica'}
                          </Badge>
                        </Flex>
                        <Text size="1" color="gray" mb="3" as="div" style={{ lineHeight: '1.4', minHeight: '34px' }}>
                          {tipo.descripcion}
                        </Text>
                        
                        <Box pt="2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <Flex justify="between" align="center">
                            <Flex align="center" gap="2">
                              <Text size="1" color="gray">Notificaciones Push</Text>
                              {config.canal_push ? (
                                <Badge color="blue" size="1">Activo</Badge>
                              ) : (
                                <Badge color="gray" size="1">Desactivado</Badge>
                              )}
                            </Flex>
                            <Switch 
                              checked={Boolean(config.canal_push)} 
                              onCheckedChange={() => handlePushToggle(tipo.id_tipo_alerta)}
                              size="1"
                              color="blue"
                              style={{ cursor: 'pointer' }}
                            />
                          </Flex>
                        </Box>
                      </Card>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </Flex>
        </Card>
      </Box>

      {/* Card 3: Historial y Alertas Activas (a lo ancho completo debajo) */}
      <Card size={{ initial: "2", sm: "3" }} style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)' }}>
        <Text size={{ initial: "3", sm: "4" }} weight="bold" color="indigo" mb="4" as="div">Historial y estado de alertas</Text>
        {(() => {
            const isVariableAlert = (alert: any) => {
              const t = (alert.titulo || alert.tipo || '').toLowerCase();
              const m = (alert.mensaje || '').toLowerCase();
              return (
                t.includes('humedad') ||
                t.includes('temperatura') ||
                t.includes('tanque') ||
                m.includes('higrómetro') ||
                m.includes('termómetro') ||
                m.includes('umbral') ||
                m.includes('nivel del tanque')
              ) && !t.includes('riego') && !m.includes('riego');
            };

            const combinedAlerts = [
              ...(alertasActivas || []).filter((a: any) => !isVariableAlert(a)).map((a: any) => ({ ...a, itemType: 'active' })),
              ...(historial || []).filter((h: any) => !isVariableAlert(h)).map((h: any) => ({ ...h, itemType: 'resolved' }))
            ];
            const totalItems = combinedAlerts.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const indexOfLastItem = currentPage * itemsPerPage;
            const indexOfFirstItem = indexOfLastItem - itemsPerPage;
            const currentItems = combinedAlerts.slice(indexOfFirstItem, indexOfLastItem);

            if (totalItems === 0) {
              return <Text size="2" color="gray">No hay registro de alertas activas ni resueltas.</Text>;
            }

            return (
              <>
                <Box style={{ maxHeight: '350px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
                  <Table.Root variant="surface" style={{ background: 'rgba(30, 41, 59, 0.2)', minWidth: '520px' }}>
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
                          const isWarning = item.titulo?.toLowerCase().includes('advertencia') || item.severidad === 'advertencia';
                          const isInfo = item.severidad === 'info' || item.titulo?.toLowerCase().includes('ia') || item.titulo?.toLowerCase().includes('iniciado');
                          const textCol = isInfo ? 'var(--indigo-11)' : (isWarning ? 'var(--amber)' : 'var(--red)');
                          const badgeCol = isInfo ? 'indigo' : (isWarning ? 'orange' : 'red');
                          return (
                            <Table.Row key={`act-${item.id}`} style={{ background: isInfo ? 'rgba(99, 102, 241, 0.04)' : 'rgba(239, 68, 68, 0.04)', borderColor: 'var(--border-mockup)' }}>
                              <Table.Cell>
                                <Badge color={badgeCol as any} size="1">Activa</Badge>
                              </Table.Cell>
                              <Table.Cell>
                                <Text size="2" style={{ color: textCol, fontWeight: 'bold' }}>{item.titulo}</Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Text color="gray" size="2">
                                  {item.mensaje}
                                </Text>
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
                                <Text color="gray" size="2">{item.mensaje || 'Historial de alerta resuelta / control normalizado'}</Text>
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
          })()}
      </Card>
    </Box>
  );
}
