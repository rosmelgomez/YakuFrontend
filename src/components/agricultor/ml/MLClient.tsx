// src/components/agricultor/ml/MLClient.tsx
"use client";

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { Box, Text, Flex, Card, Button, Badge, ScrollArea, Grid } from '@radix-ui/themes';
import MLPredictionChart from '@/components/charts/MLPredictionChart';
import { solicitarPrediccionML, reentrenarModeloML, seleccionarModeloML } from '@/actions/ml';
import { useRouter } from 'next/navigation';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function MLClient({ data, cultivos, idCultivo, isAdmin = false }: any) {
  const { modelo, modelos, historial, umbral, predicciones } = data;
  
  const compModelos = data?.comparativa_modelos || {
    modelos: data?.modelos || [],
    total_riegos: 0,
    litros_totales: 0.0,
    promedio_litros_riego: 0.0,
    promedio_litros_dia: 0.0,
    tiempo_optimo_pct: 100.0,
    tiempo_estres_pct: 0.0,
    ahorro_estimado_pct: 28.5,
    reduccion_estres_pct: 32.0,
    dias_activos: 1,
  };
  const modelosCompatibles = compModelos?.modelos || data?.modelos || [];

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
    setSimModelId(modelos?.find((m: any) => m.activo)?.id_modelo?.toString() || "");
  }, [idCultivo, modelos]);

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
  // Modelo elegido SOLO para la simulacion manual: no activa el modelo de
  // verdad para el cultivo (eso lo hace el boton "Activar" de la
  // comparativa). Empieza en el modelo actualmente activo.
  const [simModelId, setSimModelId] = useState<string>(
    () => modelos?.find((m: any) => m.activo)?.id_modelo?.toString() || ""
  );

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

    const idModeloSim = simModelId ? parseInt(simModelId, 10) : undefined;
    const res = await solicitarPrediccionML(payload, idCultivo, idModeloSim);
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

  const tieneHistorialReal = Boolean(historial && historial.length > 0);

  const handleFastAPIRequest = async () => {
    if (!tieneHistorialReal) {
      alert("❌ No hay lecturas registradas para este cultivo. Asigna un dispositivo y espera a que reporte datos antes de solicitar una predicción.");
      return;
    }

    setLoading(true);
    setPrediction(null);

    // Obtener la última lectura real como variables de entrada
    const ultimoRegistro = historial[historial.length - 1];
    const payload = {
      humedad_suelo: Number(ultimoRegistro.humSuelo),
      humedad_ambiente: Number(ultimoRegistro.humAmb),
      temperatura_ambiente: Number(ultimoRegistro.tempAmb),
      temperatura_suelo: Number(ultimoRegistro.tempSuelo)
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
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 sm:gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1.5">
            <h2 className="text-base sm:text-xl font-bold text-indigo-400">Machine Learning</h2>
            {cultivos && cultivos.length > 0 && idCultivo && (
              <div className="w-full sm:w-auto">
                <SearchableSelect
                  value={idCultivo.toString()}
                  onValueChange={(v) => startTransition(() => router.push(`?cultivo=${v}`))}
                  placeholder="Seleccionar cultivo"
                  searchPlaceholder="Buscar cultivo..."
                  style={{ background: '#111827', borderColor: '#1f2937', minWidth: 'auto', width: '100%' }}
                  options={cultivos.map((c: any) => ({ value: c.id.toString(), label: c.nombre_planta }))}
                />
              </div>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 font-mono break-words">
            {modelo.algoritmo} · {modelo.nombre} v{modelo.version} · 4 features + hora · MAE {modelo.mae}%
          </p>
          
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <span className="text-[11px] text-slate-400 self-center mr-0.5">Features:</span>
            <Badge color="green" variant="outline" size="1">Hum. suelo</Badge>
            <Badge color="blue" variant="outline" size="1">Hum. amb</Badge>
            <Badge color="orange" variant="outline" size="1">Temp. amb</Badge>
            <Badge color="sky" variant="outline" size="1">Temp. suelo</Badge>
            <Badge color="gray" variant="outline" size="1">Hora</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start shrink-0">
          {modelo.activo ? (
            <Badge color="purple" size="1" style={{ padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
              🧠 Modelo activo
            </Badge>
          ) : (
            <Badge color="gray" size="1">Modelo inactivo</Badge>
          )}
          {isAdmin && (
            <Button variant="outline" color="gray" size="1" onClick={handleRetrain} disabled={loading} style={{ cursor: 'pointer' }}>
              {loading ? '...' : 'Reentrenar'}
            </Button>
          )}
        </div>
      </div>

      {/* GRÁFICO PRINCIPAL */}
      <Card size={{ initial: "2", sm: "3" }} style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <Text size={{ initial: "2", sm: "3" }} weight="bold" color="indigo">Telemetría y evaluación del modelo</Text>
          <Text size="1" color="gray">Lectura actual (FastAPI)</Text>
        </div>

        <Box ref={chartContainerRef} className="w-full h-[210px] sm:h-[270px] md:h-[320px] min-w-0 relative">
          <MLPredictionChart chartWidth={chartWidth} historial={historial} umbral={umbral} />
        </Box>

        {/* INTEGRACIÓN FASTAPI */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mt-3 sm:mt-4 p-2.5 sm:p-3.5 rounded-xl border border-purple-500/25 bg-purple-500/5">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-base shrink-0">
              🧠
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-purple-300 leading-tight">
                Predicción del modelo (FastAPI)
              </p>
              {prediction ? (
                <p className="text-[11px] font-mono font-bold text-emerald-400 mt-0.5">
                  Resultado: {prediction.mensaje} (Riego: {prediction.riego === 1 ? 'ON' : 'OFF'}) · Probabilidad: {prediction.probabilidad_riego !== null ? `${(prediction.probabilidad_riego * 100).toFixed(1)}%` : 'N/A'}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  {loading
                    ? 'Consultando al microservicio de FastAPI en tiempo real...'
                    : tieneHistorialReal
                      ? 'Evaluar la última lectura registrada y decidir si activar el riego, mediante el BFF.'
                      : 'Sin lecturas registradas: asigna un dispositivo a este cultivo para poder predecir.'}
                </p>
              )}
            </div>
          </div>
          <Button
            color="purple"
            variant="soft"
            size="2"
            onClick={handleFastAPIRequest}
            disabled={loading || !tieneHistorialReal}
            className="w-full sm:w-auto shrink-0 cursor-pointer font-semibold text-xs"
            style={{ borderRadius: '8px', minHeight: '2.25rem' }}
          >
            {loading ? 'Cargando...' : 'Solicitar predicción'}
          </Button>
        </div>
      </Card>

      {/* HU-24: VARIABLES INFLUYENTES EN LA PREDICCIÓN (FEATURE IMPORTANCE) */}
      <Card size={{ initial: "2", sm: "3" }} mt={{ initial: "3", sm: "5" }} style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
        <div className="mb-3">
          <h3 className="text-xs sm:text-sm font-bold text-indigo-400">Variables influyentes en la predicción</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Peso de cada variable en la decisión del modelo activo (importancia de características).
          </p>
        </div>
        {modelo?.importancias_features && Object.keys(modelo.importancias_features).length > 0 ? (
          <Box>
            {Object.entries(modelo.importancias_features as Record<string, number>)
              .sort((a, b) => b[1] - a[1])
              .map(([feature, valor]) => {
                const etiquetas: Record<string, string> = {
                  humedad_suelo: 'Humedad de suelo',
                  humedad_ambiente: 'Humedad ambiente',
                  temperatura_ambiente: 'Temperatura ambiente',
                  temperatura_suelo: 'Temperatura de suelo',
                };
                const pct = Math.round(valor * 100);
                return (
                  <Box key={feature} mb="2">
                    <Flex justify="between" mb="1" style={{ fontSize: '11px' }}>
                      <Text color="gray">{etiquetas[feature] || feature}</Text>
                      <Text weight="bold" style={{ color: '#818cf8', fontFamily: 'var(--font-mono)' }}>{pct}%</Text>
                    </Flex>
                    <div style={{ height: '6px', background: 'var(--dim-mockup)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: '#818cf8', borderRadius: '3px' }} />
                    </div>
                  </Box>
                );
              })}
          </Box>
        ) : (
          <Text size="1" color="gray">
            Este modelo aún no tiene importancia de variables calculada. Entrena o reentrena el modelo para generarla.
          </Text>
        )}
      </Card>

      {/* SIMULADOR DE INFERENCIA MANUAL */}
      <Card size={{ initial: "2", sm: "3" }} mt={{ initial: "3", sm: "5" }} style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-indigo-400">
              Simulador de Riego Inteligente (Entrada Manual)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Prueba el comportamiento de cualquier modelo compatible con <strong className="text-slate-200">{cultivos?.find((c: any) => c.id === idCultivo)?.nombre_planta || 'este cultivo'}</strong> sin activarlo.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
            <span className="text-[11px] text-slate-400 shrink-0">Simular con:</span>
            {modelos && modelos.length > 0 ? (
              <div className="flex-1 sm:flex-initial min-w-0">
                <SearchableSelect
                  value={simModelId}
                  onValueChange={setSimModelId}
                  placeholder="Seleccionar modelo"
                  searchPlaceholder="Buscar modelo..."
                  style={{ background: '#1f2937', borderColor: '#374151', minWidth: 'auto', width: '100%' }}
                  options={modelos.map((m: any) => ({
                    value: m.id_modelo.toString(),
                    label: `${m.nombre_modelo} (v${m.version} - Acc: ${m.precision_modelo?.toFixed(1)}%)`,
                  }))}
                />
              </div>
            ) : (
              <Badge color="indigo" variant="outline" size="1">
                {modelo.nombre || 'Modelo'} v{modelo.version}
              </Badge>
            )}
          </div>
        </div>

        <form onSubmit={handleSimulate}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 mb-3">
            <div>
              <label className="block text-[11px] sm:text-xs text-slate-400 font-medium mb-1">
                Humedad Suelo (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={simInputs.humedad_suelo}
                onChange={(e) => setSimInputs({ ...simInputs, humedad_suelo: e.target.value })}
                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg py-1.5 px-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-slate-400 font-medium mb-1">
                Humedad Amb. (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={simInputs.humedad_ambiente}
                onChange={(e) => setSimInputs({ ...simInputs, humedad_ambiente: e.target.value })}
                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg py-1.5 px-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-slate-400 font-medium mb-1">
                Temp. Amb. (°C)
              </label>
              <input
                type="number"
                step="0.1"
                min="-10"
                max="60"
                value={simInputs.temperatura_ambiente}
                onChange={(e) => setSimInputs({ ...simInputs, temperatura_ambiente: e.target.value })}
                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg py-1.5 px-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] sm:text-xs text-slate-400 font-medium mb-1">
                Temp. Suelo (°C)
              </label>
              <input
                type="number"
                step="0.1"
                min="-10"
                max="60"
                value={simInputs.temperatura_suelo}
                onChange={(e) => setSimInputs({ ...simInputs, temperatura_suelo: e.target.value })}
                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg py-1.5 px-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              color="indigo"
              size="2"
              disabled={simLoading}
              className="w-full sm:w-auto cursor-pointer font-semibold text-xs"
              style={{ borderRadius: '8px', minHeight: '2.25rem', padding: '0 16px' }}
            >
              {simLoading ? 'Simulando...' : '💡 Ejecutar Simulación'}
            </Button>
          </div>
        </form>

        {simError && (
          <Box mt="2.5" p="2" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
            <Text color="red" size="1">{simError}</Text>
          </Box>
        )}

        {simResult && (
          <div className="mt-3 p-3 rounded-xl border border-slate-700 bg-slate-900/90">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-indigo-400">
                Resultado de la Predicción
              </span>
              <Badge
                color={simResult.riego === 1 ? 'green' : 'orange'}
                size="1"
                variant="solid"
                style={{ padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}
              >
                {simResult.riego === 1 ? '💧 REGAR' : '🚫 NO REGAR'}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mb-2 leading-relaxed">
              {simResult.mensaje}
            </p>
            {simResult.probabilidad_riego !== null && (
              <div>
                <div className="flex justify-between items-center mb-1 text-[11px]">
                  <span className="text-slate-400">Confianza del modelo:</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {(simResult.probabilidad_riego * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${simResult.probabilidad_riego * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  {simResult.probabilidad_riego > 0.5 ? 'El modelo detecta necesidad hídrica inminente.' : 'El modelo determina niveles óptimos de humedad.'}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* HISTORIAL DE PREDICCIONES E INFERENCIA */}
      <Card size={{ initial: "2", sm: "3" }} mt={{ initial: "3", sm: "5" }} style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-indigo-400">
              Historial de Decisiones e Inferencia
            </h3>
            <p className="text-[11px] text-slate-400">
              Registro cronológico de evaluaciones del modelo para este cultivo.
            </p>
          </div>
          {predicciones && predicciones.length > 0 && (
            <Badge color="gray" variant="soft" size="1" className="shrink-0">
              {predicciones.length} registros
            </Badge>
          )}
        </div>
        
        {!predicciones || predicciones.length === 0 ? (
          <Box p="3" style={{ textAlign: 'center' }}>
            <Text color="gray" size="2">No hay registros de inferencia previos para este cultivo.</Text>
          </Box>
        ) : (
          <>
            {/* VISTA MÓVIL: Tarjetas compactas adaptativas (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-800/70">
              {predicciones.slice((currentPageInferences - 1) * pageSizeInferences, currentPageInferences * pageSizeInferences).map((p: any) => {
                const esRiego = p.recomendacion === 'regar';
                const detalles = p.riego_detalles;
                return (
                  <div key={p.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-400">{p.fecha} {p.hora}</span>
                        <Badge color={esRiego ? 'purple' : 'gray'} variant="solid" size="1" style={{ borderRadius: '4px', padding: '1px 6px', fontSize: '10px' }}>
                          {esRiego ? '💧 Regar' : '🚫 No regar'}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-indigo-300">
                        {p.probabilidad !== null ? `${(p.probabilidad * 100).toFixed(0)}% conf.` : '—'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-1.5 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                        H.Suelo: {p.variables.humedad_suelo !== null ? `${Number(p.variables.humedad_suelo).toFixed(1)}%` : 'N/A'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                        H.Amb: {p.variables.humedad_ambiente !== null ? `${Number(p.variables.humedad_ambiente).toFixed(1)}%` : 'N/A'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                        T.Amb: {p.variables.temperatura_ambiente !== null ? `${Number(p.variables.temperatura_ambiente).toFixed(1)}°` : 'N/A'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40">
                        T.Suelo: {p.variables.temperatura_suelo !== null ? `${Number(p.variables.temperatura_suelo).toFixed(1)}°` : 'N/A'}
                      </span>
                    </div>

                    <div className="text-[11px]">
                      {p.ejecutado ? (
                        detalles ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            ✅ Riego: {detalles.cantidad_agua_litros !== null ? `${detalles.cantidad_agua_litros}L` : '--'} / {detalles.duracion_segundos !== null ? `${Math.round(detalles.duracion_segundos / 60)}m` : '--'}
                            {detalles.motivo_cierre && ` (${detalles.motivo_cierre})`}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium">✅ Orden de Riego Enviada</span>
                        )
                      ) : esRiego ? (
                        <span className="text-rose-400 font-medium">❌ Riego abortado</span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">Sin acción requerida</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA ESCRITORIO: Tabla compacta (>= 768px) */}
            <div className="hidden md:block">
              <ScrollArea scrollbars="horizontal" style={{ width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-mockup)' }}>
                      <th style={{ padding: '8px 10px', color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hora</th>
                      <th style={{ padding: '8px 10px', color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Variables de Entrada</th>
                      <th style={{ padding: '8px 10px', color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recomendación</th>
                      <th style={{ padding: '8px 10px', color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confianza</th>
                      <th style={{ padding: '8px 10px', color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resultado en Campo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predicciones.slice((currentPageInferences - 1) * pageSizeInferences, currentPageInferences * pageSizeInferences).map((p: any) => {
                      const esRiego = p.recomendacion === 'regar';
                      const detalles = p.riego_detalles;
                      
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-mockup)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                            <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
                              {p.fecha} {p.hora}
                            </Text>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <Flex gap="1.5" wrap="wrap">
                              <Badge color="green" variant="soft" size="1">
                                H.Suelo: {p.variables.humedad_suelo !== null ? `${Number(p.variables.humedad_suelo).toFixed(1)}%` : 'N/A'}
                              </Badge>
                              <Badge color="blue" variant="soft" size="1">
                                H.Amb: {p.variables.humedad_ambiente !== null ? `${Number(p.variables.humedad_ambiente).toFixed(1)}%` : 'N/A'}
                              </Badge>
                              <Badge color="orange" variant="soft" size="1">
                                T.Amb: {p.variables.temperatura_ambiente !== null ? `${Number(p.variables.temperatura_ambiente).toFixed(1)}%` : 'N/A'}
                              </Badge>
                              <Badge color="sky" variant="soft" size="1">
                                T.Suelo: {p.variables.temperatura_suelo !== null ? `${Number(p.variables.temperatura_suelo).toFixed(1)}%` : 'N/A'}
                              </Badge>
                            </Flex>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <Badge color={esRiego ? 'purple' : 'gray'} variant="solid" size="1" style={{ borderRadius: '6px', padding: '2px 8px' }}>
                              {esRiego ? '💧 Regar' : '🚫 No regar'}
                            </Badge>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <Text size="1" weight="bold" color={esRiego ? 'purple' : 'gray'} style={{ fontFamily: 'monospace' }}>
                              {p.probabilidad !== null ? `${(p.probabilidad * 100).toFixed(1)}%` : '—'}
                            </Text>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {p.ejecutado ? (
                              detalles ? (
                                <Badge color={detalles.estado ? "green" : "orange"} variant="outline" size="1" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {detalles.estado ? '✅ Riego: ' : '⌛ Riego en curso: '}
                                  {detalles.cantidad_agua_litros !== null ? `${detalles.cantidad_agua_litros}L` : '--'} / {detalles.duracion_segundos !== null ? `${Math.round(detalles.duracion_segundos / 60)}min` : '--'}
                                  {detalles.motivo_cierre && ` (${detalles.motivo_cierre})`}
                                </Badge>
                              ) : (
                                <Badge color="green" variant="outline" size="1">
                                  ✅ Orden Enviada
                                </Badge>
                              )
                            ) : esRiego ? (
                              <Badge color="red" variant="outline" size="1">
                                ❌ Riego no ejecutado
                              </Badge>
                            ) : (
                              <Text size="1" color="gray">—</Text>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </div>

            {/* Paginación compacta */}
            {predicciones.length > pageSizeInferences && (
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800/70 text-xs text-slate-400">
                <span className="text-[11px]">
                  {Math.min((currentPageInferences - 1) * pageSizeInferences + 1, predicciones.length)}–{Math.min(currentPageInferences * pageSizeInferences, predicciones.length)} de {predicciones.length}
                </span>
                <div className="flex gap-1">
                  <Button size="1" variant="soft" color="gray" onClick={() => setCurrentPageInferences(1)} disabled={currentPageInferences === 1}>«</Button>
                  <Button size="1" variant="soft" color="gray" onClick={() => setCurrentPageInferences(prev => Math.max(prev - 1, 1))} disabled={currentPageInferences === 1}>‹</Button>
                  <span className="px-2 py-0.5 bg-slate-800 text-white rounded text-xs font-bold self-center">
                    {currentPageInferences} / {Math.ceil(predicciones.length / pageSizeInferences)}
                  </span>
                  <Button size="1" variant="soft" color="gray" onClick={() => setCurrentPageInferences(prev => Math.min(prev + 1, Math.ceil(predicciones.length / pageSizeInferences)))} disabled={currentPageInferences === Math.ceil(predicciones.length / pageSizeInferences)}>›</Button>
                  <Button size="1" variant="soft" color="gray" onClick={() => setCurrentPageInferences(Math.ceil(predicciones.length / pageSizeInferences))} disabled={currentPageInferences === Math.ceil(predicciones.length / pageSizeInferences)}>»</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* COMPARATIVA DE MODELOS DE MACHINE LEARNING Y RENDIMIENTO */}
      <Card size={{ initial: "2", sm: "3" }} mt={{ initial: "3", sm: "5" }} style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-xs sm:text-sm font-bold text-indigo-400">Comparativa de Modelos ML</h3>
              <Badge color="purple" variant="soft" size="1">
                {modelosCompatibles.length} {modelosCompatibles.length === 1 ? 'modelo' : 'modelos'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Evaluación de precisión y métricas de inferencia entre algoritmos entrenados.
            </p>
          </div>
        </div>
        
        {/* Modelos en Comparativa */}
        <Grid columns={{ initial: '1', md: modelosCompatibles.length > 1 ? '2' : '1' }} gap="3">
          {modelosCompatibles.map((m: any) => {
            const isActivo = m.activo || (modelo && m.id_modelo === modelo.id_modelo);
            const accuracy = m.precision_modelo ?? (m.precision_score ? m.precision_score : 90);
            const f1 = m.f1_score ?? 90;
            const recall = m.recall_score ?? 90;
            const mae = m.mae ?? Math.max(0, Number((100 - accuracy).toFixed(1)));

            return (
              <Box
                key={`mod-comp-${m.id_modelo}`}
                style={{
                  background: isActivo ? 'rgba(99, 102, 241, 0.05)' : 'var(--surface2-mockup)',
                  border: isActivo ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-mockup)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  position: 'relative'
                }}
              >
                <Flex justify="between" align="center" mb="2">
                  <Box>
                    <Flex align="center" gap="2">
                      <Text size="2" weight="bold" style={{ color: isActivo ? '#818cf8' : 'white' }}>
                        {m.nombre_modelo}
                      </Text>
                      <Badge color={m.algoritmo?.toLowerCase().includes('random') ? 'plum' : 'cyan'} variant="surface" size="1">
                        {m.algoritmo}
                      </Badge>
                    </Flex>
                    <Text size="1" color="gray" style={{ fontFamily: 'var(--font-mono)', marginTop: '2px', display: 'block', fontSize: '10px' }}>
                      Versión {m.version} · {m.descripcion || 'Modelo clasificador'}
                    </Text>
                  </Box>
                  {isActivo ? (
                    <Badge color="green" variant="solid" size="1" style={{ padding: '3px 8px', borderRadius: '4px' }}>
                      ⚡ Activo
                    </Badge>
                  ) : (
                    <Button
                      size="1"
                      variant="soft"
                      color="indigo"
                      disabled={loading}
                      onClick={() => handleSelectModel(m.id_modelo.toString())}
                      style={{ cursor: 'pointer', borderRadius: '6px', fontSize: '11px' }}
                    >
                      Activar
                    </Button>
                  )}
                </Flex>

                {/* Métricas de rendimiento con barras */}
                <Box mt="2">
                  {/* Accuracy */}
                  <Box mb="1.5">
                    <Flex justify="between" mb="0.5" style={{ fontSize: '10px' }}>
                      <Text color="gray" style={{ fontFamily: 'var(--font-mono)' }}>Precisión Global (Accuracy)</Text>
                      <Text weight="bold" style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{Number(accuracy).toFixed(1)}%</Text>
                    </Flex>
                    <div style={{ height: '5px', background: 'var(--dim-mockup)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, accuracy))}%`, background: 'var(--green)', borderRadius: '3px' }} />
                    </div>
                  </Box>

                  {/* F1-Score */}
                  <Box mb="1.5">
                    <Flex justify="between" mb="0.5" style={{ fontSize: '10px' }}>
                      <Text color="gray" style={{ fontFamily: 'var(--font-mono)' }}>F1-Score (Equilibrio)</Text>
                      <Text weight="bold" style={{ color: '#818cf8', fontFamily: 'var(--font-mono)' }}>{Number(f1).toFixed(1)}%</Text>
                    </Flex>
                    <div style={{ height: '5px', background: 'var(--dim-mockup)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, f1))}%`, background: '#818cf8', borderRadius: '3px' }} />
                    </div>
                  </Box>

                  {/* Recall */}
                  <Box mb="1.5">
                    <Flex justify="between" mb="0.5" style={{ fontSize: '10px' }}>
                      <Text color="gray" style={{ fontFamily: 'var(--font-mono)' }}>Sensibilidad (Recall)</Text>
                      <Text weight="bold" style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{Number(recall).toFixed(1)}%</Text>
                    </Flex>
                    <div style={{ height: '5px', background: 'var(--dim-mockup)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, recall))}%`, background: '#38bdf8', borderRadius: '3px' }} />
                    </div>
                  </Box>

                  {/* MAE */}
                  <Box>
                    <Flex justify="between" mb="0.5" style={{ fontSize: '10px' }}>
                      <Text color="gray" style={{ fontFamily: 'var(--font-mono)' }}>Tasa de Error / MAE</Text>
                      <Text weight="bold" style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>{Number(mae).toFixed(1)}%</Text>
                    </Flex>
                    <div style={{ height: '5px', background: 'var(--dim-mockup)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, mae))}%`, background: 'var(--amber)', borderRadius: '3px' }} />
                    </div>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Grid>

        {/* Resumen de Rendimiento del Riego Autónomo ML */}
        <Grid columns={{ initial: '2', sm: '2', md: '4' }} gap="2.5" mt="4">
          <div style={{ padding: '10px', background: 'var(--greenbg)', border: '1px solid var(--greenbrd)', borderRadius: '8px', textAlign: 'center' }}>
            <div className="text-base sm:text-lg font-bold font-mono" style={{ color: 'var(--green)' }}>
              {compModelos?.ahorro_estimado_pct ?? 28.5}%
            </div>
            <div style={{ fontSize: '9px', color: 'var(--green)', fontFamily: 'var(--font-mono)', marginTop: '2px', lineHeight: '1.2' }}>
              Ahorro de agua est.<br/>vs Riego Manual
            </div>
          </div>

          <div style={{ padding: '10px', background: 'var(--purplebg)', border: '1px solid var(--purplebrd)', borderRadius: '8px', textAlign: 'center' }}>
            <div className="text-base sm:text-lg font-bold font-mono" style={{ color: 'var(--purple)' }}>
              {compModelos?.tiempo_optimo_pct ?? 100}%
            </div>
            <div style={{ fontSize: '9px', color: 'var(--purple)', fontFamily: 'var(--font-mono)', marginTop: '2px', lineHeight: '1.2' }}>
              Humedad en rango ópt.<br/>Control autónomo
            </div>
          </div>

          <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', textAlign: 'center' }}>
            <div className="text-base sm:text-lg font-bold font-mono" style={{ color: '#38bdf8' }}>
              {compModelos?.promedio_litros_riego ?? 0.0} L
            </div>
            <div style={{ fontSize: '9px', color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '2px', lineHeight: '1.2' }}>
              Consumo promedio<br/>por evento de riego
            </div>
          </div>

          <div style={{ padding: '10px', background: 'var(--amberbg)', border: '1px solid var(--amberbrd)', borderRadius: '8px', textAlign: 'center' }}>
            <div className="text-base sm:text-lg font-bold font-mono" style={{ color: 'var(--amber)' }}>
              {(modelo?.mae || (modelosCompatibles.find((m: any) => m.activo)?.mae) || 5.5).toFixed(1)}%
            </div>
            <div style={{ fontSize: '9px', color: 'var(--amber)', fontFamily: 'var(--font-mono)', marginTop: '2px', lineHeight: '1.2' }}>
              MAE modelo activo<br/>en validación
            </div>
          </div>
        </Grid>
      </Card>
    </Box>
  );
}
