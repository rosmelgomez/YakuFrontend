// src/components/agricultor/control/ControlClient.tsx
"use client";

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text, Flex, Card, Button, Grid, Badge, Switch, Dialog, TextField, Checkbox, ScrollArea, Tabs } from '@radix-ui/themes';
import { setModoOperacion, toggleBombaManual, toggleValvulaManual, toggleHorario, eliminarHorario, agregarHorario, toggleCapturaDatos, calibrarSensor, actualizarTiempoMaximoRele } from '@/actions/control';
import { seleccionarModeloML } from '@/actions/ml';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function ControlClient({ userId, cultivos, data, idCultivo, modelosML }: any) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [optimisticData, setOptimisticData] = useState(data);
    const [nuevaHora, setNuevaHora] = useState('08:00');
    const [nuevaDuracion, setNuevaDuracion] = useState(15);
    const [nuevoNombre, setNuevoNombre] = useState('Riego Programado');
    const [diasSel, setDiasSel] = useState([true, true, true, true, true, false, false]);
    const [maxRelayMinutes, setMaxRelayMinutes] = useState<number>(data.bomba.timeoutMin || 10);
    const initialModo = data.modo.predictivoActivo ? 'predictivo' : (data.modo.programadoActivo ? 'programado' : 'manual');
    const [selectedModo, setSelectedModo] = useState<'manual' | 'predictivo' | 'programado'>(initialModo);

    // Estados para Calibración de Sensores (HU-10, HU-12)
    const [calibDevId, setCalibDevId] = useState<number | null>(null);
    const [calibPin, setCalibPin] = useState<number | null>(null);
    const [calibSensorName, setCalibSensorName] = useState<string>("");
    const [calibOffset, setCalibOffset] = useState<string>("0.0");

    useEffect(() => {
        setOptimisticData(data);
        setMaxRelayMinutes(data.bomba.timeoutMin || 10);
        const currentModo = data.modo.predictivoActivo ? 'predictivo' : (data.modo.programadoActivo ? 'programado' : 'manual');
        setSelectedModo(currentModo);
    }, [data, idCultivo]);

    const handleCalibrateSensorSubmit = async () => {
        if (calibDevId === null || calibPin === null) return;
        const offsetVal = parseFloat(calibOffset);
        if (isNaN(offsetVal)) {
            alert("Por favor ingrese un offset numérico válido.");
            return;
        }
        startTransition(async () => {
            const res = await calibrarSensor(calibDevId, calibPin, offsetVal);
            if (res.success) {
                alert(`✅ Calibración de offset ${offsetVal} enviada con éxito para GPIO ${calibPin}.`);
                setCalibDevId(null);
            } else {
                alert(`❌ Error al calibrar: ${res.error}`);
            }
        });
    };

    const { bomba, valvula = { id: bomba?.id, pin: 25, abierta: false, modoAuto: true }, seguridad, modo, logs, horarios, dispositivos } = optimisticData;

    // Clasificación de dispositivos: Sensores de captura vs Actuadores
    const dispositivosSensores = (dispositivos || []).filter((dev: any) => 
        dev.tipoId === 1 || 
        dev.tipoNombre?.toLowerCase().includes('sensor') || 
        dev.tipoNombre?.toLowerCase().includes('colector') ||
        dev.nombre?.toLowerCase().includes('suelo') ||
        dev.nombre?.toLowerCase().includes('clima')
    );

    const dispositivosActuadores = (dispositivos || []).filter((dev: any) => 
        !dispositivosSensores.some((s: any) => s.id === dev.id)
    );

    const isActuadorFuncionando = dispositivosActuadores.some((dev: any) => dev.funcionamientoActivo);

    // Estados de sensores y actuadores para calcular el estado del Sistema Operativo
    const isSensorsActivos = dispositivosSensores.some((dev: any) => dev.funcionamientoActivo);
    const isActuadoresActivos = dispositivosActuadores.some((dev: any) => dev.funcionamientoActivo);

    let badgeColor = "red";
    let badgeText = "Sistema inactivo";
    let badgeDotColor = "#ef4444";

    if (isSensorsActivos && isActuadoresActivos) {
        badgeColor = "green";
        badgeText = "Sistema operativo";
        badgeDotColor = "#22c55e";
    } else if (isSensorsActivos || isActuadoresActivos) {
        badgeColor = "orange";
        badgeText = "Operación parcial";
        badgeDotColor = "#f97316";
    }

    const handleModoClick = (m: 'manual' | 'predictivo' | 'programado') => {
        if (bomba.encendida || valvula.abierta) {
            alert("Bloqueado: primero apague el riego (bomba o válvula) para cambiar de modo.");
            return;
        }
        if (m === 'programado' && (horarios || []).length === 0) {
            alert("⚠️ No tienes horarios programados. Por favor, agrega al menos un horario de riego a continuación para poder activar este modo.");
            setSelectedModo('programado');
            return;
        }
        if (m === 'predictivo' && !modo.tieneModelo) {
            alert("No hay un modelo inteligente entrenado para este cultivo.");
            return;
        }
        setSelectedModo(m);
        handleModo(m);
    };

    const handleModo = async (m: 'manual' | 'predictivo' | 'programado') => {
        if (!bomba.id) return;
        if (bomba.encendida || valvula.abierta) {
            alert("Bloqueado: primero apague el riego (bomba o válvula) para cambiar de modo.");
            return;
        }
        const previousData = optimisticData;
        setOptimisticData((current: any) => ({
            ...current,
            modo: {
                ...current.modo,
                actual: m,
                manualActivo: m === 'manual',
                predictivoActivo: m === 'predictivo',
                programadoActivo: m === 'programado',
            },
        }));
        startTransition(async () => {
            try {
                await setModoOperacion(userId, idCultivo, bomba.id, m);
            } catch (err: any) {
                setOptimisticData(previousData);
                alert(`Error al cambiar modo: ${err.message}`);
            }
        });
    };

    const handleToggleBomba = async () => {
        if (!bomba.id) return;
        if (!isActuadorFuncionando && !bomba.encendida) {
            alert("No se puede activar la bomba: el dispositivo actuador esta apagado.");
            return;
        }
        const previousData = optimisticData;
        const nextState = !bomba.encendida;
        setOptimisticData((current: any) => ({
            ...current,
            bomba: { ...current.bomba, encendida: nextState },
        }));
        startTransition(async () => {
            try {
                await toggleBombaManual(userId, bomba.id, nextState);
            } catch (err: any) {
                setOptimisticData(previousData);
                alert(`Error al conmutar la bomba: ${err.message}`);
            }
        });
    };

    const handleToggleValvula = async () => {
        if (!valvula.id && !bomba.id) return;
        if (!isActuadorFuncionando && !valvula.abierta) {
            alert("No se puede abrir la valvula: el dispositivo actuador esta apagado.");
            return;
        }
        const previousData = optimisticData;
        const nextState = !valvula.abierta;
        setOptimisticData((current: any) => ({
            ...current,
            valvula: { ...(current.valvula || { id: current.bomba?.id, pin: 25 }), abierta: nextState },
        }));
        startTransition(async () => {
            try {
                await toggleValvulaManual(userId, valvula.id || bomba.id, nextState);
            } catch (err: any) {
                setOptimisticData(previousData);
                alert(`Error al conmutar la valvula: ${err.message}`);
            }
        });
    };

    const handleGuardarHorario = async () => {
        if (!bomba.id) return;
        startTransition(async () => {
            try {
                await agregarHorario(userId, bomba.id, nuevaHora, nuevaDuracion, diasSel, nuevoNombre);
                // Si agregamos el horario estando en pestaña programado pero el backend aún no está activo, lo activamos
                const modoActual = modo.actual?.toLowerCase();
                if (modoActual !== 'programado' && modoActual !== 'programado (ml)') {
                    await setModoOperacion(userId, idCultivo, bomba.id, 'programado');
                }
            } catch (err: any) {
                alert(`Error al agregar horario: ${err.message}`);
            }
        });
    };

    const handleSaveRelayDuration = () => {
        if (!Number.isInteger(maxRelayMinutes) || maxRelayMinutes < 1 || maxRelayMinutes > 30) {
            alert("El tiempo maximo del rele debe estar entre 1 y 30 minutos.");
            return;
        }
        startTransition(async () => {
            try {
                await actualizarTiempoMaximoRele(idCultivo, maxRelayMinutes);
                setOptimisticData((current: any) => ({
                    ...current,
                    bomba: { ...current.bomba, timeoutMin: maxRelayMinutes },
                }));
            } catch (err: any) {
                alert(`Error al guardar la configuracion: ${err.message}`);
            }
        });
    };

    const handleToggleCaptura = async (dispositivoId: number, active: boolean) => {
        const esActuador = dispositivosActuadores.some((dev: any) => dev.id === dispositivoId);
        if (esActuador && active) {
            const haySensorActivo = dispositivosSensores.some((dev: any) => dev.funcionamientoActivo);
            if (!haySensorActivo) {
                alert("No se puede activar el dispositivo actuador: primero active el dispositivo de sensores.");
                return;
            }
        }

        const previousData = optimisticData;
        setOptimisticData((current: any) => ({
            ...current,
            dispositivos: (current.dispositivos || []).map((dev: any) =>
                dev.id === dispositivoId ? { ...dev, funcionamientoActivo: active } : dev
            ),
        }));
        startTransition(async () => {
            const res = await toggleCapturaDatos(userId, dispositivoId, active);
            if (!res.success) {
                setOptimisticData(previousData);
                alert(`Error al cambiar estado de captura: ${res.error}`);
            }
        });
    };

    const handleToggleHorario = (idHorario: number, active: boolean) => {
        const previousData = optimisticData;
        setOptimisticData((current: any) => ({
            ...current,
            horarios: (current.horarios || []).map((h: any) =>
                h.id === idHorario ? { ...h, activo: active } : h
            ),
        }));

        startTransition(async () => {
            try {
                await toggleHorario(idHorario, active);
            } catch (err: any) {
                setOptimisticData(previousData);
                alert(`Error al cambiar horario: ${err.message}`);
            }
        });
    };

    const handleEliminarHorario = (idHorario: number) => {
        const previousData = optimisticData;
        setOptimisticData((current: any) => ({
            ...current,
            horarios: (current.horarios || []).filter((h: any) => h.id !== idHorario),
        }));

        startTransition(async () => {
            try {
                await eliminarHorario(idHorario);
            } catch (err: any) {
                setOptimisticData(previousData);
                alert(`Error al eliminar horario: ${err.message}`);
            }
        });
    };
    const handleSelectModel = async (idModelo: number) => {
        startTransition(async () => {
            const res = await seleccionarModeloML(idModelo, idCultivo);
            if (!res.success) {
                alert(`❌ Error al seleccionar el modelo: ${res.error}`);
            }
        });
    };

    return (
        <Box style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>

            {/* HEADER */}
            <Flex justify="between" align="end" mb="6" wrap="wrap" gap="4">
                <Box>
                    <Flex align="center" gap="4" mb="3">
                        <Text size="6" weight="bold" color="indigo" as="div">Control y configuración</Text>
                        <SearchableSelect
                            value={idCultivo.toString()}
                            onValueChange={(v) => startTransition(() => router.push(`?cultivo=${v}`))}
                            placeholder="Seleccionar cultivo"
                            searchPlaceholder="Buscar cultivo..."
                            style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)', width: 240 }}
                            options={cultivos.map((c: any) => ({ value: c.id.toString(), label: c.nombre_planta }))}
                        />
                    </Flex>
                    <Text size="3" style={{ color: '#9ca3af', fontFamily: 'monospace' }}>
                        Modo activo: <span style={{ color: '#818cf8', fontWeight: 'bold' }}>{modo.actual}</span> · GPIO {bomba.pin || 'N/A'} → Relé → Bomba
                    </Text>
                </Box>
                <Badge color={badgeColor as any} size="3" variant="soft" style={{ borderRadius: '8px', padding: '6px 12px' }}>
                    <Box style={{ width: '8px', height: '8px', borderRadius: '50%', background: badgeDotColor, marginRight: '8px' }} />
                    {badgeText}
                </Badge>
            </Flex>

            {/* MAIN GRID */}
            <Grid columns={seguridad.esAdmin ? { initial: '1', lg: '1.2fr 0.8fr' } : '1'} gap="5" mb="5" align="start">
                
                {/* COLUMNA IZQUIERDA: CONFIGURACIÓN Y CONTROL */}
                <Tabs.Root defaultValue="sensores" style={{ width: '100%' }}>
                    <Tabs.List style={{ marginBottom: '1.5rem', background: 'var(--bg-mockup)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border-mockup)', display: 'flex' }}>
                        <Tabs.Trigger value="sensores" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '0.9rem', flex: 1, textAlign: 'center' }}>
                            📡 Sensores de Captura
                        </Tabs.Trigger>
                        <Tabs.Trigger value="actuadores" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '0.9rem', flex: 1, textAlign: 'center' }}>
                            ⚡ Actuadores Físicos
                        </Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="sensores">
                        <Flex direction="column" gap="5">
                            <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                                <Text size="3" weight="bold" color="indigo" mb="4" as="div">📡 Dispositivos de Captura de Sensores</Text>
                                {dispositivosSensores.length > 0 ? (
                                    <Flex direction="column" gap="3">
                                        {dispositivosSensores.map((dev: any) => (
                                            <Flex key={`sensor-${dev.id}`} justify="between" align="center" style={{ borderBottom: '1px solid var(--border-mockup)', paddingBottom: '10px' }}>
                                                <Box>
                                                    <Flex align="center" gap="2">
                                                        <Text size="2" weight="bold" style={{ color: 'white' }}>{dev.nombre}</Text>
                                                        {dev.tipoNombre && <Badge color="indigo" variant="outline" size="1">{dev.tipoNombre}</Badge>}
                                                    </Flex>
                                                    <Text size="1" color="gray" style={{ fontFamily: 'monospace', display: 'block', marginTop: '2px' }}>MAC: {dev.mac}</Text>
                                                        {dev.sensores && dev.sensores.length > 0 && (
                                                        <Box mt="1" pl="2" style={{ borderLeft: '2px solid var(--border-mockup)' }}>
                                                                {dev.sensores.map((s: any, index: number) => (
                                                                    <Flex key={`sensor-${dev.id}-${s.id}-${index}`} align="center" gap="2" mt="1">
                                                                    <Text size="1" color="gray">
                                                                        • <span style={{ color: '#9ca3af' }}>{s.nombre}</span> <span style={{ color: '#6b7280', fontSize: '0.75rem', fontFamily: 'monospace' }}>(GPIO {s.pin})</span>
                                                                    </Text>
                                                                    <Button 
                                                                        size="1" 
                                                                        variant="ghost" 
                                                                        color="indigo" 
                                                                        onClick={() => {
                                                                            setCalibDevId(dev.id);
                                                                            setCalibPin(s.pin);
                                                                            setCalibSensorName(s.nombre);
                                                                            setCalibOffset("0.0");
                                                                        }}
                                                                        style={{ cursor: 'pointer', height: '18px', padding: '0 4px', fontSize: '0.7rem' }}
                                                                    >
                                                                        ⚙️ Calibrar
                                                                    </Button>
                                                                </Flex>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </Box>
                                                <Flex gap="3" align="center">
                                                    <Badge color={(dev.estado === 'activo' || dev.funcionamientoActivo) ? 'green' : 'red'} variant="soft">
                                                        {(dev.estado === 'activo' || dev.funcionamientoActivo) ? 'Online' : 'Offline'}
                                                    </Badge>
                                                    <Switch 
                                                        checked={dev.funcionamientoActivo} 
                                                        onCheckedChange={(checked) => handleToggleCaptura(dev.id, checked)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </Flex>
                                            </Flex>
                                        ))}
                                    </Flex>
                                ) : (
                                    <Text color="gray" size="2">No hay dispositivos de captura de sensores vinculados a este cultivo.</Text>
                                )}
                            </Card>
                        </Flex>
                    </Tabs.Content>

                    <Tabs.Content value="actuadores">
                        <Flex direction="column" gap="5">
                            <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '8px' }}>
                                <Flex justify="between" align="end" gap="4" wrap="wrap">
                                    <Box style={{ flex: '1 1 320px' }}>
                                        <Text size="3" weight="bold" color="indigo" as="div">Tiempo maximo del rele por evento de riego</Text>
                                        <Text size="2" color="gray" mt="1" as="div">
                                            Apaga la bomba automaticamente en riego manual, programado y ML.
                                        </Text>
                                    </Box>
                                    <Flex align="end" gap="3" wrap="wrap">
                                        <Box>
                                            <Text size="1" color="gray" mb="1" as="div">Minutos (1-30)</Text>
                                            <TextField.Root
                                                type="number"
                                                min="1"
                                                max="30"
                                                step="1"
                                                value={maxRelayMinutes}
                                                onChange={(event) => setMaxRelayMinutes(Number(event.target.value))}
                                                style={{ width: '120px', background: 'var(--surface2-mockup)', color: 'white' }}
                                            />
                                        </Box>
                                        <Button onClick={handleSaveRelayDuration} disabled={isPending}>Guardar</Button>
                                    </Flex>
                                </Flex>
                            </Card>
                            {/* VINCULACIÓN Y ESTADO DE DISPOSITIVOS ACTUADORES */}
                            <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                                <Text size="3" weight="bold" color="indigo" mb="4" as="div">⚡ Dispositivos Actuadores</Text>
                                {dispositivosActuadores.length > 0 ? (
                                    <Flex direction="column" gap="3">
                                        {dispositivosActuadores.map((dev: any) => (
                                            <Flex key={`act-${dev.id}`} justify="between" align="center" style={{ borderBottom: '1px solid var(--border-mockup)', paddingBottom: '10px' }}>
                                                <Box>
                                                    <Flex align="center" gap="2">
                                                        <Text size="2" weight="bold" style={{ color: 'white' }}>{dev.nombre}</Text>
                                                        {dev.tipoNombre && <Badge color="plum" variant="outline" size="1">{dev.tipoNombre}</Badge>}
                                                    </Flex>
                                                    <Text size="1" color="gray" style={{ fontFamily: 'monospace', display: 'block', marginTop: '2px' }}>MAC: {dev.mac}</Text>
                                                    {dev.sensores && dev.sensores.length > 0 && (
                                                        <Box mt="1" pl="2" style={{ borderLeft: '2px solid var(--border-mockup)' }}>
                                                            {dev.sensores.map((s: any, index: number) => (
                                                                <Text key={`act-${dev.id}-${s.id}-${index}`} size="1" color="gray" style={{ display: 'block' }}>
                                                                    • <span style={{ color: '#9ca3af' }}>{s.nombre}</span> <span style={{ color: '#6b7280', fontSize: '0.75rem', fontFamily: 'monospace' }}>(GPIO {s.pin})</span>
                                                                </Text>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </Box>
                                                <Flex gap="3" align="center">
                                                    <Badge color={(dev.estado === 'activo' || dev.funcionamientoActivo) ? 'green' : 'red'} variant="soft">
                                                        {(dev.estado === 'activo' || dev.funcionamientoActivo) ? 'Online' : 'Offline'}
                                                    </Badge>
                                                    <Switch 
                                                        checked={dev.funcionamientoActivo} 
                                                        onCheckedChange={(checked) => handleToggleCaptura(dev.id, checked)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </Flex>
                                            </Flex>
                                        ))}
                                    </Flex>
                                ) : (
                                    <Text color="gray" size="2">No hay dispositivos actuadores vinculados a este cultivo.</Text>
                                )}
                            </Card>

                            {/* SELECTOR EXCLUSIVO DE MODO */}
                            <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                                <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
                                    <Text size="3" weight="bold" color="indigo">Modo de Operación del Actuador</Text>
                                    {(bomba.encendida || valvula.abierta) && (
                                        <Badge color="yellow" variant="soft" style={{ borderRadius: '6px' }}>
                                            🔒 Bloqueado: apague el riego (bomba/válvula) para cambiar de modo
                                        </Badge>
                                    )}
                                </Flex>
                                <Grid columns={{ initial: '1', md: '3' }} gap="3">
                                    {/* Tarjeta Manual */}
                                    <Card
                                        onClick={() => (bomba.encendida || valvula.abierta) ? undefined : handleModoClick('manual')}
                                        style={{
                                            background: selectedModo === 'manual' ? 'rgba(59, 130, 246, 0.06)' : 'var(--surface2-mockup)',
                                            borderColor: selectedModo === 'manual' ? '#3b82f6' : 'var(--border-mockup)',
                                            borderWidth: '2px',
                                            cursor: (bomba.encendida || valvula.abierta) ? 'not-allowed' : 'pointer',
                                            opacity: (bomba.encendida || valvula.abierta) ? 0.6 : 1,
                                            transition: 'all 0.2s',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Flex direction="column" gap="1" align="center" justify="center" p="2">
                                            <Text size="7">🔧</Text>
                                            <Text size="2" weight="bold" style={{ color: selectedModo === 'manual' ? '#60a5fa' : 'white' }}>Manual</Text>
                                            <Text size="1" color="gray" style={{ lineHeight: '1.2' }}>Comando directo instantáneo.</Text>
                                            {selectedModo === 'manual' && <Badge color="blue" style={{ marginTop: '4px' }}>Activo</Badge>}
                                        </Flex>
                                    </Card>

                                    {/* Tarjeta Programada */}
                                    <Card
                                        onClick={() => (bomba.encendida || valvula.abierta) ? undefined : handleModoClick('programado')}
                                        style={{
                                            background: selectedModo === 'programado' ? 'rgba(34, 197, 94, 0.06)' : 'var(--surface2-mockup)',
                                            borderColor: selectedModo === 'programado' ? '#22c55e' : 'var(--border-mockup)',
                                            borderWidth: '2px',
                                            cursor: (bomba.encendida || valvula.abierta) ? 'not-allowed' : 'pointer',
                                            opacity: (bomba.encendida || valvula.abierta) ? 0.6 : 1,
                                            transition: 'all 0.2s',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Flex direction="column" gap="1" align="center" justify="center" p="2">
                                            <Text size="7">📅</Text>
                                            <Text size="2" weight="bold" style={{ color: selectedModo === 'programado' ? '#4ade80' : 'white' }}>Programado</Text>
                                            <Text size="1" color="gray" style={{ lineHeight: '1.2' }}>Por calendarios fijos.</Text>
                                            {selectedModo === 'programado' && <Badge color="green" style={{ marginTop: '4px' }}>Activo</Badge>}
                                        </Flex>
                                    </Card>

                                    {/* Tarjeta Predictiva (ML) */}
                                    <Card
                                        onClick={() => (bomba.encendida || valvula.abierta || !modo.tieneModelo) ? undefined : handleModoClick('predictivo')}
                                        style={{
                                            background: selectedModo === 'predictivo' ? 'rgba(168, 85, 247, 0.06)' : 'var(--surface2-mockup)',
                                            borderColor: selectedModo === 'predictivo' ? '#a855f7' : 'var(--border-mockup)',
                                            borderWidth: '2px',
                                            cursor: (bomba.encendida || valvula.abierta || !modo.tieneModelo) ? 'not-allowed' : 'pointer',
                                            opacity: (bomba.encendida || valvula.abierta || !modo.tieneModelo) ? 0.6 : 1,
                                            transition: 'all 0.2s',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Flex direction="column" gap="1" align="center" justify="center" p="2">
                                            <Text size="7">🧠</Text>
                                            <Text size="2" weight="bold" style={{ color: selectedModo === 'predictivo' ? '#c084fc' : 'white' }}>Predictivo (ML)</Text>
                                            <Text size="1" color="gray" style={{ lineHeight: '1.2' }}>Inteligente por sensores.</Text>
                                            {selectedModo === 'predictivo' ? (
                                                <Badge color="purple" style={{ marginTop: '4px' }}>Activo</Badge>
                                            ) : !modo.tieneModelo ? (
                                                <Badge color="gray" style={{ marginTop: '4px' }}>Sin modelo</Badge>
                                            ) : null}
                                        </Flex>
                                    </Card>
                                </Grid>
                            </Card>

                            {/* DYNAMIC CARD CONTENT BASED ON MODE */}
                            
                            {/* PANEL MODO MANUAL */}
                            {selectedModo === 'manual' && (
                                <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                                    <Flex direction="column" gap="4">
                                        <Box mb="2">
                                            <Text size="4" weight="bold" color="indigo" mb="1" as="div">🔧 Riego Manual Directo</Text>
                                            <Text size="2" color="gray">Control directo y en tiempo real del motor de la bomba y la electroválvula de llenado.</Text>
                                        </Box>
 
                                        <Grid columns={{ initial: '1', sm: '2' }} gap="4" my="2">
                                            {/* Columna Motor / Bomba */}
                                            <Card style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)', padding: '20px', borderRadius: '12px' }}>
                                                <Flex direction="column" align="center" justify="center" gap="4">
                                                    <Text size="3" weight="bold" color="indigo">Motor de Riego</Text>
                                                    <Box style={{
                                                        width: '100px', height: '100px', borderRadius: '50%',
                                                        border: bomba.encendida ? '3px solid #3b82f6' : '3px solid var(--border-mockup)',
                                                        background: bomba.encendida ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center',
                                                        boxShadow: bomba.encendida ? '0 0 20px rgba(59, 130, 246, 0.25)' : 'none',
                                                        transition: 'all 0.3s'
                                                    } as any}>
                                                        <Text size="6" style={{ filter: bomba.encendida ? 'drop-shadow(0 0 8px #60a5fa)' : 'none' }}>💧</Text>
                                                        <Text size="1" weight="bold" style={{ color: bomba.encendida ? '#60a5fa' : '#6b7280', marginTop: '4px', letterSpacing: '1px' }}>
                                                            {bomba.encendida ? 'ENCENDIDO' : 'APAGADO'}
                                                        </Text>
                                                    </Box>
                                                    <Button
                                                        color={bomba.encendida ? "red" : "green"}
                                                        variant="solid"
                                                        disabled={!bomba.id}
                                                        onClick={handleToggleBomba}
                                                        style={{ cursor: 'pointer', width: '100%', maxWidth: '220px' }}
                                                    >
                                                        {bomba.encendida ? '⏹ Apagar Bomba' : '▶ Encender Bomba'}
                                                    </Button>
                                                    <Text size="1" color="gray" align="center" style={{ minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                                                        Activa el flujo principal de agua hacia los cultivos.
                                                    </Text>
                                                </Flex>
                                            </Card>

                                            {/* Columna Electroválvula */}
                                            <Card style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)', padding: '20px', borderRadius: '12px' }}>
                                                <Flex direction="column" align="center" justify="center" gap="4">
                                                    <Text size="3" weight="bold" color="indigo">Electroválvula</Text>
                                                    <Box style={{
                                                        width: '100px', height: '100px', borderRadius: '50%',
                                                        border: valvula.abierta ? '3px solid #22c55e' : '3px solid var(--border-mockup)',
                                                        background: valvula.abierta ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center',
                                                        boxShadow: valvula.abierta ? '0 0 20px rgba(34, 197, 94, 0.25)' : 'none',
                                                        transition: 'all 0.3s'
                                                    } as any}>
                                                        <Text size="6" style={{ filter: valvula.abierta ? 'drop-shadow(0 0 8px #4ade80)' : 'none' }}>🚰</Text>
                                                        <Text size="1" weight="bold" style={{ color: valvula.abierta ? '#4ade80' : '#6b7280', marginTop: '4px', letterSpacing: '1px' }}>
                                                            {valvula.abierta ? 'ABIERTA' : 'CERRADA'}
                                                        </Text>
                                                    </Box>
                                                    <Button
                                                        color={valvula.abierta ? "red" : "green"}
                                                        variant="solid"
                                                        disabled={!valvula.id && !bomba.id}
                                                        onClick={handleToggleValvula}
                                                        style={{ cursor: 'pointer', width: '100%', maxWidth: '220px' }}
                                                    >
                                                        {valvula.abierta ? '⏹ Cerrar Válvula' : '▶ Abrir Válvula'}
                                                    </Button>
                                                    <Text size="1" color="gray" align="center" style={{ minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                                                        Apertura automática ante ausencia de agua en el tanque.
                                                    </Text>
                                                </Flex>
                                            </Card>
                                        </Grid>

                                        {!isActuadorFuncionando && (
                                            <Text size="1" color="red" align="center" style={{ marginTop: '8px' }} as="div">
                                                ⚠️ Dispositivo actuador apagado. Actívelo arriba en esta pestaña para poder encender la bomba.
                                            </Text>
                                        )}
                                        <Text size="1" color="gray" align="center" style={{ fontFamily: 'monospace', marginTop: '4px' }} as="div">
                                            Tiempo máximo del relé por evento: {bomba.timeoutMin} minutos
                                        </Text>
                                    </Flex>
                                </Card>
                            )}

                            {/* PANEL MODO PROGRAMADO */}
                            {selectedModo === 'programado' && (
                                <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                                    <Flex justify="between" align="center" mb="4">
                                        <Box>
                                            <Text size="4" weight="bold" color="indigo" mb="1" as="div">📅 Horarios Programados Activos</Text>
                                            <Text size="2" color="gray">Gestión del calendario de riego recurrente por horas fijas.</Text>
                                        </Box>
                                        <Dialog.Root>
                                            <Dialog.Trigger>
                                                <Button color="green" disabled={!bomba.id} style={{ cursor: 'pointer' }}>+ Agregar horario</Button>
                                            </Dialog.Trigger>
                                            <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
                                                <Dialog.Title style={{ color: 'white' }}>Nuevo Horario</Dialog.Title>
                                                <Flex direction="column" gap="3" mt="4">
                                                    <label><Text color="gray" size="2">Nombre del horario</Text></label>
                                                    <TextField.Root type="text" placeholder="Ej. Riego Matutino" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} style={{ background: 'var(--surface2-mockup)', color: 'white', border: '1px solid var(--border-mockup)' }} />

                                                    <label><Text color="gray" size="2">Hora de inicio</Text></label>
                                                    <TextField.Root type="time" value={nuevaHora} onChange={(e) => setNuevaHora(e.target.value)} style={{ background: 'var(--surface2-mockup)', color: 'white', border: '1px solid var(--border-mockup)' }} />

                                                    <Text color="gray" size="2">Duración (minutos)</Text>
                                                    <TextField.Root type="number" min="1" max={bomba.timeoutMin} value={nuevaDuracion} onChange={(e) => setNuevaDuracion(parseInt(e.target.value))} style={{ background: 'var(--surface2-mockup)', color: 'white', border: '1px solid var(--border-mockup)' }} />
                                                    <Text color="gray" size="1">Maximo permitido: {bomba.timeoutMin} minutos.</Text>

                                                    <Text color="gray" size="2">Días activos</Text>
                                                    <Flex gap="3" wrap="wrap">
                                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia, idx) => (
                                                            <Flex key={idx} align="center" gap="1">
                                                                <Checkbox checked={diasSel[idx]} onCheckedChange={(v) => { const n = [...diasSel]; n[idx] = v as boolean; setDiasSel(n); }} />
                                                                <Text color="indigo" size="2">{dia}</Text>
                                                            </Flex>
                                                        ))}
                                                    </Flex>
                                                </Flex>
                                                <Flex gap="3" mt="6" justify="end">
                                                    <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cancelar</Button></Dialog.Close>
                                                    <Dialog.Close><Button color="green" onClick={handleGuardarHorario} style={{ cursor: 'pointer' }}>Guardar</Button></Dialog.Close>
                                                </Flex>
                                            </Dialog.Content>
                                        </Dialog.Root>
                                    </Flex>

                                    {horarios.length === 0 ? (
                                        <Text color="gray" size="2" as="div" style={{ padding: '12px 0' }}>No tienes horarios programados para este cultivo.</Text>
                                    ) : (
                                        <ScrollArea type="auto" scrollbars="horizontal">
                                            <Grid columns="1.5fr 1fr 2fr 1.2fr 1.2fr" gap="3" style={{ minWidth: '600px' }}>
                                                <Text size="1" weight="bold" style={{ color: '#6b7280' }}>NOMBRE</Text>
                                                <Text size="1" weight="bold" style={{ color: '#6b7280' }}>HORA</Text>
                                                <Text size="1" weight="bold" style={{ color: '#6b7280' }}>DÍAS</Text>
                                                <Text size="1" weight="bold" style={{ color: '#6b7280' }}>DURACIÓN</Text>
                                                <Text size="1" weight="bold" style={{ color: '#6b7280' }}>ACCIONES</Text>

                                                {horarios.map((h: any) => {
                                                    const strDias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].filter((_, i) => h.dias[i]).join(' - ');
                                                    return (
                                                        <React.Fragment key={h.id}>
                                                            <Text size="2" color="indigo" weight="bold" style={{ alignSelf: 'center' }}>{h.nombre}</Text>
                                                            <Text size="3" color="indigo" weight="bold" style={{ alignSelf: 'center' }}>{h.hora}</Text>
                                                            <Text size="2" color="gray" style={{ alignSelf: 'center' }}>{strDias || 'Ninguno'}</Text>
                                                            <Text size="2" color="gray" style={{ alignSelf: 'center' }}>{h.duracionMin} min</Text>
                                                            <Flex gap="3" align="center">
                                                                <Switch size="1" checked={h.activo} onCheckedChange={(v) => handleToggleHorario(h.id, v)} style={{ cursor: 'pointer' }} />
                                                                <Button size="1" color="red" variant="soft" onClick={() => handleEliminarHorario(h.id)} style={{ cursor: 'pointer' }}>Borrar</Button>
                                                            </Flex>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </Grid>
                                        </ScrollArea>
                                    )}
                                </Card>
                            )}

                            {/* PANEL MODO PREDICTIVO */}
                            {selectedModo === 'predictivo' && (
                                <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                                    <Flex direction="column" gap="4">
                                        <Box>
                                            <Text size="4" weight="bold" color="indigo" mb="1" as="div">🧠 Selección de Modelo Inteligente (ML)</Text>
                                            <Text size="2" color="gray">Elige el algoritmo entrenado para gestionar el riego en base a las lecturas del suelo.</Text>
                                        </Box>

                                        <Flex direction="column" gap="3" mt="1">
                                            {modelosML && modelosML.length > 0 ? (
                                                modelosML.map((m: any) => {
                                                    const isRF = m.algoritmo?.toLowerCase().includes('random') || 
                                                                 m.nombre_modelo?.toLowerCase().includes('random') || 
                                                                 m.algoritmo?.toLowerCase().includes('rf');
                                                    return (
                                                        <Card
                                                            key={m.id_modelo}
                                                            style={{
                                                                background: m.activo ? 'rgba(139, 92, 246, 0.03)' : 'var(--surface2-mockup)',
                                                                borderColor: m.activo ? '#a855f7' : 'var(--border-mockup)',
                                                                borderWidth: m.activo ? '2px' : '1px',
                                                                borderRadius: '12px',
                                                                padding: '12px',
                                                                transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            <Flex justify="between" align="center" wrap="wrap" gap="3">
                                                                <Box style={{ flex: '1 1 auto' }}>
                                                                    <Flex align="center" gap="2" mb="1">
                                                                         <Text size="3" weight="bold" style={{ color: 'white' }}>{m.nombre_modelo}</Text>
                                                                         {isRF && <Badge color="indigo">Defecto / Recomendado</Badge>}
                                                                         {m.activo && <Badge color="purple">Activo</Badge>}
                                                                    </Flex>
                                                                    <Text size="2" color="gray" style={{ display: 'block', marginBottom: '2px' }}>
                                                                        Algoritmo: <span style={{ color: '#d1d5db' }}>{m.algoritmo}</span> · Versión: <span style={{ color: '#d1d5db' }}>{m.version || '1.0.0'}</span>
                                                                    </Text>
                                                                    {m.descripcion && (
                                                                        <Text size="1" color="gray" style={{ display: 'block', fontStyle: 'italic', marginBottom: '2px' }}>
                                                                            {m.descripcion}
                                                                        </Text>
                                                                    )}
                                                                    {m.precision_modelo !== null && (
                                                                        <Text size="1" color="gray" style={{ display: 'block' }}>
                                                                            Precisión del modelo: <span style={{ color: '#c084fc', fontWeight: 'bold' }}>{(m.precision_modelo * 100).toFixed(1)}%</span>
                                                                        </Text>
                                                                    )}
                                                                </Box>
                                                                <Button
                                                                    color="purple"
                                                                    variant={m.activo ? "solid" : "soft"}
                                                                    disabled={m.activo}
                                                                    onClick={() => handleSelectModel(m.id_modelo)}
                                                                    style={{ cursor: m.activo ? 'default' : 'pointer' }}
                                                                >
                                                                    {m.activo ? 'Seleccionado' : 'Seleccionar'}
                                                                </Button>
                                                            </Flex>
                                                        </Card>
                                                    );
                                                })
                                            ) : (
                                                <Text color="gray" size="2">No hay modelos de ML registrados en el sistema.</Text>
                                            )}
                                        </Flex>
                                    </Flex>
                                </Card>
                            )}
                        </Flex>
                    </Tabs.Content>
                </Tabs.Root>

                {/* COLUMNA DERECHA: LOG DE EVENTOS (Solo visible para Admin) */}
                {seguridad.esAdmin && (
                    <Box>
                        <Card size="4" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Text size="3" weight="bold" color="indigo" mb="5" as="div">Log de auditoría del sistema</Text>

                            {/* VISTA RESUMIDA (3 Columnas, 5 Filas máximo) */}
                            <Box style={{ flexGrow: 1 }}>
                                <Grid columns="1.5fr 1.5fr 2fr" gap="3" mb="3">
                                    <Text size="1" weight="bold" style={{ color: '#6b7280' }}>FECHA (LIMA)</Text>
                                    <Text size="1" weight="bold" style={{ color: '#6b7280' }}>MÓDULO</Text>
                                    <Text size="1" weight="bold" style={{ color: '#6b7280' }}>ACCIÓN</Text>
                                </Grid>

                                {logs.slice(0, 5).map((l: any) => (
                                    <Grid key={`resumen_${l.id}`} columns="1.5fr 1.5fr 2fr" gap="3" py="3" style={{ borderBottom: '1px solid var(--border-mockup)' }}>
                                        <Text size="2" color="indigo" style={{ fontFamily: 'monospace' }}>{l.fecha}</Text>
                                        <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>{l.modulo}</Text>
                                        <Text size="2" weight="bold" style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{l.accion}</Text>
                                    </Grid>
                                ))}
                            </Box>

                            {/* BOTÓN Y MODAL (Tabla Completa) */}
                            <Dialog.Root>
                                <Dialog.Trigger>
                                    <Button variant="outline" color="gray" style={{ width: '100%', marginTop: '20px', borderColor: 'var(--border-mockup)', color: '#d1d5db', cursor: 'pointer' }}>
                                        Ver más detalles
                                    </Button>
                                </Dialog.Trigger>

                                <Dialog.Content style={{ maxWidth: 850, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
                                    <Dialog.Title style={{ color: 'white' }}>Log completo de auditoría</Dialog.Title>
                                    <Dialog.Description size="2" mb="4" style={{ color: '#9ca3af' }}>
                                        Historial detallado de eventos del sistema y acciones manuales registradas.
                                    </Dialog.Description>

                                    <ScrollArea scrollbars="horizontal" style={{ width: '100%' }}>
                                        <Box style={{ minWidth: '700px', background: 'var(--bg-mockup)', borderRadius: '8px', padding: '12px' }}>
                                            <Grid columns="1.5fr 1fr 2fr 3fr 1fr" gap="3" mb="3" px="2">
                                                <Text size="1" weight="bold" style={{ color: '#6b7280' }}>FECHA (LIMA)</Text>
                                                <Text size="1" weight="bold" style={{ color: '#6b7280' }}>MÓDULO</Text>
                                                <Text size="1" weight="bold" style={{ color: '#6b7280' }}>ACCIÓN</Text>
                                                <Text size="1" weight="bold" style={{ color: '#6b7280' }}>DESCRIPCIÓN</Text>
                                                <Text size="1" weight="bold" style={{ color: '#6b7280' }}>IP</Text>
                                            </Grid>

                                            <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: '400px', paddingRight: '10px' }}>
                                                {logs.map((l: any) => (
                                                    <Grid key={`full_${l.id}`} columns="1.5fr 1fr 2fr 3fr 1fr" gap="3" py="3" px="2" style={{ borderBottom: '1px solid var(--border-mockup)' }}>
                                                        <Text size="2" color="indigo" style={{ fontFamily: 'monospace' }}>{l.fecha}</Text>
                                                        <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>{l.modulo}</Text>
                                                        <Text size="2" weight="bold" style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{l.accion}</Text>
                                                        <Text size="2" color="gray" style={{ fontFamily: 'monospace', lineHeight: '1.2' }}>{l.descripcion}</Text>
                                                        <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>{l.ip_acceso}</Text>
                                                    </Grid>
                                                ))}
                                            </ScrollArea>
                                        </Box>
                                    </ScrollArea>

                                    <Flex mt="5" justify="end">
                                        <Dialog.Close>
                                            <Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cerrar tabla</Button>
                                        </Dialog.Close>
                                    </Flex>
                                </Dialog.Content>
                            </Dialog.Root>

                        </Card>
                    </Box>
                )}
            </Grid>

            {/* MODAL DE CALIBRACIÓN REMOTA */}
            <Dialog.Root open={calibDevId !== null} onOpenChange={(open) => !open && setCalibDevId(null)}>
                <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 400, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
                    <Dialog.Title style={{ color: 'white' }}>Calibración de Sensor</Dialog.Title>
                    <Text size="2" color="gray" mb="4">
                        Ajuste de offset de calibración remota para el sensor <span style={{ color: 'white', fontWeight: 'bold' }}>{calibSensorName}</span> en pin GPIO {calibPin}.
                    </Text>

                    <Flex direction="column" gap="3" mt="3">
                        <label><Text color="gray" size="2">Offset de Compensación</Text></label>
                        <TextField.Root 
                            type="text" 
                            placeholder="Ej: -2.5 o 1.2" 
                            value={calibOffset} 
                            onChange={(e) => setCalibOffset(e.target.value)} 
                            style={{ background: 'var(--surface2-mockup)', color: 'white', border: '1px solid var(--border-mockup)' }} 
                        />
                        <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>
                            Nota: Este valor se enviará al firmware del ESP32 vía MQTT para sumar/restar a la lectura bruta.
                        </Text>
                    </Flex>

                    <Flex gap="3" mt="5" justify="end">
                        <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cancelar</Button></Dialog.Close>
                        <Button color="green" onClick={handleCalibrateSensorSubmit} style={{ cursor: 'pointer' }}>
                            Enviar Calibración
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

        </Box>
    );
}
