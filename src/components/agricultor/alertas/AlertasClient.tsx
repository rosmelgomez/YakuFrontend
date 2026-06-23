// src/components/agricultor/alertas/AlertasClient.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text, Flex, Card, Button, Grid, Slider, Select, Badge, Switch, Table } from '@radix-ui/themes';
import { guardarUmbrales, guardarNotifConfig, getVapidPublicKey, registrarSuscripcionPush } from '@/actions/alertas';

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

export default function AlertasClient({ userId, cultivos, initialData, initialCultivo, initialNotifConfig }: any) {
  const router = useRouter();
  const [umbrales, setUmbrales] = useState(initialData.umbrales);
  const [notifConfigs, setNotifConfigs] = useState(initialNotifConfig || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  // Edit/Lock Mode States
  const [isEditingUmbrales, setIsEditingUmbrales] = useState(false);
  const [isEditingPreferencias, setIsEditingPreferencias] = useState(false);
  const [originalUmbrales, setOriginalUmbrales] = useState(initialData.umbrales);
  const [originalNotifConfigs, setOriginalNotifConfigs] = useState(initialNotifConfig || []);

  // Pagination State for Alerts
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Default recommendation banner state
  const [showRecommendBanner, setShowRecommendBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDefault = umbrales && umbrales.length > 0 && umbrales.every((u: any) => Number(u.min) === 10 && Number(u.max) === 90);
    const confirmed = localStorage.getItem(`confirmed_default_${userId}_${initialCultivo}`) === 'true';
    setShowRecommendBanner(isDefault && !confirmed);
  }, [umbrales, userId, initialCultivo]);

  const handleConfirmDefault = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`confirmed_default_${userId}_${initialCultivo}`, 'true');
    }
    setShowRecommendBanner(false);
  };

  // Sync state if props change (e.g. cultivation switch)
  useEffect(() => {
    setUmbrales(initialData.umbrales);
    setOriginalUmbrales(initialData.umbrales);
    setIsEditingUmbrales(false);
    setCurrentPage(1);
  }, [initialData.umbrales, initialData.alertasActivas, initialData.historial]);

  useEffect(() => {
    setNotifConfigs(initialNotifConfig || []);
    setOriginalNotifConfigs(initialNotifConfig || []);
    setIsEditingPreferencias(false);
  }, [initialNotifConfig]);

  // Web Push Status States
  const [pushStatus, setPushStatus] = useState<'checking' | 'not-supported' | 'default' | 'granted' | 'denied'>('checking');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSecure, setIsSecure] = useState(true);

  const handleRequestPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
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

  const handleSliderChange = (id: number, values: number[]) => {
    setUmbrales(umbrales.map((u: any) => u.id === id ? { ...u, min: values[0], max: values[1] } : u));
  };

  const handleMinChange = (id: number, valStr: string) => {
    if (valStr === '') {
      setUmbrales(umbrales.map((u: any) => u.id === id ? { ...u, min: '' } : u));
      return;
    }
    const val = parseInt(valStr, 10);
    if (isNaN(val)) return;
    const clamped = Math.max(0, Math.min(100, val));
    setUmbrales(umbrales.map((u: any) => {
      if (u.id === id) {
        const newMin = Math.min(clamped, u.max === '' ? 100 : Number(u.max));
        return { ...u, min: newMin };
      }
      return u;
    }));
  };

  const handleMaxChange = (id: number, valStr: string) => {
    if (valStr === '') {
      setUmbrales(umbrales.map((u: any) => u.id === id ? { ...u, max: '' } : u));
      return;
    }
    const val = parseInt(valStr, 10);
    if (isNaN(val)) return;
    const clamped = Math.max(0, Math.min(100, val));
    setUmbrales(umbrales.map((u: any) => {
      if (u.id === id) {
        const newMax = Math.max(clamped, u.min === '' ? 0 : Number(u.min));
        return { ...u, max: newMax };
      }
      return u;
    }));
  };

  const handleInputBlur = (id: number, type: 'min' | 'max') => {
    setUmbrales(umbrales.map((u: any) => {
      if (u.id === id) {
        if (u[type] === '') {
          const original = originalUmbrales.find((o: any) => o.id === id);
          return { ...u, [type]: original ? original[type] : 0 };
        }
      }
      return u;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await guardarUmbrales(userId, initialCultivo, umbrales);
      setOriginalUmbrales(umbrales);
      setIsEditingUmbrales(false);
    } catch {
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelUmbrales = () => {
    setUmbrales(originalUmbrales);
    setIsEditingUmbrales(false);
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
    } catch {
    } finally {
      setIsSavingNotif(false);
    }
  };

  const handleCancelPreferencias = () => {
    setNotifConfigs(originalNotifConfigs);
    setIsEditingPreferencias(false);
  };

  return (
    <Box>
      <Flex justify="between" mb="6">
        <Text size="6" weight="bold" color="indigo">Alertas</Text>
        <Select.Root value={initialCultivo.toString()} onValueChange={(v) => router.push(`?cultivo=${v}`)}>
          <Select.Trigger style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)' }} />
          <Select.Content>
            {cultivos.map((c: any) => <Select.Item key={c.id} value={c.id.toString()}>{c.nombre_planta}</Select.Item>)}
          </Select.Content>
        </Select.Root>
      </Flex>


      <style dangerouslySetInnerHTML={{
        __html: `
          .top-cards-container {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          @media (min-width: 768px) {
            .top-cards-container {
              grid-template-columns: 3fr 7fr;
            }
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
        {/* Card 1: Umbrales (40% de ancho) */}
        <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text size="4" weight="bold" color="indigo" mb="5" as="div">Configuración de umbrales</Text>
          
          {showRecommendBanner && (
            <Box 
              mb="4" 
              p="3" 
              style={{ 
                background: 'rgba(99, 102, 241, 0.08)', 
                border: '1px dashed rgba(99, 102, 241, 0.4)', 
                borderRadius: '8px' 
              }}
            >
              <Text size="2" color="indigo" weight="medium" mb="2" as="div">
                🌱 Se han asignado umbrales recomendados por defecto (10% - 90%).
              </Text>
              <Button size="1" onClick={handleConfirmDefault} style={{ cursor: 'pointer' }}>
                Aceptar
              </Button>
            </Box>
          )}
          <Flex direction="column" gap="5" style={{ flexGrow: 1, justifyItems: 'space-between' }}>
            <Flex direction="column" gap="5" style={{ flexGrow: 1 }}>
              {umbrales.map((u: any) => (
                <Box key={u.id}>
                  <Flex justify="between" align="center" mb="1">
                    <Text color="gray" size="2">{u.nombre}</Text>
                    {isEditingUmbrales ? (
                      <Flex align="center" gap="1">
                        <input 
                          type="number" 
                          className="threshold-input"
                          value={u.min}
                          onChange={(e) => handleMinChange(u.id, e.target.value)}
                          onBlur={() => handleInputBlur(u.id, 'min')}
                          style={{
                            width: '45px',
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid var(--border-mockup)',
                            borderRadius: '4px',
                            color: 'var(--green-9)',
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            padding: '1px 2px',
                            outline: 'none'
                          }}
                        />
                        <Text size="1" color="gray" weight="bold">-</Text>
                        <input 
                          type="number" 
                          className="threshold-input"
                          value={u.max}
                          onChange={(e) => handleMaxChange(u.id, e.target.value)}
                          onBlur={() => handleInputBlur(u.id, 'max')}
                          style={{
                            width: '45px',
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid var(--border-mockup)',
                            borderRadius: '4px',
                            color: 'var(--green-9)',
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            padding: '1px 2px',
                            outline: 'none'
                          }}
                        />
                        <Text color="green" size="2" weight="bold">{u.unidad}</Text>
                      </Flex>
                    ) : (
                      <Text color="green" size="2" weight="bold">{u.min} - {u.max} {u.unidad}</Text>
                    )}
                  </Flex>
                  <Slider 
                    value={[u.min, u.max]} 
                    min={0} 
                    max={100} 
                    step={1} 
                    onValueChange={(v) => handleSliderChange(u.id, v)}
                    style={{ pointerEvents: isEditingUmbrales ? 'auto' : 'none' }}
                  />
                </Box>
              ))}
            </Flex>
            {!isEditingUmbrales ? (
              <Button 
                onClick={() => setIsEditingUmbrales(true)} 
                style={{ marginTop: 'auto', cursor: 'pointer' }}
              >
                Actualizar
              </Button>
            ) : (
              <Flex gap="3" style={{ marginTop: 'auto' }}>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving} 
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button 
                  onClick={handleCancelUmbrales} 
                  variant="soft" 
                  color="gray" 
                  disabled={isSaving} 
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  Cancelar
                </Button>
              </Flex>
            )}
          </Flex>
        </Card>

        {/* Card 2: Preferencias de Canales (60% de ancho) */}
        <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text size="4" weight="bold" color="indigo" mb="5" as="div">Preferencias de canales</Text>
          <Flex direction="column" gap="4" style={{ flexGrow: 1 }}>
            
            {/* Lista agrupada en pequeños cards en un grid de 2 columnas */}
            <Box style={{ flexGrow: 1, paddingRight: '6px' }}>
              <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="3" mb="3">
                {categorias.map((cat) => {
                  const bajo = notifConfigs.find((c: any) => c.id_tipo_alerta === cat.bajoId);
                  const alto = notifConfigs.find((c: any) => c.id_tipo_alerta === cat.altoId);
                  
                  return (
                    <Card key={cat.titulo} size="1" style={{ background: 'rgba(30, 41, 59, 0.45)', borderColor: 'var(--border-mockup)', padding: '10px 12px', borderRadius: '8px' }}>
                      <Text size="2" weight="bold" color="indigo" mb="1" as="div">{cat.titulo}</Text>
                      
                      {/* Límite Bajo */}
                      {bajo && (
                        <Box mb="2" pb="1.5" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <Text size="1" color="gray" weight="bold" mb="1" as="div">Si baja del mínimo (Bajo)</Text>
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
                              <Text size="1" color="gray">Pantalla</Text>
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
                          <Flex justify="between" align="center" mt="2">
                            <Text size="1" color="gray">Recordar cada</Text>
                            <input
                              aria-label={`Intervalo bajo de ${cat.titulo}`}
                              type="number"
                              min={5}
                              max={1440}
                              value={bajo.recordatorio_minutos || 30}
                              disabled={!isEditingPreferencias}
                              onChange={(event) => handleReminderChange(cat.bajoId, Number(event.target.value))}
                              style={{ width: 60, padding: 4, borderRadius: 4 }}
                            />
                            <Text size="1" color="gray">min</Text>
                          </Flex>
                        </Box>
                      )}

                      {/* Límite Alto */}
                      {alto && (
                        <Box>
                          <Text size="1" color="gray" weight="bold" mb="1" as="div">Si supera el máximo (Alto)</Text>
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
                              <Text size="1" color="gray">Pantalla</Text>
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
                          <Flex justify="between" align="center" mt="2">
                            <Text size="1" color="gray">Recordar cada</Text>
                            <input
                              aria-label={`Intervalo alto de ${cat.titulo}`}
                              type="number"
                              min={5}
                              max={1440}
                              value={alto.recordatorio_minutos || 30}
                              disabled={!isEditingPreferencias}
                              onChange={(event) => handleReminderChange(cat.altoId, Number(event.target.value))}
                              style={{ width: 60, padding: 4, borderRadius: 4 }}
                            />
                            <Text size="1" color="gray">min</Text>
                          </Flex>
                        </Box>
                      )}
                    </Card>
                  );
                })}
              </Grid>
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
        {(!initialData.alertasActivas || initialData.alertasActivas.length === 0) && (!initialData.historial || initialData.historial.length === 0) ? (
          <Text size="2" color="gray">No hay registro de alertas activas ni resueltas.</Text>
        ) : (
          (() => {
            const combinedAlerts = [
              ...(initialData.alertasActivas || []).map((a: any) => ({ ...a, itemType: 'active' })),
              ...(initialData.historial || []).map((h: any) => ({ ...h, itemType: 'resolved' }))
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
