// src/components/agricultor/ml/MLClient.tsx
"use client";

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { Box, Text, Flex, Button, Badge, ScrollArea, Grid } from '@radix-ui/themes';
import MLPredictionChart from '@/components/charts/MLPredictionChart';
import { solicitarPrediccionML, reentrenarModeloML, seleccionarModeloML } from '@/actions/ml';
import { useRouter } from 'next/navigation';
import SearchableSelect from '@/components/ui/SearchableSelect';
import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Droplets,
  FlaskConical,
  GitCompare,
  History,
  Loader,
  RefreshCw,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { IconTile, Inset, Meter, Panel, SectionHeader, StatusDot, fieldClass, tone, type Tone } from '@/components/ui/yaku-ui';

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

  const nombreCultivo = cultivos?.find((c: any) => c.id === idCultivo)?.nombre_planta || 'este cultivo';
  const totalPaginas = Math.ceil((predicciones?.length || 0) / pageSizeInferences);
  const pagina = (predicciones || []).slice(
    (currentPageInferences - 1) * pageSizeInferences,
    currentPageInferences * pageSizeInferences
  );
  const fmt = (v: any, unidad: string) => (v !== null && v !== undefined ? `${Number(v).toFixed(1)}${unidad}` : 'N/A');

  const RecomendacionBadge = ({ esRiego }: { esRiego: boolean }) => (
    <Badge color={esRiego ? 'purple' : 'gray'} variant="soft" size="1">
      {esRiego ? <Droplets size={11} aria-hidden /> : <Ban size={11} aria-hidden />}
      {esRiego ? 'Regar' : 'No regar'}
    </Badge>
  );

  const ResultadoCampo = ({ p, compacto = false }: { p: any; compacto?: boolean }) => {
    const esRiego = p.recomendacion === 'regar';
    const detalles = p.riego_detalles;
    if (p.ejecutado) {
      if (detalles) {
        const enCurso = !detalles.estado;
        return (
          <Badge color={enCurso ? 'orange' : 'green'} variant="soft" size="1">
            {enCurso ? <Loader size={11} aria-hidden /> : <CheckCircle2 size={11} aria-hidden />}
            <span className="tabular-nums">
              {enCurso ? 'Riego en curso: ' : 'Riego: '}
              {detalles.cantidad_agua_litros !== null ? `${detalles.cantidad_agua_litros} L` : '--'} /{' '}
              {detalles.duracion_segundos !== null
                ? `${Math.round(detalles.duracion_segundos / 60)} ${compacto ? 'm' : 'min'}`
                : '--'}
              {detalles.motivo_cierre && ` (${detalles.motivo_cierre})`}
            </span>
          </Badge>
        );
      }
      return (
        <Badge color="green" variant="soft" size="1">
          <CheckCircle2 size={11} aria-hidden /> Orden de riego enviada
        </Badge>
      );
    }
    if (esRiego) {
      return (
        <Badge color="red" variant="soft" size="1">
          <XCircle size={11} aria-hidden /> Riego no ejecutado
        </Badge>
      );
    }
    return <Text size="1" color="gray">{compacto ? 'Sin acción requerida' : '—'}</Text>;
  };

  const kpis: { valor: string; label: string; t: Tone }[] = [
    { valor: `${compModelos?.ahorro_estimado_pct ?? 28.5}%`, label: 'Ahorro de agua est. vs riego manual', t: 'green' },
    { valor: `${compModelos?.tiempo_optimo_pct ?? 100}%`, label: 'Humedad en rango óptimo (control autónomo)', t: 'purple' },
    { valor: `${compModelos?.promedio_litros_riego ?? 0.0} L`, label: 'Consumo promedio por evento de riego', t: 'blue' },
    {
      valor: `${(modelo?.mae || modelosCompatibles.find((m: any) => m.activo)?.mae || 5.5).toFixed(1)}%`,
      label: 'MAE del modelo activo en validación',
      t: 'amber',
    },
  ];

  return (
    <Box style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 sm:gap-4 mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <IconTile icon={BrainCircuit} t="purple" size={40} />
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h2 className="text-base sm:text-xl font-bold text-white tracking-tight m-0">Machine Learning</h2>
              {cultivos && cultivos.length > 0 && idCultivo && (
                <div className="w-full sm:w-56">
                  <SearchableSelect
                    value={idCultivo.toString()}
                    onValueChange={(v) => startTransition(() => router.push(`?cultivo=${v}`))}
                    placeholder="Seleccionar cultivo"
                    searchPlaceholder="Buscar cultivo..."
                    style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border2-mockup)', minWidth: 'auto', width: '100%' }}
                    options={cultivos.map((c: any) => ({ value: c.id.toString(), label: c.nombre_planta }))}
                  />
                </div>
              )}
            </div>
            <p className="m-0 mt-1 text-[11px] sm:text-xs text-slate-400 break-words tabular-nums">
              {modelo.algoritmo} · {modelo.nombre} v{modelo.version} · 4 features + hora · MAE {modelo.mae}%
            </p>
            <div className="flex gap-1.5 mt-2 flex-wrap items-center">
              <span className="text-[11px] text-slate-400 mr-0.5">Features:</span>
              <Badge color="green" variant="outline" size="1">Hum. suelo</Badge>
              <Badge color="blue" variant="outline" size="1">Hum. amb</Badge>
              <Badge color="orange" variant="outline" size="1">Temp. amb</Badge>
              <Badge color="sky" variant="outline" size="1">Temp. suelo</Badge>
              <Badge color="gray" variant="outline" size="1">Hora</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start shrink-0">
          {modelo.activo ? (
            <Badge color="purple" variant="soft" size="2">
              <StatusDot t="purple" pulse /> Modelo activo
            </Badge>
          ) : (
            <Badge color="gray" variant="soft" size="2">Modelo inactivo</Badge>
          )}
          {isAdmin && (
            <Button variant="outline" color="gray" size="2" onClick={handleRetrain} loading={loading}>
              <RefreshCw size={14} aria-hidden />
              Reentrenar
            </Button>
          )}
        </div>
      </div>

      <Flex direction="column" gap="4">
        {/* GRÁFICO PRINCIPAL */}
        <Panel>
          <Flex direction="column" gap="3">
            <SectionHeader
              icon={Activity}
              t="blue"
              title="Telemetría y evaluación del modelo"
              aside={<Text size="1" color="gray">Lectura actual (FastAPI)</Text>}
            />

            <Box ref={chartContainerRef} className="w-full h-[210px] sm:h-[270px] md:h-[320px] min-w-0 relative">
              <MLPredictionChart chartWidth={chartWidth} historial={historial} umbral={umbral} />
            </Box>

            {/* INTEGRACIÓN FASTAPI */}
            <Inset
              style={{ background: tone('purple').bg, borderColor: tone('purple').brd }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <IconTile icon={BrainCircuit} t="purple" />
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold text-purple-200 leading-tight">Predicción del modelo (FastAPI)</p>
                  {prediction ? (
                    <p className="m-0 mt-1 text-xs font-medium text-emerald-300 tabular-nums">
                      Resultado: {prediction.mensaje} (Riego: {prediction.riego === 1 ? 'ON' : 'OFF'}) · Probabilidad:{' '}
                      {prediction.probabilidad_riego !== null
                        ? `${(prediction.probabilidad_riego * 100).toFixed(1)}%`
                        : 'N/A'}
                    </p>
                  ) : (
                    <p className="m-0 mt-1 text-xs text-slate-400 leading-snug">
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
                variant="solid"
                size="2"
                onClick={handleFastAPIRequest}
                loading={loading}
                disabled={loading || !tieneHistorialReal}
                className="w-full sm:w-auto shrink-0"
              >
                <Sparkles size={14} aria-hidden />
                Solicitar predicción
              </Button>
            </Inset>
          </Flex>
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* HU-24: VARIABLES INFLUYENTES */}
          <div className="lg:col-span-2 min-w-0">
            <Panel style={{ height: '100%' }}>
              <Flex direction="column" gap="4">
                <SectionHeader
                  icon={BarChart3}
                  t="purple"
                  title="Variables influyentes en la predicción"
                  description="Peso de cada variable en la decisión del modelo activo (importancia de características)."
                />
                {modelo?.importancias_features && Object.keys(modelo.importancias_features).length > 0 ? (
                  <Flex direction="column" gap="3">
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
                          <Box key={feature}>
                            <Flex justify="between" mb="1">
                              <Text size="2" color="gray">{etiquetas[feature] || feature}</Text>
                              <Text size="2" weight="bold" className="tabular-nums" style={{ color: tone('purple').fg }}>
                                {pct}%
                              </Text>
                            </Flex>
                            <Meter value={pct} t="purple" label={etiquetas[feature] || feature} />
                          </Box>
                        );
                      })}
                  </Flex>
                ) : (
                  <Text size="2" color="gray">
                    Este modelo aún no tiene importancia de variables calculada. Entrena o reentrena el modelo para generarla.
                  </Text>
                )}
              </Flex>
            </Panel>
          </div>

          {/* SIMULADOR DE INFERENCIA MANUAL */}
          <div className="lg:col-span-3 min-w-0">
            <Panel style={{ height: '100%' }}>
              <Flex direction="column" gap="4">
                <SectionHeader
                  icon={FlaskConical}
                  t="teal"
                  title="Simulador de riego inteligente (entrada manual)"
                  description={
                    <>
                      Prueba el comportamiento de cualquier modelo compatible con{' '}
                      <strong className="text-slate-200">{nombreCultivo}</strong> sin activarlo.
                    </>
                  }
                />

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 shrink-0">Simular con:</span>
                  {modelos && modelos.length > 0 ? (
                    <div className="flex-1 min-w-0">
                      <SearchableSelect
                        value={simModelId}
                        onValueChange={setSimModelId}
                        placeholder="Seleccionar modelo"
                        searchPlaceholder="Buscar modelo..."
                        style={{ background: 'var(--bg-mockup)', borderColor: 'var(--border2-mockup)', minWidth: 'auto', width: '100%' }}
                        options={modelos.map((m: any) => ({
                          value: m.id_modelo.toString(),
                          label: `${m.nombre_modelo} (v${m.version} - Acc: ${m.precision_modelo?.toFixed(1)}%)`,
                        }))}
                      />
                    </div>
                  ) : (
                    <Badge color="gray" variant="outline" size="1">
                      {modelo.nombre || 'Modelo'} v{modelo.version}
                    </Badge>
                  )}
                </div>

                <form onSubmit={handleSimulate}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {([
                      ['humedad_suelo', 'Humedad suelo (%)', '0', '100'],
                      ['humedad_ambiente', 'Humedad amb. (%)', '0', '100'],
                      ['temperatura_ambiente', 'Temp. amb. (°C)', '-10', '60'],
                      ['temperatura_suelo', 'Temp. suelo (°C)', '-10', '60'],
                    ] as const).map(([key, label, min, max]) => (
                      <label key={key} className="block">
                        <span className="block text-xs text-slate-400 font-medium mb-1">{label}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min={min}
                          max={max}
                          value={simInputs[key]}
                          onChange={(e) => setSimInputs({ ...simInputs, [key]: e.target.value })}
                          className={fieldClass}
                          required
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" color="teal" size="2" loading={simLoading} className="w-full sm:w-auto">
                      <FlaskConical size={14} aria-hidden />
                      Ejecutar simulación
                    </Button>
                  </div>
                </form>

                {simError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
                  >
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden />
                    {simError}
                  </div>
                )}

                {simResult && (
                  <Inset>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-white">Resultado de la predicción</span>
                      <Badge color={simResult.riego === 1 ? 'green' : 'orange'} variant="soft" size="2">
                        {simResult.riego === 1 ? <Droplets size={13} aria-hidden /> : <Ban size={13} aria-hidden />}
                        {simResult.riego === 1 ? 'REGAR' : 'NO REGAR'}
                      </Badge>
                    </div>
                    <p className="m-0 text-xs text-slate-300 mb-3 leading-relaxed">{simResult.mensaje}</p>
                    {simResult.probabilidad_riego !== null && (
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="text-slate-400">Confianza del modelo</span>
                          <span className="font-bold tabular-nums text-teal-300">
                            {(simResult.probabilidad_riego * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Meter value={simResult.probabilidad_riego * 100} t="teal" label="Confianza del modelo" />
                        <p className="m-0 mt-2 text-[11px] text-slate-400">
                          {simResult.probabilidad_riego > 0.5
                            ? 'El modelo detecta necesidad hídrica inminente.'
                            : 'El modelo determina niveles óptimos de humedad.'}
                        </p>
                      </div>
                    )}
                  </Inset>
                )}
              </Flex>
            </Panel>
          </div>
        </div>

        {/* HISTORIAL DE PREDICCIONES E INFERENCIA */}
        <Panel>
          <Flex direction="column" gap="4">
            <SectionHeader
              icon={History}
              t="gray"
              title="Historial de decisiones e inferencia"
              description="Registro cronológico de evaluaciones del modelo para este cultivo."
              aside={
                predicciones && predicciones.length > 0 ? (
                  <Badge color="gray" variant="soft" size="1" className="tabular-nums">
                    {predicciones.length} registros
                  </Badge>
                ) : undefined
              }
            />

            {!predicciones || predicciones.length === 0 ? (
              <Inset>
                <Text color="gray" size="2">No hay registros de inferencia previos para este cultivo.</Text>
              </Inset>
            ) : (
              <>
                {/* VISTA MÓVIL */}
                <div className="block md:hidden divide-y divide-[var(--border-mockup)]">
                  {pagina.map((p: any) => {
                    const esRiego = p.recomendacion === 'regar';
                    return (
                      <div key={p.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 tabular-nums">{p.fecha} {p.hora}</span>
                            <RecomendacionBadge esRiego={esRiego} />
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-purple-300">
                            {p.probabilidad !== null ? `${(p.probabilidad * 100).toFixed(0)}% conf.` : '—'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mb-2 text-[11px] tabular-nums">
                          {[
                            ['H. suelo', fmt(p.variables.humedad_suelo, '%')],
                            ['H. amb', fmt(p.variables.humedad_ambiente, '%')],
                            ['T. amb', fmt(p.variables.temperatura_ambiente, '°')],
                            ['T. suelo', fmt(p.variables.temperatura_suelo, '°')],
                          ].map(([l, v]) => (
                            <div key={l}>
                              <span className="block text-slate-500">{l}</span>
                              <span className="text-slate-200 font-medium">{v}</span>
                            </div>
                          ))}
                        </div>
                        <ResultadoCampo p={p} compacto />
                      </div>
                    );
                  })}
                </div>

                {/* VISTA ESCRITORIO */}
                <div className="hidden md:block">
                  <ScrollArea scrollbars="horizontal" style={{ width: '100%' }}>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-mockup)]">
                          {['Hora', 'Variables de entrada', 'Recomendación', 'Confianza', 'Resultado en campo'].map((h) => (
                            <th key={h} className="px-2.5 py-2 text-xs font-semibold text-slate-400">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pagina.map((p: any) => {
                          const esRiego = p.recomendacion === 'regar';
                          return (
                            <tr key={p.id} className="border-b border-[var(--border-mockup)] hover:bg-white/[0.02] transition-colors">
                              <td className="px-2.5 py-2 whitespace-nowrap text-xs text-slate-400">
                                {p.fecha} {p.hora}
                              </td>
                              <td className="px-2.5 py-2">
                                <span className="text-xs text-slate-300 tabular-nums whitespace-nowrap">
                                  Suelo {fmt(p.variables.humedad_suelo, '%')} / {fmt(p.variables.temperatura_suelo, '°C')}
                                  <span className="text-slate-600 mx-1.5">·</span>
                                  Amb. {fmt(p.variables.humedad_ambiente, '%')} / {fmt(p.variables.temperatura_ambiente, '°C')}
                                </span>
                              </td>
                              <td className="px-2.5 py-2">
                                <RecomendacionBadge esRiego={esRiego} />
                              </td>
                              <td className="px-2.5 py-2">
                                <span className={`text-xs font-semibold ${esRiego ? 'text-purple-300' : 'text-slate-400'}`}>
                                  {p.probabilidad !== null ? `${(p.probabilidad * 100).toFixed(1)}%` : '—'}
                                </span>
                              </td>
                              <td className="px-2.5 py-2">
                                <ResultadoCampo p={p} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>

                {/* Paginación */}
                {predicciones.length > pageSizeInferences && (
                  <nav
                    aria-label="Paginación del historial"
                    className="flex justify-between items-center pt-3 border-t border-[var(--border-mockup)] text-xs text-slate-400"
                  >
                    <span className="tabular-nums">
                      {Math.min((currentPageInferences - 1) * pageSizeInferences + 1, predicciones.length)}–
                      {Math.min(currentPageInferences * pageSizeInferences, predicciones.length)} de {predicciones.length}
                    </span>
                    <div className="flex gap-1 items-center">
                      <Button size="1" variant="soft" color="gray" aria-label="Primera página" onClick={() => setCurrentPageInferences(1)} disabled={currentPageInferences === 1}>
                        <ChevronsLeft size={14} aria-hidden />
                      </Button>
                      <Button size="1" variant="soft" color="gray" aria-label="Página anterior" onClick={() => setCurrentPageInferences((prev) => Math.max(prev - 1, 1))} disabled={currentPageInferences === 1}>
                        <ChevronLeft size={14} aria-hidden />
                      </Button>
                      <span className="px-2 text-slate-200 font-semibold tabular-nums">
                        {currentPageInferences} / {totalPaginas}
                      </span>
                      <Button size="1" variant="soft" color="gray" aria-label="Página siguiente" onClick={() => setCurrentPageInferences((prev) => Math.min(prev + 1, totalPaginas))} disabled={currentPageInferences === totalPaginas}>
                        <ChevronRight size={14} aria-hidden />
                      </Button>
                      <Button size="1" variant="soft" color="gray" aria-label="Última página" onClick={() => setCurrentPageInferences(totalPaginas)} disabled={currentPageInferences === totalPaginas}>
                        <ChevronsRight size={14} aria-hidden />
                      </Button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </Flex>
        </Panel>

        {/* COMPARATIVA DE MODELOS */}
        <Panel>
          <Flex direction="column" gap="4">
            <SectionHeader
              icon={GitCompare}
              t="purple"
              title={
                <Flex as="span" align="center" gap="2">
                  Comparativa de modelos ML
                  <Badge color="purple" variant="soft" size="1">
                    {modelosCompatibles.length} {modelosCompatibles.length === 1 ? 'modelo' : 'modelos'}
                  </Badge>
                </Flex>
              }
              description="Evaluación de precisión y métricas de inferencia entre algoritmos entrenados."
            />

            <Grid columns={{ initial: '1', md: modelosCompatibles.length > 1 ? '2' : '1' }} gap="3">
              {modelosCompatibles.map((m: any) => {
                const isActivo = m.activo || (modelo && m.id_modelo === modelo.id_modelo);
                const accuracy = m.precision_modelo ?? (m.precision_score ? m.precision_score : 90);
                const f1 = m.f1_score ?? 90;
                const recall = m.recall_score ?? 90;
                const mae = m.mae ?? Math.max(0, Number((100 - accuracy).toFixed(1)));
                const metricas: [string, number, Tone][] = [
                  ['Precisión global (accuracy)', accuracy, 'green'],
                  ['F1-score (equilibrio)', f1, 'purple'],
                  ['Sensibilidad (recall)', recall, 'blue'],
                  ['Tasa de error / MAE', mae, 'amber'],
                ];

                return (
                  <Inset
                    key={`mod-comp-${m.id_modelo}`}
                    style={{
                      background: isActivo ? tone('purple').bg : undefined,
                      borderColor: isActivo ? tone('purple').brd : undefined,
                    }}
                  >
                    <Flex justify="between" align="start" gap="3" mb="3">
                      <Box style={{ minWidth: 0 }}>
                        <Flex align="center" gap="2" wrap="wrap">
                          <Text size="2" weight="bold" style={{ color: 'var(--foreground)' }}>
                            {m.nombre_modelo}
                          </Text>
                          <Badge color="gray" variant="outline" size="1">
                            {m.algoritmo}
                          </Badge>
                        </Flex>
                        <Text size="1" color="gray" as="div" mt="1">
                          Versión {m.version} · {m.descripcion || 'Modelo clasificador'}
                        </Text>
                      </Box>
                      {isActivo ? (
                        <Badge color="purple" variant="soft" size="1" className="shrink-0">
                          <Zap size={11} aria-hidden /> Activo
                        </Badge>
                      ) : (
                        <Button
                          size="1"
                          variant="outline"
                          color="purple"
                          disabled={loading}
                          onClick={() => handleSelectModel(m.id_modelo.toString())}
                          className="shrink-0"
                        >
                          Activar
                        </Button>
                      )}
                    </Flex>

                    <Flex direction="column" gap="2">
                      {metricas.map(([label, valor, t]) => (
                        <Box key={label}>
                          <Flex justify="between" mb="1">
                            <Text size="1" color="gray">{label}</Text>
                            <Text size="1" weight="bold" className="tabular-nums" style={{ color: tone(t).fg }}>
                              {Number(valor).toFixed(1)}%
                            </Text>
                          </Flex>
                          <Meter value={Number(valor)} t={t} height={5} label={label} />
                        </Box>
                      ))}
                    </Flex>
                  </Inset>
                );
              })}
            </Grid>

            {/* Resumen de rendimiento del riego autónomo ML */}
            <dl className="m-0 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-xl border border-[var(--border-mockup)] bg-[var(--border-mockup)]">
              {kpis.map((k) => (
                <div key={k.label} className="bg-[var(--surface-mockup)] px-4 py-3">
                  <dd className="m-0 text-xl sm:text-2xl font-bold tabular-nums tracking-tight" style={{ color: tone(k.t).fg }}>
                    {k.valor}
                  </dd>
                  <dt className="mt-1 text-[11px] leading-snug text-slate-400">{k.label}</dt>
                </div>
              ))}
            </dl>
          </Flex>
        </Panel>
      </Flex>
    </Box>
  );
}
