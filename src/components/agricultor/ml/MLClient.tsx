// src/components/agricultor/ml/MLClient.tsx
"use client";

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { Box, Text, Flex, Card, Button, Badge, ScrollArea, Grid } from '@radix-ui/themes';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Legend } from 'recharts';
import { solicitarPrediccionML, reentrenarModeloML, seleccionarModeloML } from '@/actions/ml';
import { useRouter } from 'next/navigation';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function MLClient({ data, cultivos, idCultivo, isAdmin = false }: any) {
  const { modelo, modelos, historial, umbral, predicciones } = data;
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(0);

  // Pagination states for Inferences
  const [currentPageInferences, setCurrentPageInferences] = useState(1);
  const pageSizeInferences = 10;

  useEffect(() => {
    setCurrentPageInferences(1);
  }, [idCultivo]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setChartWidth(Math.max(0, Math.floor(container.clientWidth)));
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const [simInputs, setSimInputs] = useState({
    humedad_suelo: '35.0',
    humedad_ambiente: '60.0',
    temperatura_ambiente: '25.0',
    temperatura_suelo: '22.0'
  });
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const handleSelectModel = async (modelIdStr: string) => {
    setLoading(true);
    const modelId = parseInt(modelIdStr, 10);
    const res = await seleccionarModeloML(modelId, idCultivo);
    setLoading(false);
    if (res.success) {
      router.refresh();
    } else {
      alert(`❌ Error al seleccionar modelo: ${res.error}`);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    setSimResult(null);
    setSimError(null);

    const payload = {
      humedad_suelo: parseFloat(simInputs.humedad_suelo),
      humedad_ambiente: parseFloat(simInputs.humedad_ambiente),
      temperatura_ambiente: parseFloat(simInputs.temperatura_ambiente),
      temperatura_suelo: parseFloat(simInputs.temperatura_suelo)
    };

    if (isNaN(payload.humedad_suelo) || isNaN(payload.humedad_ambiente) || isNaN(payload.temperatura_ambiente) || isNaN(payload.temperatura_suelo)) {
      setSimError("Por favor, ingresa valores numéricos válidos en todos los campos.");
      setSimLoading(false);
      return;
    }

    const res = await solicitarPrediccionML(payload, idCultivo);
    setSimLoading(false);

    if (res.success && res.data) {
      setSimResult(res.data);
    } else {
      setSimError(res.error || "No se pudo obtener la predicción. Asegúrate de que el modelo esté entrenado y activo para este cultivo.");
    }
  };

  const handleRetrain = async () => {
    setLoading(true);
    const res = await reentrenarModeloML();
    setLoading(false);
    if (res.success) {
      alert("✅ Tarea de reentrenamiento encolada. El modelo se actualizará en segundo plano en unos momentos.");
      router.refresh();
    } else {
      alert(`❌ Error al solicitar reentrenamiento: ${res.error}`);
    }
  };

  const handleFastAPIRequest = async () => {
    setLoading(true);
    setPrediction(null);

    // Obtener las últimas lecturas como variables de entrada
    const ultimoRegistro = historial && historial.length > 0 ? historial[historial.length - 1] : null;
    const payload = {
      humedad_suelo: ultimoRegistro ? Number(ultimoRegistro.humSuelo) : 45.0,
      humedad_ambiente: ultimoRegistro ? Number(ultimoRegistro.humAmb) : 60.0,
      temperatura_ambiente: ultimoRegistro ? Number(ultimoRegistro.tempAmb) : 22.0,
      temperatura_suelo: ultimoRegistro ? Number(ultimoRegistro.tempSuelo) : 18.0
    };

    const res = await solicitarPrediccionML(payload);
    setLoading(false);

    if (res.success && res.data) {
      setPrediction(res.data);
    } else {
      alert(`❌ Error al conectar con FastAPI: ${res.error}`);
    }
  };

  return (
    <Box style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {/* HEADER: Metadatos extraídos de la Base de Datos */}
      <Flex justify="between" align="start" mb="6" wrap="wrap" gap="4">
        <Box>
          <Flex align="center" gap="4" mb="3">
            <Text size="6" weight="bold" color="indigo" as="div">Machine Learning</Text>
            {cultivos && cultivos.length > 0 && idCultivo && (
              <SearchableSelect
                value={idCultivo.toString()}
                onValueChange={(v) => startTransition(() => router.push(`?cultivo=${v}`))}
                placeholder="Seleccionar cultivo"
                searchPlaceholder="Buscar cultivo..."
                style={{ background: '#111827', borderColor: '#1f2937', width: 240 }}
                options={cultivos.map((c: any) => ({ value: c.id.toString(), label: c.nombre_planta }))}
              />
            )}
          </Flex>
          <Text size="3" style={{ color: '#9ca3af', fontFamily: 'monospace' }}>
            {modelo.algoritmo} · {modelo.nombre} v{modelo.version} · 4 features + hora del día · MAE {modelo.mae}%
          </Text>
          
          <Flex gap="2" mt="4" wrap="wrap">
            <Text size="2" color="gray" mr="2" style={{ alignSelf: 'center' }}>Features del modelo:</Text>
            <Badge color="green" variant="outline">Hum. suelo</Badge>
            <Badge color="blue" variant="outline">Hum. ambiental</Badge>
            <Badge color="orange" variant="outline">Temp. ambiental</Badge>
            <Badge color="sky" variant="outline">Temp. suelo</Badge>
            <Badge color="gray" variant="outline">Hora del día</Badge>
          </Flex>
        </Box>

        <Flex gap="3" align="center">
          {modelo.activo ? (
            <Badge color="purple" size="2" style={{ padding: '6px 12px', borderRadius: '8px' }}>
              🧠 Modelo activo
            </Badge>
          ) : (
            <Badge color="gray" size="2">Modelo inactivo</Badge>
          )}
          {isAdmin && (
            <Button variant="outline" color="gray" onClick={handleRetrain} disabled={loading} style={{ cursor: 'pointer' }}>
              {loading ? 'Procesando...' : 'Reentrenar modelo'}
            </Button>
          )}
        </Flex>
      </Flex>

      {/* GRÁFICO PRINCIPAL */}
      <Card size="4" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
        <Flex justify="between" mb="5">
          <Text size="4" weight="bold" color="indigo">Predicción y telemetría de parámetros</Text>
          <Text size="2" color="gray">Próximas 2 horas (FastAPI)</Text>
        </Flex>

        <Box ref={chartContainerRef} style={{ width: '100%', height: '350px', minWidth: 0, position: 'relative' }}>
          {chartWidth > 0 && (
            <LineChart width={chartWidth} height={350} data={historial} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-mockup)" vertical={false} />
              
              <XAxis dataKey="hora" stroke="#4b5563" fontSize={12} tickMargin={10} />
              
              {/* Eje Y para Humedad (%) */}
              <YAxis yAxisId="humedad" stroke="#4b5563" fontSize={12} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
              
              {/* Eje Y para Temperatura (°C) */}
              <YAxis yAxisId="temperatura" orientation="right" stroke="#4b5563" fontSize={12} tickFormatter={(val) => `${val}°`} domain={[0, 50]} />
              
              <Tooltip 
                contentStyle={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', borderRadius: '8px', color: '#fff' }} 
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />

              {/* Línea de Umbral Crítico Mínimo de Humedad */}
              <ReferenceLine y={umbral} yAxisId="humedad" stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: `${umbral}% mín`, fill: '#ef4444', fontSize: 12 }} />

              {/* Líneas de datos reales */}
              <Line yAxisId="humedad" type="monotone" dataKey="humSuelo" name="Hum. Suelo Real" stroke="#22c55e" strokeWidth={3} dot={false} />
              <Line yAxisId="humedad" type="monotone" dataKey="humAmb" name="Hum. Ambiental" stroke="#2dd4bf" strokeWidth={2} dot={false} />
              <Line yAxisId="temperatura" type="monotone" dataKey="tempAmb" name="Temp. Ambiental" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line yAxisId="temperatura" type="monotone" dataKey="tempSuelo" name="Temp. Suelo" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </Box>

        {/* INTEGRACIÓN FASTAPI */}
        <Flex justify="between" align="center" mt="5" p="4" style={{ background: 'rgba(167, 139, 250, 0.05)', border: '1px solid rgba(167, 139, 250, 0.2)', borderRadius: '12px' }}>
          <Flex gap="4" align="center">
            <Text size="8" style={{ filter: 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.5))' }}>🧠</Text>
            <Box>
              <Text color="purple" weight="bold" as="div" mb="1">Predicción del modelo (FastAPI)</Text>
              {prediction ? (
                <Text color="green" size="2" weight="bold" style={{ fontFamily: 'monospace' }}>
                  Resultado: {prediction.mensaje} (Riego: {prediction.riego === 1 ? 'ON' : 'OFF'}) · Probabilidad: {prediction.probabilidad_riego !== null ? `${(prediction.probabilidad_riego * 100).toFixed(1)}%` : 'N/A'}
                </Text>
              ) : (
                <Text color="gray" size="2">
                  {loading ? 'Consultando al microservicio de FastAPI en tiempo real...' : 'Generar proyecciones futuras y evaluar estrés hídrico mediante el BFF.'}
                </Text>
              )}
            </Box>
          </Flex>
          <Button color="purple" variant="soft" onClick={handleFastAPIRequest} disabled={loading} style={{ cursor: 'pointer' }}>
            {loading ? 'Cargando...' : 'Solicitar predicción'}
          </Button>
        </Flex>
      </Card>

      {/* SIMULADOR DE INFERENCIA MANUAL */}
      <Card size="3" mt="6" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
        <Flex justify="between" align="center" mb="4" wrap="wrap" gap="4">
          <Box>
            <Text size="4" weight="bold" color="indigo" as="div">
              Simulador de Riego Inteligente (Entrada Manual)
            </Text>
            <Text size="2" color="gray">
              Prueba el comportamiento del modelo activo para <strong>{cultivos?.find((c: any) => c.id === idCultivo)?.nombre_planta || 'este cultivo'}</strong>.
            </Text>
          </Box>
          <Flex gap="3" align="center">
            <Text size="2" color="gray">Modelo Activo:</Text>
            {modelos && modelos.length > 0 ? (
              <SearchableSelect
                value={modelos.find((m: any) => m.activo)?.id_modelo?.toString() || ""}
                onValueChange={handleSelectModel}
                disabled={loading}
                placeholder="Seleccionar modelo"
                searchPlaceholder="Buscar modelo..."
                style={{ background: '#1f2937', borderColor: '#374151', minWidth: 260 }}
                options={modelos.map((m: any) => ({
                  value: m.id_modelo.toString(),
                  label: `${m.nombre_modelo} (v${m.version} - Acc: ${m.precision_modelo?.toFixed(1)}%)`,
                }))}
              />
            ) : (
              <Badge color="indigo" variant="outline" size="2">
                Modelo: {modelo.nombre || 'Sin nombre'} v{modelo.version}
              </Badge>
            )}
          </Flex>
        </Flex>

        <form onSubmit={handleSimulate}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>
                Humedad del Suelo (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={simInputs.humedad_suelo}
                onChange={(e) => setSimInputs({ ...simInputs, humedad_suelo: e.target.value })}
                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition-all"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>
                Humedad Ambiental (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={simInputs.humedad_ambiente}
                onChange={(e) => setSimInputs({ ...simInputs, humedad_ambiente: e.target.value })}
                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition-all"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>
                Temperatura Ambiente (°C)
              </label>
              <input
                type="number"
                step="0.1"
                min="-10"
                max="60"
                value={simInputs.temperatura_ambiente}
                onChange={(e) => setSimInputs({ ...simInputs, temperatura_ambiente: e.target.value })}
                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition-all"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>
                Temperatura del Suelo (°C)
              </label>
              <input
                type="number"
                step="0.1"
                min="-10"
                max="60"
                value={simInputs.temperatura_suelo}
                onChange={(e) => setSimInputs({ ...simInputs, temperatura_suelo: e.target.value })}
                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition-all"
                required
              />
            </div>
          </div>

          <Flex justify="end" gap="3">
            <Button
              type="submit"
              color="indigo"
              size="3"
              disabled={simLoading}
              style={{ cursor: 'pointer', borderRadius: '8px', padding: '0 24px', fontWeight: 'bold' }}
            >
              {simLoading ? 'Simulando...' : '💡 Ejecutar Simulación'}
            </Button>
          </Flex>
        </form>

        {simError && (
          <Box mt="4" p="3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
            <Text color="red" size="2">{simError}</Text>
          </Box>
        )}

        {simResult && (
          <Box mt="5" p="4" style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px' }}>
            <Text size="3" weight="bold" color="indigo" mb="3" as="div">
              Resultado de la Predicción
            </Text>
            <Flex gap="4" align="center" wrap="wrap">
              <Box style={{ flex: '1 1 200px' }}>
                <Flex align="center" gap="3" mb="2">
                  <Text size="3" color="gray">Recomendación:</Text>
                  <Badge
                    color={simResult.riego === 1 ? 'green' : 'orange'}
                    size="3"
                    variant="solid"
                    style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold' }}
                  >
                    {simResult.riego === 1 ? '💧 REGAR' : '🚫 NO REGAR'}
                  </Badge>
                </Flex>
                <Text size="2" color="gray" style={{ display: 'block', marginBottom: '8px' }}>
                  {simResult.mensaje}
                </Text>
                {simResult.probabilidad_riego !== null && (
                  <Box>
                    <Flex justify="between" mb="1">
                      <Text size="1" color="gray">Confianza del modelo:</Text>
                      <Text size="1" weight="bold" color="indigo">{(simResult.probabilidad_riego * 100).toFixed(1)}%</Text>
                    </Flex>
                    <Box style={{ width: '100%', height: '6px', background: '#374151', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                      <Box
                        style={{
                          width: `${simResult.probabilidad_riego * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease-in-out'
                        }}
                      />
                    </Box>
                    <Text size="1" color="gray" style={{ display: 'block', fontStyle: 'italic', lineHeight: '1.3' }}>
                      La confianza indica la probabilidad de que el cultivo necesite riego. Un valor cercano a 100% significa que es urgente regar; valores bajos cercanos a 0% indican que tiene humedad suficiente y no se debe regar.
                    </Text>
                  </Box>
                )}
              </Box>

              <Box style={{ flex: '1 1 250px', borderLeft: '1px solid #374151', paddingLeft: '20px' }}>
                <Text size="2" color="gray" as="div">
                  <strong>Modelo Utilizado:</strong> {simResult.modelo_activo}
                </Text>
              </Box>
            </Flex>
          </Box>
        )}
      </Card>

      {/* HISTORIAL DE PREDICCIONES E INFERENCIA */}
      <Card size="3" mt="6" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
        <Text size="4" weight="bold" color="indigo" mb="4" as="div">
          Historial de Decisiones e Inferencia del Modelo
        </Text>
        
        {!predicciones || predicciones.length === 0 ? (
          <Box p="4" style={{ textAlign: 'center' }}>
            <Text color="gray" size="2">No hay registros de inferencia previos para este cultivo.</Text>
          </Box>
        ) : (
          <>
            <ScrollArea scrollbars="horizontal" style={{ width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-mockup)' }}>
                    <th style={{ padding: '12px 8px', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hora</th>
                    <th style={{ padding: '12px 8px', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Variables de Entrada</th>
                    <th style={{ padding: '12px 8px', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recomendación</th>
                    <th style={{ padding: '12px 8px', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confianza</th>
                    <th style={{ padding: '12px 8px', color: '#9ca3af', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resultado en Campo</th>
                  </tr>
                </thead>
                <tbody>
                  {predicciones.slice((currentPageInferences - 1) * pageSizeInferences, currentPageInferences * pageSizeInferences).map((p: any) => {
                    const esRiego = p.recomendacion === 'regar';
                    const detalles = p.riego_detalles;
                    
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-mockup)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        {/* 1. Hora */}
                        <td style={{ padding: '14px 8px', whiteSpace: 'nowrap' }}>
                          <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
                            {p.fecha} {p.hora}
                          </Text>
                        </td>
                        
                        {/* 2. Variables */}
                        <td style={{ padding: '14px 8px' }}>
                          <Flex gap="2" wrap="wrap">
                            <Badge color="green" variant="soft" style={{ fontSize: '0.75rem' }}>
                              H.Suelo: {p.variables.humedad_suelo !== null ? `${Number(p.variables.humedad_suelo).toFixed(1)}%` : 'N/A'}
                            </Badge>
                            <Badge color="blue" variant="soft" style={{ fontSize: '0.75rem' }}>
                              H.Amb: {p.variables.humedad_ambiente !== null ? `${Number(p.variables.humedad_ambiente).toFixed(1)}%` : 'N/A'}
                            </Badge>
                            <Badge color="orange" variant="soft" style={{ fontSize: '0.75rem' }}>
                              T.Amb: {p.variables.temperatura_ambiente !== null ? `${Number(p.variables.temperatura_ambiente).toFixed(1)}%` : 'N/A'}
                            </Badge>
                            <Badge color="sky" variant="soft" style={{ fontSize: '0.75rem' }}>
                              T.Suelo: {p.variables.temperatura_suelo !== null ? `${Number(p.variables.temperatura_suelo).toFixed(1)}%` : 'N/A'}
                            </Badge>
                          </Flex>
                        </td>
                        
                        {/* 3. Recomendación */}
                        <td style={{ padding: '14px 8px' }}>
                          <Badge color={esRiego ? 'purple' : 'gray'} variant="solid" style={{ borderRadius: '6px', padding: '3px 8px' }}>
                            {esRiego ? '💧 Regar' : '🚫 No regar'}
                          </Badge>
                        </td>
                        
                        {/* 4. Confianza */}
                        <td style={{ padding: '14px 8px' }}>
                          <Text size="2" weight="bold" color={esRiego ? 'purple' : 'gray'} style={{ fontFamily: 'monospace' }}>
                            {p.probabilidad !== null ? `${(p.probabilidad * 100).toFixed(1)}%` : '—'}
                          </Text>
                        </td>
                        
                        {/* 5. Riego detalles */}
                        <td style={{ padding: '14px 8px' }}>
                          {p.ejecutado ? (
                            detalles ? (
                              <Badge color={detalles.estado ? "green" : "orange"} variant="outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {detalles.estado ? '✅ Riego: ' : '⌛ Riego en curso: '}
                                {detalles.cantidad_agua_litros !== null ? `${detalles.cantidad_agua_litros}L` : '--'} / {detalles.duracion_segundos !== null ? `${Math.round(detalles.duracion_segundos / 60)}min` : '--'}
                                {detalles.motivo_cierre && ` (${detalles.motivo_cierre})`}
                              </Badge>
                            ) : (
                              <Badge color="green" variant="outline">
                                ✅ Orden de Riego Enviada
                              </Badge>
                            )
                          ) : esRiego ? (
                            <Badge color="red" variant="outline">
                              ❌ Riego abortado / no ejecutado
                            </Badge>
                          ) : (
                            <Text size="2" color="gray">—</Text>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>

            {/* Controles de Paginación para Inferencias */}
            {predicciones.length > pageSizeInferences && (
              <Flex justify="between" align="center" mt="4" px="2">
                <Text size="2" color="gray">
                  Mostrando {Math.min((currentPageInferences - 1) * pageSizeInferences + 1, predicciones.length)} a {Math.min(currentPageInferences * pageSizeInferences, predicciones.length)} de {predicciones.length} registros
                </Text>
                <Flex gap="1">
                  <Button 
                    size="1" 
                    variant="soft" 
                    color="gray" 
                    onClick={() => setCurrentPageInferences(1)} 
                    disabled={currentPageInferences === 1}
                    style={{ cursor: 'pointer' }}
                  >
                    «
                  </Button>
                  <Button 
                    size="1" 
                    variant="soft" 
                    color="gray" 
                    onClick={() => setCurrentPageInferences(prev => Math.max(prev - 1, 1))} 
                    disabled={currentPageInferences === 1}
                    style={{ cursor: 'pointer' }}
                  >
                    ‹
                  </Button>
                  <Flex align="center" px="2" style={{ background: '#1e293b', borderRadius: '4px', height: '24px' }}>
                    <Text size="1" weight="bold" style={{ color: 'white' }}>
                      {currentPageInferences} / {Math.ceil(predicciones.length / pageSizeInferences)}
                    </Text>
                  </Flex>
                  <Button 
                    size="1" 
                    variant="soft" 
                    color="gray" 
                    onClick={() => setCurrentPageInferences(prev => Math.min(prev + 1, Math.ceil(predicciones.length / pageSizeInferences)))} 
                    disabled={currentPageInferences === Math.ceil(predicciones.length / pageSizeInferences)}
                    style={{ cursor: 'pointer' }}
                  >
                    ›
                  </Button>
                  <Button 
                    size="1" 
                    variant="soft" 
                    color="gray" 
                    onClick={() => setCurrentPageInferences(Math.ceil(predicciones.length / pageSizeInferences))} 
                    disabled={currentPageInferences === Math.ceil(predicciones.length / pageSizeInferences)}
                    style={{ cursor: 'pointer' }}
                  >
                    »
                  </Button>
                </Flex>
              </Flex>
            )}
          </>
        )}
      </Card>

      {/* COMPARATIVA DE FASES DEL EXPERIMENTO */}
      <Card size="3" mt="6" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
        <Flex justify="between" align="center" mb="4">
          <Text size="4" weight="bold" color="indigo">Comparativa de fases del experimento</Text>
        </Flex>
        
        <Grid columns={{ initial: '1', md: '2' }} gap="5">
          {/* Litros consumidos / día */}
          <Box>
            <Text size="2" color="gray" mb="3" as="div" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '10px' }}>
              Litros consumidos / día (promedio)
            </Text>
            
            {/* Manual */}
            <Box mb="3">
              <Flex justify="between" mb="1" style={{ fontSize: '11px' }}>
                <Text color="gray" style={{ fontFamily: 'var(--font-mono)' }}>Fase 1: Manual</Text>
                <Text weight="bold" style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>2.8 L</Text>
              </Flex>
              <div style={{ height: '8px', background: 'var(--dim-mockup)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '100%', background: 'var(--red)', opacity: 0.8 }} />
              </div>
            </Box>

            {/* Reactivo */}
            <Box mb="3">
              <Flex justify="between" mb="1" style={{ fontSize: '11px' }}>
                <Text color="gray" style={{ fontFamily: 'var(--font-mono)' }}>Fase 2: Reactivo / Programado</Text>
                <Text weight="bold" style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>1.4 L</Text>
              </Flex>
              <div style={{ height: '8px', background: 'var(--dim-mockup)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '50%', background: 'var(--amber)' }} />
              </div>
            </Box>

            {/* ML */}
            <Box>
              <Flex justify="between" mb="1" style={{ fontSize: '11px' }}>
                <Text color="gray" style={{ fontFamily: 'var(--font-mono)' }}>Fase 3: ML predictivo</Text>
                <Text weight="bold" style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>0.9 L</Text>
              </Flex>
              <div style={{ height: '8px', background: 'var(--dim-mockup)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '32%', background: 'var(--green)' }} />
              </div>
            </Box>
          </Box>

          {/* Tiempo en estrés hídrico */}
          <Box>
            <Text size="2" color="gray" mb="3" as="div" style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '10px' }}>
              Tiempo en estrés hídrico (%)
            </Text>
            
            {/* Manual */}
            <Box mb="3">
              <Flex justify="between" mb="1" style={{ fontSize: '11px' }}>
                <Text color="gray" style={{ fontFamily: 'var(--font-mono)' }}>Fase 1: Manual</Text>
                <Text weight="bold" style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>18.4%</Text>
              </Flex>
              <div style={{ height: '8px', background: 'var(--dim-mockup)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '100%', background: 'var(--red)', opacity: 0.8 }} />
              </div>
            </Box>

            {/* Reactivo */}
            <Box mb="3">
              <Flex justify="between" mb="1" style={{ fontSize: '11px' }}>
                <Text color="gray" style={{ fontFamily: 'var(--font-mono)' }}>Fase 2: Reactivo / Programado</Text>
                <Text weight="bold" style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>8.1%</Text>
              </Flex>
              <div style={{ height: '8px', background: 'var(--dim-mockup)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '44%', background: 'var(--amber)' }} />
              </div>
            </Box>

            {/* ML */}
            <Box>
              <Flex justify="between" mb="1" style={{ fontSize: '11px' }}>
                <Text color="gray" style={{ fontFamily: 'var(--font-mono)' }}>Fase 3: ML predictivo</Text>
                <Text weight="bold" style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>2.3%</Text>
              </Flex>
              <div style={{ height: '8px', background: 'var(--dim-mockup)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '12%', background: 'var(--green)' }} />
              </div>
            </Box>
          </Box>
        </Grid>

        {/* Resumen de KPIs */}
        <Grid columns={{ initial: '1', sm: '3' }} gap="3" mt="5">
          <div style={{ padding: '12px', background: 'var(--greenbg)', border: '1px solid var(--greenbrd)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>67%</div>
            <div style={{ fontSize: '9px', color: 'var(--green)', fontFamily: 'var(--font-mono)', marginTop: '2px', lineHeight: '1.2' }}>
              Ahorro de agua<br/>ML vs Manual
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--purplebg)', border: '1px solid var(--purplebrd)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--purple)' }}>87.5%</div>
            <div style={{ fontSize: '9px', color: 'var(--purple)', fontFamily: 'var(--font-mono)', marginTop: '2px', lineHeight: '1.2' }}>
              Reducción de estrés<br/>ML vs Manual
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--amberbg)', border: '1px solid var(--amberbrd)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>3.8%</div>
            <div style={{ fontSize: '9px', color: 'var(--amber)', fontFamily: 'var(--font-mono)', marginTop: '2px', lineHeight: '1.2' }}>
              MAE del modelo<br/>en validación
            </div>
          </div>
        </Grid>
      </Card>
    </Box>
  );
}
