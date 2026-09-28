"use client";

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text, Flex, Grid, Select, Card, Badge, Progress, Switch, Separator, Button, Dialog, TextField, ScrollArea } from '@radix-ui/themes';
import DashboardHistoryChart from '@/components/charts/DashboardHistoryChart';
import DashboardConsumptionChart from '@/components/charts/DashboardConsumptionChart';
import DashboardHealthGauge from '@/components/charts/DashboardHealthGauge';
import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';
import SearchableSelect from '@/components/ui/SearchableSelect';
import {
  LIMITE_SENSOR_OBSOLETO_MS,
  estadoFlujo,
  haceTiempo,
  ultimaLecturaMs,
  useAhora,
  useWsConectado,
} from './live';
import {
  Activity,
  AlertTriangle,
  CloudFog,
  Cpu,
  Droplets,
  Gauge,
  Sprout,
  Thermometer,
  ThermometerSun,
  Waves,
} from 'lucide-react';
import { IconTile, StatusDot } from '@/components/ui/yaku-ui';

const DASHBOARD_REFRESH_SECONDS = 60;
const DEFAULT_DASHBOARD_TIME_ZONE = 'America/Lima';

type TanqueData = { idTelemetria: string | null; nombre: string; litrosActuales: number; litrosTotales: number; porcentaje: number; sensorModelo: string; estadoNivel: string; bombaEncendida: boolean; timeoutMinutos: number; dispositivoActivo?: boolean; } | null;
type SensorData = { modelo: string; metrica: string; unidad: string; valor: number; porcentaje: number | null; ema: number | null; fecha: Date; umbral: { min: number | null; max: number | null } | null; } | null;
type DispositivoData = { id: number; nombre: string; estado: string | null; funcionamientoActivo?: boolean; tipoId?: number; tipoNombre?: string; };
type ConsumoData = { fecha?: string; label: string; valor: number; };
type ResumenDiaData = { riegosHoy: number; litrosHoy: number; ultimoRiego: Date | null; humedadSueloProm: number | null; humedadAmbiental: number | null; };

type HistoricoPunto = { fecha: string; valor: number; };
type HistorialData = {
  humedadSuelo: HistoricoPunto[];
  humedadAmbiente: HistoricoPunto[];
  temperaturaSuelo: HistoricoPunto[];
  temperaturaAmbiente: HistoricoPunto[];
};

type HistoryRange = '6h' | '24h' | '7d';
type CalendarFilter = 'all' | string;
type CalendarFilters = { weekday: CalendarFilter; month: CalendarFilter; year: CalendarFilter; startDate?: string; endDate?: string };
type FilterMode = 'relative' | 'calendar';

const WEEKDAY_OPTIONS = [
  { value: 'all', label: 'Todos los dias' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miercoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sabado' },
  { value: '0', label: 'Domingo' },
];

const MONTH_OPTIONS = [
  { value: 'all', label: 'Todos los meses' },
  { value: '0', label: 'Enero' },
  { value: '1', label: 'Febrero' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Mayo' },
  { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' },
  { value: '10', label: 'Noviembre' },
  { value: '11', label: 'Diciembre' },
];

type CultivoData = {
  idCultivo: number;
  zonaHoraria?: string;
  nombreCultivo: string;
  conceptoPlanta: string;
  etapaCrecimiento: string | null;
  sensores: { humedadSuelo: SensorData; humedadAmbiente: SensorData; temperaturaSuelo: SensorData; temperaturaAmbiente: SensorData; };
  historialSensores: HistorialData;
  dispositivos: DispositivoData[];
  tanque: TanqueData;
  fuenteAgua?: { id?: number; nombre?: string; tipo?: string } | null;
  esConexionDirecta?: boolean;
  consumoSemanal: ConsumoData[];
  historialConsumo?: HistoricoPunto[];
  limiteConsumo: number | null;
  resumenDia: ResumenDiaData;
};

const isCollectorDevice = (device: DispositivoData) => {
  const typeName = `${device.tipoNombre || ''} ${device.nombre || ''}`.toLowerCase();
  return device.tipoId === 1 || ['sensor', 'sensores', 'captura', 'colector', 'suelo', 'clima'].some((word) => typeName.includes(word));
};

const hasActiveCollector = (cultivo: CultivoData | null) => {
  return Boolean(cultivo?.dispositivos?.some((device) => isCollectorDevice(device) && device.funcionamientoActivo));
};

const dateMatchesCalendarFilters = (date: Date, filters: CalendarFilters) => {
  if (Number.isNaN(date.getTime())) return false;
  if (filters.weekday !== 'all' && date.getDay().toString() !== filters.weekday) return false;
  if (filters.month !== 'all' && date.getMonth().toString() !== filters.month) return false;
  if (filters.year !== 'all' && date.getFullYear().toString() !== filters.year) return false;
  if (filters.startDate && date < new Date(`${filters.startDate}T00:00:00`)) return false;
  if (filters.endDate && date > new Date(`${filters.endDate}T23:59:59`)) return false;
  return true;
};

// Ventana total de datos a considerar por cada rango del selector de tiempo
const HISTORY_RANGE_LIMIT_MS: Record<HistoryRange, number> = {
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

// Para 7d se promedian las lecturas en intervalos de 10 min (unas 1000 en vez de ~10 000);
// en 6h y 24h se dibujan todas las lecturas reales, una por minuto.
const HISTORY_RANGE_BUCKET_MS: Record<HistoryRange, number> = {
  '6h': 0,
  '24h': 0,
  '7d': 10 * 60 * 1000,
};

// Silencio entre dos lecturas a partir del cual la línea se corta (sensor sin reportar), en vez
// de unir con una recta un hueco de horas como si hubiera medido todo ese tiempo.
const HISTORY_RANGE_GAP_MS: Record<HistoryRange, number> = {
  '6h': 5 * 60 * 1000,
  '24h': 5 * 60 * 1000,
  '7d': 30 * 60 * 1000,
};

// Silencio a partir del cual se avisa que el sensor dejó de reportar (independiente del
// intervalo del gráfico: con puntos por minuto, 2 intervalos serían solo 2 min).
const STALE_READING_MS = 5 * 60 * 1000;

type SensorSeriesPoint = HistoricoPunto & { ts: number; xLabel: string; valorReal: number | null };

// Serie continua tipo "bolsa": cada lectura real en su instante (no valores interpolados), para
// que la línea suba y baje con lo que midió el sensor. Si el sensor deja de reportar, se inserta
// un punto nulo que corta la línea en ese hueco.
const buildSensorSeries = (
  data: HistoricoPunto[],
  range: HistoryRange,
  timeZone: string
): SensorSeriesPoint[] => {
  if (data.length === 0) return [];
  const cutoff = Date.now() - HISTORY_RANGE_LIMIT_MS[range];

  let points = data
    .map((d) => ({ ts: new Date(d.fecha).getTime(), valor: d.valor }))
    .filter((d) => Number.isFinite(d.ts) && d.ts >= cutoff && Number.isFinite(d.valor))
    .sort((a, b) => a.ts - b.ts);
  if (points.length === 0) return [];

  const bucketMs = HISTORY_RANGE_BUCKET_MS[range];
  if (bucketMs > 0) {
    const grouped = new Map<number, { sumTs: number; sum: number; n: number }>();
    for (const p of points) {
      const key = Math.floor(p.ts / bucketMs);
      const g = grouped.get(key) || { sumTs: 0, sum: 0, n: 0 };
      g.sumTs += p.ts; g.sum += p.valor; g.n += 1;
      grouped.set(key, g);
    }
    points = Array.from(grouped.values()).map((g) => ({ ts: Math.round(g.sumTs / g.n), valor: g.sum / g.n }));
  }

  const gapMs = HISTORY_RANGE_GAP_MS[range];
  const series: SensorSeriesPoint[] = [];
  const toPoint = (ts: number, valor: number | null): SensorSeriesPoint => {
    const dateObj = new Date(ts);
    const xLabel = dateObj.toLocaleString('es-PE', range === '7d'
      ? { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone }
      : { hour: '2-digit', minute: '2-digit', timeZone });
    const redondeado = valor === null ? null : Math.round(valor * 10) / 10;
    return { fecha: dateObj.toISOString(), valor: redondeado ?? 0, ts, xLabel, valorReal: redondeado };
  };
  points.forEach((p, i) => {
    if (i > 0 && p.ts - points[i - 1].ts > gapMs) {
      series.push(toPoint(points[i - 1].ts + 1, null));
    }
    series.push(toPoint(p.ts, p.valor));
  });
  return series;
};

// A diferencia de buildSensorSeries (para lecturas continuas como humedad/temperatura),
// esto NO interpola ni inventa puntos: cada evento (p. ej. un riego) vale por sí mismo y ocurre
// en un instante puntual, así que se listan tal cual quedaron en la base de datos, en su propio
// horario real, filtrados a la ventana del rango elegido.
const buildRealEventSeries = (
  data: HistoricoPunto[],
  range: HistoryRange,
  timeZone: string
): (HistoricoPunto & { xLabel: string; valorReal: number })[] => {
  if (data.length === 0) return [];
  const now = new Date().getTime();
  const cutoff = now - HISTORY_RANGE_LIMIT_MS[range];

  return data
    .filter(d => new Date(d.fecha).getTime() >= cutoff)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map(d => {
      const dateObj = new Date(d.fecha);
      const xLabel = range === '7d'
        ? dateObj.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', timeZone }) + ' ' + dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone })
        : dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone });
      return { ...d, xLabel, valorReal: d.valor };
    });
};

// Elige el rango más angosto (entre las opciones >= al solicitado) que sí tenga datos,
// para no mostrar un gráfico vacío cuando el rango seleccionado no tiene lecturas.
const resolveEffectiveRange = (
  data: HistoricoPunto[],
  requestedRange: HistoryRange,
  timeZone: string
): HistoryRange => {
  const ranges: HistoryRange[] = requestedRange === '6h'
    ? ['6h', '24h', '7d']
    : requestedRange === '24h'
      ? ['24h', '7d']
      : ['7d'];
  return ranges.find((range) => buildSensorSeries(data, range, timeZone).length > 0) || requestedRange;
};

const getDashboardYears = (cultivo: CultivoData | null) => {
  if (!cultivo) return [new Date().getFullYear().toString()];
  const dates = [
    ...Object.values(cultivo.historialSensores).flat().map((item) => item.fecha),
    ...cultivo.consumoSemanal.map((item) => item.fecha || ''),
  ];
  const years = Array.from(new Set(
    dates
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => date.getFullYear().toString())
  )).sort((a, b) => Number(b) - Number(a));
  return years.length > 0 ? years : [new Date().getFullYear().toString()];
};

export default function DashboardClient({ 
  cultivos,
  catalogPlantas = [],
  fuentesAgua = [],
  regiones = []
}: { 
  cultivos: CultivoData[];
  catalogPlantas?: any[];
  fuentesAgua?: any[];
  regiones?: any[];
}) {
  const router = useRouter();
  const [localCultivos, setLocalCultivos] = useState<CultivoData[]>(cultivos);
  const [selectedId, setSelectedId] = useState<string>(cultivos.length > 0 ? cultivos[0].idCultivo.toString() : "");
  const [isPending, startTransition] = useTransition();
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [weekdayFilter, setWeekdayFilter] = useState<CalendarFilter>('all');
  const [monthFilter, setMonthFilter] = useState<CalendarFilter>('all');
  const [yearFilter, setYearFilter] = useState<CalendarFilter>('all');
  const [filterMode, setFilterMode] = useState<FilterMode>('relative');
  // Rango de tiempo independiente por gráfico: los sensores suelen tener lecturas frecuentes y
  // sí tienen datos en 6h, mientras que el consumo de agua depende de cuándo se regó realmente;
  // forzarlos al mismo rango hacía que uno arrastrara el fallback del otro.
  const [sensorRange, setSensorRange] = useState<HistoryRange>('6h');
  const [consumoRange, setConsumoRange] = useState<HistoryRange>('6h');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');


  useEffect(() => {
    setLocalCultivos(cultivos);
    setSelectedId((current) => {
      if (cultivos.length > 0 && !cultivos.some((cultivo) => cultivo.idCultivo.toString() === current)) {
        return cultivos[0].idCultivo.toString();
      }
      return current;
    });
  }, [cultivos]);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    if (filterMode === 'calendar') return;
    if (sensorRange !== '7d' && consumoRange !== '7d') {
      setWeekdayFilter('all');
    }
    setMonthFilter('all');
    setYearFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
  }, [sensorRange, consumoRange, filterMode]);

  const hasCrops = localCultivos.length > 0;
  const cultivoActivo = hasCrops ? (localCultivos.find((c) => c.idCultivo.toString() === selectedId) || localCultivos[0]) : null;
  const recolectorActivo = hasActiveCollector(cultivoActivo);
  const isRelativeMode = filterMode === 'relative';
  const canUseWeekday = !isRelativeMode || sensorRange === '7d' || consumoRange === '7d';
  const canUseMonthYear = !isRelativeMode;
  const calendarFilters: CalendarFilters = {
    weekday: canUseWeekday ? weekdayFilter : 'all',
    month: canUseMonthYear ? monthFilter : 'all',
    year: canUseMonthYear ? yearFilter : 'all',
    startDate: canUseMonthYear ? startDateFilter : '',
    endDate: canUseMonthYear ? endDateFilter : '',
  };
  const availableYears = getDashboardYears(cultivoActivo);
  // En modo Calendario los botones de rango estan deshabilitados: los graficos deben usar todo el
  // historial cargado (7 dias) y dejar que el rango de fechas recorte; si no, seguia aplicando el
  // corte de 6h/24h y cualquier fecha anterior quedaba vacia.
  const chartSensorRange: HistoryRange = isRelativeMode ? sensorRange : '7d';
  const chartConsumoRange: HistoryRange = isRelativeMode ? consumoRange : '7d';

  // Helper for filtering sensors based on calendar filters
  const getFilteredSensor = (
    sensor: SensorData,
    history: HistoricoPunto[],
    type: 'soil_moisture' | 'env_humidity' | 'env_temp' | 'soil_temp'
  ): SensorData => {
    if (!sensor) return null;
    const hasFilter = calendarFilters.weekday !== 'all' || calendarFilters.month !== 'all' || calendarFilters.year !== 'all';
    if (!hasFilter) return sensor;

    const filteredPoints = history.filter((p) => {
      const date = new Date(p.fecha);
      return dateMatchesCalendarFilters(date, calendarFilters);
    });

    if (filteredPoints.length === 0) {
      return {
        ...sensor,
        valor: 0,
        porcentaje: sensor.porcentaje !== null ? 0 : null,
        ema: null
      };
    }

    const sum = filteredPoints.reduce((acc, p) => acc + p.valor, 0);
    const avgVal = sum / filteredPoints.length;

    let newPorcentaje = sensor.porcentaje;
    if (sensor.porcentaje !== null) {
      if (type === 'soil_moisture' || type === 'env_humidity') {
        newPorcentaje = avgVal;
      } else {
        newPorcentaje = (sensor.porcentaje / (sensor.valor || 1)) * avgVal;
      }
    }

    return {
      ...sensor,
      valor: avgVal,
      porcentaje: newPorcentaje,
      ema: null
    };
  };

  // Helper for filtering resume data based on calendar filters
  const getFilteredResumen = (): ResumenDiaData => {
    if (!cultivoActivo) return { riegosHoy: 0, litrosHoy: 0, ultimoRiego: null, humedadSueloProm: null, humedadAmbiental: null };
    const resumen = cultivoActivo.resumenDia;
    const hasFilter = calendarFilters.weekday !== 'all' || calendarFilters.month !== 'all' || calendarFilters.year !== 'all';
    if (!hasFilter) return resumen;

    const hsFiltered = cultivoActivo.historialSensores.humedadSuelo.filter((p) =>
      dateMatchesCalendarFilters(new Date(p.fecha), calendarFilters)
    );
    const avgHS = hsFiltered.length > 0 ? hsFiltered.reduce((acc, p) => acc + p.valor, 0) / hsFiltered.length : null;

    const haFiltered = cultivoActivo.historialSensores.humedadAmbiente.filter((p) =>
      dateMatchesCalendarFilters(new Date(p.fecha), calendarFilters)
    );
    const avgHA = haFiltered.length > 0 ? haFiltered.reduce((acc, p) => acc + p.valor, 0) / haFiltered.length : null;

    const consumoFiltered = cultivoActivo.consumoSemanal.filter((c) =>
      c.fecha && dateMatchesCalendarFilters(new Date(c.fecha), calendarFilters)
    );
    const avgLitros = consumoFiltered.length > 0 ? consumoFiltered.reduce((acc, c) => acc + c.valor, 0) / consumoFiltered.length : 0;

    const ultimoRiegoMatches = resumen.ultimoRiego && dateMatchesCalendarFilters(new Date(resumen.ultimoRiego), calendarFilters);

    return {
      riegosHoy: 0,
      litrosHoy: Math.round(avgLitros * 10) / 10,
      ultimoRiego: ultimoRiegoMatches ? resumen.ultimoRiego : null,
      humedadSueloProm: avgHS,
      humedadAmbiental: avgHA
    };
  };

  const filteredResumen = getFilteredResumen();
  const hasActiveFilter = calendarFilters.weekday !== 'all' || calendarFilters.month !== 'all' || calendarFilters.year !== 'all' || Boolean(calendarFilters.startDate || calendarFilters.endDate);

  // --- RENDER PRINCIPAL ---
  return (
    <Box style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s', width: '100%' }}>
      {!hasCrops ? (
        <Flex direction="column" align="center" justify="center" p="6" style={{ minHeight: '60vh', width: '100%' }}>
          <NoCropsEmptyState 
            title="No tienes cultivos registrados"
            description="Comienza registrando tu primer cultivo para monitorear sus condiciones de humedad, temperatura, y automatizar su riego inteligente."
            onAction={() => router.push('/dashboard/agricultor/cultivos')}
          />
        </Flex>
      ) : (
        cultivoActivo && (
          <Flex direction="column" gap="5" style={{ width: '100%' }}>
            {/* HEADER: Título, Selector de Cultivo y Acciones */}
            <Flex
              direction={{ initial: 'column', md: 'row' }}
              justify="between"
              align={{ initial: 'stretch', md: 'end' }}
              gap="4"
              wrap="wrap"
              style={{ width: '100%' }}
            >
              <Box>
                <Flex align="center" gap="3" mb="2" wrap="wrap">
                  <SearchableSelect
                    value={selectedId}
                    onValueChange={setSelectedId}
                    placeholder="Seleccionar cultivo"
                    searchPlaceholder="Buscar cultivo..."
                    style={{
                      width: 240,
                      height: '38px',
                      background: 'var(--surface2-mockup)',
                      borderColor: 'var(--border2-mockup)'
                    }}
                    options={localCultivos.map((c) => ({ value: c.idCultivo.toString(), label: c.nombreCultivo }))}
                  />
                </Flex>
                <Text size="2" color="gray" as="div" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sprout size={14} aria-hidden style={{ color: 'var(--green)' }} />
                  {cultivoActivo.conceptoPlanta} {cultivoActivo.etapaCrecimiento ? `· Fase ${cultivoActivo.etapaCrecimiento.toLowerCase()}` : ''}
                </Text>
              </Box>

              <Flex gap="2" align="center" wrap="wrap">
                <EstadoEnVivo cultivo={cultivoActivo} recolectorActivo={recolectorActivo} />
              </Flex>
            </Flex>

            {/* FILTROS GLOBALES DE CALENDARIO */}
            <Flex gap="3" wrap="wrap" mb="2" style={{ background: 'var(--surface-mockup)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-mockup)', width: '100%', boxSizing: 'border-box' }} align="center">
              <Text size="2" color="gray" weight="medium">Modo de tiempo:</Text>

              <Flex gap="2" style={{ background: 'var(--bg-mockup)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border2-mockup)' }}>
                <Button size="1" variant={filterMode === 'relative' ? 'solid' : 'ghost'} color="green" onClick={() => setFilterMode('relative')} style={{ cursor: 'pointer' }}>
                  Reciente
                </Button>
                <Button size="1" variant={filterMode === 'calendar' ? 'solid' : 'ghost'} color="green" onClick={() => setFilterMode('calendar')} style={{ cursor: 'pointer' }}>
                  Calendario
                </Button>
              </Flex>

              <Flex gap="2" align="center">
                <Text size="1" color="gray">Sensores:</Text>
                <Flex gap="2" style={{ background: 'var(--bg-mockup)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border2-mockup)' }}>
                  {(['6h', '24h', '7d'] as HistoryRange[]).map((range) => (
                    <Button
                      key={range}
                      size="1"
                      variant={sensorRange === range ? 'solid' : 'ghost'}
                      color="green"
                      disabled={!isRelativeMode}
                      onClick={() => setSensorRange(range)}
                      style={{ cursor: isRelativeMode ? 'pointer' : 'default', opacity: isRelativeMode ? 1 : 0.45 }}
                    >
                      {range}
                    </Button>
                  ))}
                </Flex>
              </Flex>

              <Flex gap="2" align="center">
                <Text size="1" color="gray">Consumo:</Text>
                <Flex gap="2" style={{ background: 'var(--bg-mockup)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border2-mockup)' }}>
                  {(['6h', '24h', '7d'] as HistoryRange[]).map((range) => (
                    <Button
                      key={range}
                      size="1"
                      variant={consumoRange === range ? 'solid' : 'ghost'}
                      color="sky"
                      disabled={!isRelativeMode}
                      onClick={() => setConsumoRange(range)}
                      style={{ cursor: isRelativeMode ? 'pointer' : 'default', opacity: isRelativeMode ? 1 : 0.45 }}
                    >
                      {range}
                    </Button>
                  ))}
                </Flex>
              </Flex>

              {false && <Select.Root value={weekdayFilter} onValueChange={setWeekdayFilter} disabled={!canUseWeekday}>
                <Select.Trigger style={{ background: 'var(--bg-mockup)', opacity: canUseWeekday ? 1 : 0.55, minWidth: 145 }} />
                <Select.Content>
                  {WEEKDAY_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>}

              {false && <Select.Root value={monthFilter} onValueChange={setMonthFilter} disabled={!canUseMonthYear}>
                <Select.Trigger style={{ background: 'var(--bg-mockup)', opacity: canUseMonthYear ? 1 : 0.55, minWidth: 155 }} />
                <Select.Content>
                  {MONTH_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>}

              {false && <Select.Root value={yearFilter} onValueChange={setYearFilter} disabled={!canUseMonthYear}>
                <Select.Trigger style={{ background: 'var(--bg-mockup)', opacity: canUseMonthYear ? 1 : 0.55, minWidth: 110 }} />
                <Select.Content>
                  <Select.Item value="all">Todos los años</Select.Item>
                  {(availableYears.length > 0 ? availableYears : [new Date().getFullYear().toString()]).map((year) => (
                    <Select.Item key={year} value={year}>{year}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>}

              <TextField.Root type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} disabled={!canUseMonthYear} style={{ background: 'var(--bg-mockup)', opacity: canUseMonthYear ? 1 : 0.55 }} />
              <TextField.Root type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} disabled={!canUseMonthYear} style={{ background: 'var(--bg-mockup)', opacity: canUseMonthYear ? 1 : 0.55 }} />

              {hasActiveFilter && (
                <Button size="1" color="red" variant="soft" onClick={() => { setWeekdayFilter('all'); setMonthFilter('all'); setYearFilter('all'); setStartDateFilter(''); setEndDateFilter(''); }} style={{ cursor: 'pointer', marginLeft: 'auto' }}>
                  Limpiar filtros
                </Button>
              )}
              <Text size="1" color="gray" style={{ marginLeft: 'auto' }}>
                {filterMode === 'relative'
                  ? ((sensorRange === '7d' || consumoRange === '7d') ? 'En 7d solo se habilita dia de semana.' : 'Calendario deshabilitado en rangos cortos.')
                  : 'Mes, anio y dia habilitados para historico.'}
              </Text>
            </Flex>

            {/* ROW 1: Cuadrícula de Sensores Principales */}
            <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4" style={{ width: '100%' }}>
              <SensorCard sensor={getFilteredSensor(cultivoActivo.sensores.humedadSuelo, cultivoActivo.historialSensores.humedadSuelo, 'soil_moisture')} type="soil_moisture" />
              <SensorCard sensor={getFilteredSensor(cultivoActivo.sensores.humedadAmbiente, cultivoActivo.historialSensores.humedadAmbiente, 'env_humidity')} type="env_humidity" />
              <SensorCard sensor={getFilteredSensor(cultivoActivo.sensores.temperaturaAmbiente, cultivoActivo.historialSensores.temperaturaAmbiente, 'env_temp')} type="env_temp" />
              <SensorCard sensor={getFilteredSensor(cultivoActivo.sensores.temperaturaSuelo, cultivoActivo.historialSensores.temperaturaSuelo, 'soil_temp')} type="soil_temp" />
            </Grid>

            {/* ROW 2: Gráfico Histórico (2/3) + Estado y Tanque (1/3) */}
            <Flex direction={{ initial: 'column', lg: 'row' }} gap="4" style={{ width: '100%' }}>
              <Box style={{ flex: 2, minWidth: 0 }}>
                <HistoricoSensoresCard 
                  historial={cultivoActivo.historialSensores} 
                  sensores={cultivoActivo.sensores} 
                  isClientMounted={isClientMounted}
                  timeRange={chartSensorRange}
                  calendarFilters={calendarFilters}
                  cultivoTimezone={cultivoActivo.zonaHoraria}
                />
              </Box>
              <Flex direction="column" gap="4" style={{ flex: 1, minWidth: 0 }}>
                <EstadoSistemaCard dispositivos={cultivoActivo.dispositivos} />
                {cultivoActivo.esConexionDirecta || cultivoActivo.fuenteAgua?.tipo === 'conexion_directa' ? (
                  <ConexionDirectaCard fuenteAgua={cultivoActivo.fuenteAgua} />
                ) : (
                  cultivoActivo.tanque && <TanqueCard tanque={cultivoActivo.tanque} />
                )}
              </Flex>
            </Flex>

            {/* ROW 3: Gráfico Consumo Semanal (2/3) + Resumen Diario (1/3) */}
            <Flex direction={{ initial: 'column', lg: 'row' }} gap="4" style={{ width: '100%' }}>
              <Box style={{ flex: 2, minWidth: 0 }}>
                {cultivoActivo.consumoSemanal && (
                  <ConsumoChartCard
                    data={cultivoActivo.consumoSemanal}
                    eventos={cultivoActivo.historialConsumo || []}
                    limite={cultivoActivo.limiteConsumo}
                    isClientMounted={isClientMounted}
                    timeRange={chartConsumoRange}
                    calendarFilters={calendarFilters}
                    cultivoTimezone={cultivoActivo.zonaHoraria}
                  />
                )}
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <ResumenDiaCard 
                  resumen={filteredResumen} 
                  sensores={{
                    humedadSuelo: getFilteredSensor(cultivoActivo.sensores.humedadSuelo, cultivoActivo.historialSensores.humedadSuelo, 'soil_moisture'),
                    humedadAmbiente: getFilteredSensor(cultivoActivo.sensores.humedadAmbiente, cultivoActivo.historialSensores.humedadAmbiente, 'env_humidity'),
                    temperaturaAmbiente: getFilteredSensor(cultivoActivo.sensores.temperaturaAmbiente, cultivoActivo.historialSensores.temperaturaAmbiente, 'env_temp'),
                    temperaturaSuelo: getFilteredSensor(cultivoActivo.sensores.temperaturaSuelo, cultivoActivo.historialSensores.temperaturaSuelo, 'soil_temp')
                  }} 
                  isClientMounted={isClientMounted} 
                  hasFilter={hasActiveFilter}
                />
              </Box>
            </Flex>
          </Flex>
        )
      )}
    </Box>
  );

}

// ==========================================
// SUB-COMPONENTES EXTRAÍDOS AL ÁMBITO GLOBAL
// ==========================================

// --- HELPER: TIEMPO TRANSCURRIDO ---
const getTimeAgo = (date: Date | null) => {
  if (!date) return 'Sin datos';
  const diffMins = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
  if (diffMins < 1) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h ${diffMins % 60 > 0 ? `${diffMins % 60}min` : ''}`;
  return `hace ${Math.floor(diffHours / 24)} día(s)`;
};

// --- ESTADO REAL DEL FLUJO DE DATOS ---
// "En vivo" solo si la última lectura es reciente y el canal en tiempo real
// está conectado; antes bastaba con que el colector estuviera activado.
const ESTADO_TONOS = {
  green: { bg: 'var(--greenbg)', fg: 'var(--green)', brd: 'var(--greenbrd)' },
  amber: { bg: 'var(--amberbg)', fg: 'var(--amber)', brd: 'var(--amberbrd)' },
  red: { bg: 'var(--redbg)', fg: '#fca5a5', brd: 'var(--redbrd)' },
  gray: { bg: 'rgba(255, 255, 255, 0.04)', fg: 'var(--muted-foreground)', brd: 'var(--border2-mockup)' },
} as const;

const EstadoEnVivo = ({ cultivo, recolectorActivo }: { cultivo: CultivoData; recolectorActivo: boolean }) => {
  const ahora = useAhora(1000);
  const wsConectado = useWsConectado();
  const estado = estadoFlujo({ ultimaLectura: ultimaLecturaMs(cultivo), recolectorActivo, wsConectado, ahora });
  const c = ESTADO_TONOS[estado.t];
  return (
    <Flex
      align="center"
      gap="2"
      role="status"
      aria-live="polite"
      title={estado.detalle}
      style={{
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.brd}`,
        padding: '6px 12px',
        borderRadius: '999px',
        fontSize: '13px',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <StatusDot t={estado.t} pulse={estado.pulso} />
      <span>{estado.texto}</span>
      {estado.t === 'green' && (
        <span style={{ fontWeight: 500, opacity: 0.8 }}>· {estado.detalle.replace('Última lectura ', '')}</span>
      )}
    </Flex>
  );
};

const HaceTiempo = ({ fecha }: { fecha: Date | string | null | undefined }) => {
  const ahora = useAhora(1000);
  const t = fecha ? new Date(fecha).getTime() : NaN;
  if (!Number.isFinite(t)) return null;
  return <>{haceTiempo(ahora - t)}</>;
};

// --- SUB-COMPONENTE: TARJETA DE SENSOR ---
const SensorCard = ({ sensor, type }: { sensor: SensorData; type: 'soil_moisture' | 'env_humidity' | 'env_temp' | 'soil_temp' }) => {
  // Destello breve cuando llega una lectura nueva (cambia la fecha), sin
  // animar la primera carga. Reloj lento solo para detectar sensor obsoleto.
  const fechaMs = sensor?.fecha ? new Date(sensor.fecha).getTime() : null;
  const fechaPrevia = useRef<number | null>(fechaMs);
  const [destello, setDestello] = useState(0);
  useEffect(() => {
    if (fechaMs !== null && fechaPrevia.current !== null && fechaMs > fechaPrevia.current) {
      setDestello((n) => n + 1);
    }
    fechaPrevia.current = fechaMs;
  }, [fechaMs]);
  const ahoraLento = useAhora(15_000);
  const obsoleto = fechaMs !== null && ahoraLento - fechaMs > LIMITE_SENSOR_OBSOLETO_MS;

  if (!sensor) return (
    <Card size="2" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderStyle: 'dashed', borderRadius: '14px' }}>
      <Flex align="center" gap="2">
        <Activity size={16} aria-hidden style={{ color: 'var(--muted-foreground)' }} />
        <Text size="2" color="gray">Sensor sin datos</Text>
      </Flex>
    </Card>
  );

  const metricNameMap = {
    soil_moisture: 'Humedad de Suelo',
    env_humidity: 'Humedad del Ambiente',
    env_temp: 'Temperatura del Ambiente',
    soil_temp: 'Temperatura de Suelo'
  };

  const metricUnitMap = {
    soil_moisture: '%',
    env_humidity: '%',
    env_temp: '°C',
    soil_temp: '°C'
  };

  const metricaNombre = metricNameMap[type];
  const metricaUnidad = metricUnitMap[type];

  const formatObjetivo = () => {
    if (!sensor.umbral || (sensor.umbral.min === null && sensor.umbral.max === null)) return 'No definido';
    if (sensor.umbral.min !== null && sensor.umbral.max !== null) return `${sensor.umbral.min} - ${sensor.umbral.max}${metricaUnidad}`;
    if (sensor.umbral.min !== null) return `Mín. ${sensor.umbral.min}${metricaUnidad}`;
    return `Máx. ${sensor.umbral.max}${metricaUnidad}`;
  };

  const fuera = sensor.umbral && (
    (sensor.umbral.min !== null && sensor.valor < sensor.umbral.min) ||
    (sensor.umbral.max !== null && sensor.valor > sensor.umbral.max)
  );

  const themeMap = {
    soil_moisture: { border: 'var(--greenbrd)', color: 'var(--green)', bg: 'var(--greenbg)', icon: Droplets },
    env_humidity: { border: 'var(--tealbrd)', color: 'var(--teal)', bg: 'var(--tealbg)', icon: CloudFog },
    env_temp: { border: 'var(--amberbrd)', color: 'var(--amber)', bg: 'var(--amberbg)', icon: ThermometerSun },
    soil_temp: { border: 'var(--bluebrd)', color: 'var(--blue)', bg: 'var(--bluebg)', icon: Thermometer }
  };

  const theme = themeMap[type];
  const cardBorder = fuera ? 'var(--redbrd)' : theme.border;
  const valueColor = fuera ? 'var(--red)' : theme.color;
  const MetricIcon = theme.icon;

  return (
    <Card
      key={destello}
      size="2"
      className={destello > 0 ? 'live-flash' : undefined}
      style={{
        background: 'var(--surface-mockup)',
        border: `1px solid ${fuera && !obsoleto ? cardBorder : 'var(--border-mockup)'}`,
        borderRadius: '14px',
        opacity: obsoleto ? 0.6 : 1,
        transition: 'opacity 300ms ease',
      }}
    >
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2">
          <Flex align="center" gap="2" style={{ minWidth: 0 }}>
            <span aria-hidden style={{ width: 28, height: 28, borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MetricIcon size={15} />
            </span>
            <Text size="2" weight="medium" style={{ color: 'var(--foreground)' }} truncate>{metricaNombre}</Text>
          </Flex>
        </Flex>

        <Box>
          <Flex align="baseline" gap="1" wrap="wrap">
            <Text size={{ initial: "7", md: "8" }} weight="bold" className="tabular-nums" style={{ color: valueColor, letterSpacing: '-0.03em', lineHeight: 1 }}>{sensor.valor.toFixed(1)}</Text>
            <Text size={{ initial: "3", sm: "4" }} style={{ color: valueColor }} weight="medium">{metricaUnidad}</Text>
          </Flex>
        </Box>

        <Box mt="2">
          <Flex justify="between" align="center" mb="2" gap="2">
            <Text size="1" color="gray" className="tabular-nums">Objetivo: {formatObjetivo()}</Text>
            <Badge color={fuera ? "red" : "green"} variant="soft" size="1">{fuera ? "Fuera de rango" : "Óptimo"}</Badge>
          </Flex>
          {sensor.porcentaje !== null && (
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(Math.max(sensor.porcentaje, 0), 100)}%`, background: valueColor, borderRadius: '2px' }} />
            </div>
          )}
          <Flex justify="between" align="center" gap="2" mt="2">
            <Text size="1" truncate style={{ color: 'var(--muted-foreground)', minWidth: 0 }} title={sensor.modelo}>{sensor.modelo}</Text>
            <Text
              size="1"
              className="tabular-nums"
              style={{ color: obsoleto ? 'var(--amber)' : 'var(--muted-foreground)', flexShrink: 0 }}
              title={sensor.fecha ? new Date(sensor.fecha).toLocaleString('es-PE') : undefined}
            >
              {obsoleto ? 'Sin datos ' : ''}<HaceTiempo fecha={sensor.fecha} />
            </Text>
          </Flex>
        </Box>
      </Flex>
    </Card>
  );
};

// --- SUB-COMPONENTE: GRÁFICO HISTÓRICO ---
const HistoricoSensoresCard = ({ 
  historial, 
  sensores, 
  isClientMounted, 
  timeRange,
  calendarFilters,
  cultivoTimezone,
}: { 
  historial: HistorialData; 
  sensores: any; 
  isClientMounted: boolean; 
  timeRange: HistoryRange;
  calendarFilters: CalendarFilters;
  cultivoTimezone?: string;
}) => {
  const [activeMetric, setActiveMetric] = useState<'humedadSuelo' | 'humedadAmbiente' | 'temperaturaSuelo' | 'temperaturaAmbiente'>('humedadSuelo');

  const metricConfig = {
    humedadSuelo: { title: 'Humedad del suelo', color: '#22c55e', key: 'humedadSuelo', isPercentage: true, umbralRef: 'min' },
    humedadAmbiente: { title: 'Humedad ambiente', color: '#3b82f6', key: 'humedadAmbiente', isPercentage: true, umbralRef: 'max' },
    temperaturaSuelo: { title: 'Temperatura suelo', color: '#f97316', key: 'temperaturaSuelo', isPercentage: false, umbralRef: 'max' },
    temperaturaAmbiente: { title: 'Temperatura ambiente', color: '#ef4444', key: 'temperaturaAmbiente', isPercentage: false, umbralRef: 'max' }
  };

  const config = metricConfig[activeMetric];
  const rawData = historial[activeMetric as keyof HistorialData];
  const sensorInfo = sensores[activeMetric as keyof typeof sensores];
  const chartTimeZone = cultivoTimezone || DEFAULT_DASHBOARD_TIME_ZONE;

  const calendarFilteredData = rawData.filter((item) => {
    const date = new Date(item.fecha);
    return dateMatchesCalendarFilters(date, calendarFilters);
  });

  const effectiveRange = resolveEffectiveRange(calendarFilteredData, timeRange, chartTimeZone);
  const chartData = buildSensorSeries(calendarFilteredData, effectiveRange, chartTimeZone);
  const umbralVisual = sensorInfo?.umbral ? sensorInfo.umbral[config.umbralRef] : null;

  // Si la última lectura real quedó bastante antes de ahora, se avisa: el gráfico ya no
  // extiende una línea plana falsa hasta el presente, así que sin este aviso parecería
  // que simplemente "no hay más puntos" en vez de que el sensor dejó de reportar.
  const lastPointMs = chartData.length > 0 ? new Date(chartData[chartData.length - 1].fecha).getTime() : null;
  const isStale = lastPointMs !== null && (Date.now() - lastPointMs) > STALE_READING_MS;
  const lastPointLabel = lastPointMs !== null
    ? new Date(lastPointMs).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: chartTimeZone })
    : null;

  return (
    <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '14px', height: '100%' }}>
      <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
        <Flex gap="3" align="center">
          <IconTile icon={Activity} t="green" />
          <Select.Root value={activeMetric} onValueChange={(val: any) => setActiveMetric(val)}>
            <Select.Trigger variant="ghost" aria-label="Métrica del gráfico" style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '1rem' }} />
            <Select.Content>
              <Select.Item value="humedadSuelo">Humedad del suelo</Select.Item>
              <Select.Item value="humedadAmbiente">Humedad ambiente</Select.Item>
              <Select.Item value="temperaturaSuelo">Temperatura suelo</Select.Item>
              <Select.Item value="temperaturaAmbiente">Temperatura ambiente</Select.Item>
            </Select.Content>
          </Select.Root>
          <Text size="2" color="gray">últimas {effectiveRange}</Text>
        </Flex>
      </Flex>

      {/* Filtros movidos al nivel de página principal */}

      {effectiveRange !== timeRange && (
        <Text size="1" color="gray" mb="1" as="div">
          Sin datos en {timeRange}; mostrando {effectiveRange}.
        </Text>
      )}

      {isStale && lastPointLabel && (
        <Text size="1" color="amber" mb="3" as="div" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={13} aria-hidden />
          Sin lecturas recientes: la última fue el {lastPointLabel}.
        </Text>
      )}

      {chartData.length === 0 ? (
        <Flex align="center" justify="center" style={{ height: '250px' }}>
          <Text color="gray">No hay datos históricos en este rango de tiempo.</Text>
        </Flex>
      ) : !isClientMounted ? (
        <Flex align="center" justify="center" style={{ height: '250px' }}>
          <Text color="gray">Cargando gráfico...</Text>
        </Flex>
      ) : (
        <DashboardHistoryChart chartData={chartData} config={config} umbralVisual={umbralVisual} timeZone={chartTimeZone} range={effectiveRange} />
      )}
    </Card>
  );
};

// --- SUB-COMPONENTE: ESTADO DEL SISTEMA ---
const EstadoSistemaCard = ({ dispositivos }: { dispositivos: DispositivoData[] }) => {
  return (
    <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '14px' }}>
      <Flex justify="between" align="center" mb="3">
        <Flex align="center" gap="3">
          <IconTile icon={Cpu} t="green" />
          <Text size="3" weight="bold" style={{ color: 'var(--foreground)' }}>
            Estado del sistema
          </Text>
        </Flex>
        <Badge color="gray" variant="soft" className="tabular-nums">
          {dispositivos.length} {dispositivos.length === 1 ? 'dispositivo' : 'dispositivos'}
        </Badge>
      </Flex>
      {dispositivos.length === 0 ? (
        <Text color="gray" size="2">No hay dispositivos asignados.</Text>
      ) : (
        <ScrollArea type="auto" style={{ maxHeight: '110px', paddingRight: '4px' }}>
          <Flex direction="column" gap="2.5">
            {dispositivos.map((disp, index) => {
              const isOnline = disp.estado === 'activo' || disp.funcionamientoActivo === true;
              return (
                <Flex key={disp.id} justify="between" align="center" style={{ borderBottom: index !== dispositivos.length - 1 ? '1px solid var(--border-mockup)' : 'none', paddingBottom: index !== dispositivos.length - 1 ? '10px' : '0' }}>
                  <Flex align="center" gap="3">
                    <StatusDot t={isOnline ? 'green' : 'red'} />
                    <Text size="2" style={{ color: 'var(--foreground)' }}>{disp.nombre}</Text>
                  </Flex>
                  <Badge color={isOnline ? 'green' : 'red'} variant="soft" size="1">
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </Flex>
              );
            })}
          </Flex>
        </ScrollArea>
      )}
    </Card>
  );
};

// --- SUB-COMPONENTE: TARJETA DE CONEXIÓN DIRECTA ---
const ConexionDirectaCard = ({ fuenteAgua }: { fuenteAgua?: { id?: number; nombre?: string; tipo?: string } | null }) => {
  return (
    <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '14px' }}>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Text size="3" weight="bold" style={{ color: 'var(--foreground)' }}>
            {fuenteAgua?.nombre || 'Fuente de Agua'}
          </Text>
          <Badge color="cyan" variant="soft" style={{ borderRadius: '6px' }}>
            Conexión directa
          </Badge>
        </Flex>

        <Flex align="center" gap="3">
          <IconTile icon={Waves} t="blue" size={42} />
          <Box>
            <Text size="2" weight="bold" style={{ color: 'var(--foreground)' }} as="div">
              Suministro de Red Continua
            </Text>
            <Text size="1" color="gray" as="div">
              Medición de consumo con flujómetro YF-S201
            </Text>
          </Box>
        </Flex>

        <Flex justify="between" align="center" style={{ borderTop: '1px solid var(--border-mockup)', paddingTop: '8px' }}>
          <Text size="1" color="gray">
            Apertura por electroválvula
          </Text>
          <Badge color="green" variant="soft" size="1">
            Red Disponible
          </Badge>
        </Flex>
      </Flex>
    </Card>
  );
};

// --- SUB-COMPONENTE: TARJETA DEL TANQUE ---
const TanqueCard = ({ tanque }: { tanque: TanqueData }) => {
  const [bombaActiva, setBombaActiva] = useState(tanque?.bombaEncendida || false);

  useEffect(() => {
    if (tanque) {
      setBombaActiva(tanque.bombaEncendida);
    }
  }, [tanque?.bombaEncendida]);

  if (!tanque) return null;

  if (tanque.dispositivoActivo === false) {
    return (
      <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--amberbrd)', borderRadius: '14px' }}>
        <Flex direction="column" gap="3" align="center" style={{ textAlign: 'center', padding: '8px' }}>
          <IconTile icon={AlertTriangle} t="amber" size={40} />
          <Box>
            <Text size="3" weight="bold" color="amber" as="div" mb="2">
              Dispositivo del Tanque Inactivo
            </Text>
            <Text size="2" color="gray" as="div" mb="3">
              Para visualizar el nivel de agua ({tanque.nombre}), los litros disponibles y el porcentaje en vivo, debes activar la captura de datos de este dispositivo.
            </Text>
            <Text size="1" color="amber" weight="medium">Actívalo en la sección de Control.</Text>
          </Box>
        </Flex>
      </Card>
    );
  }


  return (
    <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '14px' }}>
      <Flex direction="column" gap="2">
        <Box>
          <Flex align="center" gap="3">
            <IconTile icon={Gauge} t="blue" />
            <Text size="3" weight="bold" style={{ color: 'var(--foreground)' }} as="div">{tanque.nombre}</Text>
          </Flex>
          <Flex align="baseline" gap="2" mt="3">
            <Text size="8" weight="bold" color="sky" className="tabular-nums" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>{tanque.litrosActuales}</Text>
            <Text size="3" color="gray" weight="medium">/ {tanque.litrosTotales} L</Text>
          </Flex>
          <Box mt="1">
            <Progress value={tanque.porcentaje} size="2" color={tanque.porcentaje < 20 ? 'red' : 'sky'} aria-label="Nivel del tanque" />
            <Text size="1" color="gray" mt="2" as="div" className="tabular-nums">{tanque.porcentaje}% · {tanque.sensorModelo.replace('Sensor Ultrasónico ', '')} · Nivel {tanque.estadoNivel}</Text>
          </Box>
        </Box>
      </Flex>
    </Card>
  );
};

// --- SUB-COMPONENTE: GRÁFICO DE CONSUMO ---
const ConsumoChartCard = ({
  data,
  eventos,
  limite,
  isClientMounted,
  timeRange,
  calendarFilters,
  cultivoTimezone,
}: {
  data: ConsumoData[];
  eventos?: HistoricoPunto[];
  limite: number | null;
  isClientMounted: boolean;
  timeRange?: HistoryRange;
  calendarFilters: CalendarFilters;
  cultivoTimezone?: string;
}) => {
  const chartTimeZone = cultivoTimezone || DEFAULT_DASHBOARD_TIME_ZONE;
  const requestedRange: HistoryRange = timeRange || '7d';
  const calendarFilteredData = data.filter((item) => {
    if (!item.fecha) return true;
    const date = new Date(item.fecha);
    return dateMatchesCalendarFilters(date, calendarFilters);
  });

  // Eventos reales de riego (fecha + litros de cada riego individual). El total diario de
  // `data` (consumoSemanal) solo sirve para la vista de 7 días; para 6h/24h se listan estos
  // eventos reales tal cual ocurrieron (sin interpolar ni rellenar huecos: cada riego es un
  // hecho puntual, no una lectura continua), para que el gráfico muestre datos reales de la
  // base de datos y responda al filtro de tiempo.
  const calendarFilteredEventos: HistoricoPunto[] = (eventos || []).filter((item) =>
    dateMatchesCalendarFilters(new Date(item.fecha), calendarFilters)
  );

  const ranges: HistoryRange[] = requestedRange === '6h' ? ['6h', '24h', '7d'] : requestedRange === '24h' ? ['24h', '7d'] : ['7d'];
  const effectiveRange = ranges.find((range) => (
    range === '7d'
      ? calendarFilteredData.length > 0
      : buildRealEventSeries(calendarFilteredEventos, range, chartTimeZone).length > 0
  )) || requestedRange;

  const chartData = effectiveRange === '7d'
    ? calendarFilteredData.map(d => {
        const dateObj = d.fecha ? new Date(d.fecha) : new Date();
        const xLabel = d.label === 'Hoy' ? 'Hoy' : (d.label || dateObj.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', timeZone: chartTimeZone }));
        return { ...d, xLabel, valorReal: d.valor };
      })
    : buildRealEventSeries(calendarFilteredEventos, effectiveRange, chartTimeZone);

  const config = {
    title: 'Consumo de agua',
    color: '#38bdf8', // sky-400
  };

  const rangeLabel = effectiveRange === '7d' ? 'últimos 7 días' : effectiveRange === '24h' ? 'últimas 24h' : 'últimas 6h';

  return (
    <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '14px', height: '100%' }}>
      <Flex align="center" gap="3" mb="3">
        <IconTile icon={Droplets} t="blue" />
        <Text size="3" weight="bold" style={{ color: 'var(--foreground)' }} as="div">
          Consumo de agua <Text size="2" color="gray" weight="regular">· {rangeLabel}</Text>
        </Text>
      </Flex>

      {effectiveRange !== requestedRange && (
        <Text size="1" color="gray" mb="3" as="div">
          Sin datos en {requestedRange}; mostrando {effectiveRange}.
        </Text>
      )}

      {chartData.length === 0 ? (
        <Flex align="center" justify="center" style={{ height: '250px' }}>
          <Text color="gray">No hay datos de consumo en este rango de tiempo.</Text>
        </Flex>
      ) : !isClientMounted ? (
        <Flex align="center" justify="center" style={{ height: '250px' }}>
          <Text color="gray">Cargando gráfico...</Text>
        </Flex>
      ) : (
        <DashboardConsumptionChart chartData={chartData} config={config} limite={limite} />
      )}
    </Card>
  );
};
// --- SUB-COMPONENTE: RESUMEN DEL DÍA ---
const ResumenDiaCard = ({ 
  resumen, 
  sensores, 
  isClientMounted,
  hasFilter 
}: { 
  resumen: ResumenDiaData; 
  sensores: any; 
  isClientMounted: boolean;
  hasFilter: boolean;
}) => {
  const sensoresEvaluados = [
    sensores?.humedadSuelo,
    sensores?.humedadAmbiente,
    sensores?.temperaturaAmbiente,
    sensores?.temperaturaSuelo
  ];

  const sensoresActivos = sensoresEvaluados.filter(
    s => s && s.valor !== null && s.valor !== undefined
  );
  const tieneLecturas = sensoresActivos.length > 0;

  let salud = 100;
  if (tieneLecturas) {
    const sensoresConUmbral = sensoresActivos.filter(s => s.umbral);
    if (sensoresConUmbral.length > 0) {
      const enRango = sensoresConUmbral.filter(
        s => s.valor >= s.umbral.min && s.valor <= s.umbral.max
      ).length;
      salud = Math.round((enRango / sensoresConUmbral.length) * 100);
    } else {
      salud = 100;
    }
  } else {
    salud = 0;
  }

  const saludData = tieneLecturas ? [
    { name: 'Salud', value: salud },
    { name: 'Faltante', value: 100 - salud }
  ] : [
    { name: 'Sin datos', value: 100 }
  ];

  const getSaludColor = (val: number, hasData: boolean) => {
    if (!hasData) return '#64748b';
    if (val >= 90) return '#22c55e';
    if (val >= 70) return '#2dd4bf';
    if (val >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getSaludTexto = (val: number, hasData: boolean) => {
    if (!hasData) return 'Sin lecturas';
    if (val >= 90) return 'Excelente';
    if (val >= 70) return 'Estable';
    if (val >= 50) return 'Advertencia';
    return 'Crítico';
  };

  const colorSalud = getSaludColor(salud, tieneLecturas);
  const textoSalud = getSaludTexto(salud, tieneLecturas);

  const Row = ({ label, value, color = 'var(--foreground)', isLast = false }: { label: string, value: string, color?: string, isLast?: boolean }) => (
    <Flex justify="between" align="center" py="2" style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-mockup)' }}>
      <Text size="2" color="gray">{label}</Text>
      <Text size="2" weight="bold" className="tabular-nums" style={{ color }}>{value}</Text>
    </Flex>
  );

  return (
    <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '14px', height: '100%' }}>
      <Flex align="center" gap="3" mb="3">
        <IconTile icon={Gauge} t="green" />
        <Text size="3" weight="bold" style={{ color: 'var(--foreground)' }} as="div">Resumen del día</Text>
      </Flex>

      <Flex direction="column" align="center" mb="2" style={{ position: 'relative', width: '100%', minWidth: 0, height: '110px' }}>
        {!isClientMounted ? (
          <Flex align="center" justify="center" style={{ width: '100%', height: '110px' }}>
            <Text color="gray">Cargando gráfico...</Text>
          </Flex>
        ) : (
          <DashboardHealthGauge saludData={saludData} colorSalud={colorSalud} />
        )}
        <div style={{
          position: 'absolute',
          bottom: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          width: '100%'
        }}>
          <Text size="6" weight="bold" className="tabular-nums" style={{ color: 'white', display: 'block', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {tieneLecturas ? `${salud}%` : '--'}
          </Text>
          <Text size="1" weight="medium" style={{ color: colorSalud, marginTop: '4px', display: 'inline-block' }}>
            {tieneLecturas ? `Salud: ${textoSalud}` : 'Sin telemetría'}
          </Text>
        </div>
      </Flex>

      <Box>
        <Row label={hasFilter ? "Riegos prom. diario" : "Riegos hoy"} value={hasFilter ? "--" : `${resumen.riegosHoy} evento${resumen.riegosHoy !== 1 ? 's' : ''}`} />
        <Row label={hasFilter ? "Consumo prom. diario" : "Litros consumidos"} value={`${resumen.litrosHoy} L`} />
        <Row label="Último riego" value={getTimeAgo(resumen.ultimoRiego)} color="var(--blue)" />
        <Row label="Hum. suelo prom." value={resumen.humedadSueloProm !== null ? `${resumen.humedadSueloProm.toFixed(1)}%` : '--'} color="var(--green)" />
        <Row label="Hum. ambiental" value={resumen.humedadAmbiental !== null ? `${resumen.humedadAmbiental.toFixed(1)}%` : '--'} color="var(--green)" isLast />
      </Box>
    </Card>
  );
};
