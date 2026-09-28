// src/components/agricultor/historico/HistoricoMultiChart.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';

import { Box, Text, Flex, Card, Button, Grid, ScrollArea, Select, TextField } from '@radix-ui/themes';
import { Activity, BarChart3, Droplets, Sigma } from 'lucide-react';
import { IconTile } from '@/components/ui/yaku-ui';
import HistoricoMultiLineChart from '@/components/charts/HistoricoMultiLineChart';
import type { HistoricoResponse } from '@/services/historico';
import { obtenerDatosHistoricoPorCultivo } from '@/actions/historico';
import SearchableSelect from '@/components/ui/SearchableSelect';

type CultivoBasico = { id: number; nombre_planta: string; };
type SensorStat = { sensor: string; min: number | null; prom: number | null; max: number | null; };
type FilterMode = 'relative' | 'calendar';

const WEEKDAY_OPTIONS = [
  { value: 'all', label: 'Todos los días' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
];

// Rangos del modo "Reciente" (value = dias que se piden al backend; 0 = 6 horas).
const RELATIVE_OPTIONS = [
  { label: '6h', value: 0 },
  { label: '24h', value: 1 },
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
];

const formatDateLabel = (value: string) => {
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
};

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

export default function HistoricoMultiChart({ 
  userId,
  cultivos, 
  initialData, 
  initialCultivo, 
  initialRango 
}: { 
  userId: number,
  cultivos: CultivoBasico[], 
  initialData: HistoricoResponse, 
  initialCultivo: string, 
  initialRango: number 
}) {

  const [idCultivo, setIdCultivo] = useState(initialCultivo);
  const [rango, setRango] = useState(initialRango);
  const [dataState, setDataState] = useState(initialData);
  const [isLoadingData, setIsLoadingData] = useState(false);
const [filterMode, setFilterMode] = useState<FilterMode>('relative');

  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const { chartData = [], stats, riegoLog = [] } = dataState;
  const isRelativeMode = filterMode === 'relative';
  const dateRangeEnabled = !isRelativeMode;
  const canUseWeekday = dateRangeEnabled;
  const canUseMonthYear = dateRangeEnabled;
  const availableYears: string[] = [];

  const relativeLabel = rango === 0 ? '6 horas' : rango === 1 ? '24 horas' : `${rango} días`;
  const calendarLabel = startDateFilter && endDateFilter
      ? `del ${formatDateLabel(startDateFilter)} al ${formatDateLabel(endDateFilter)}`
      : startDateFilter
        ? `desde el ${formatDateLabel(startDateFilter)}`
        : endDateFilter
          ? `hasta el ${formatDateLabel(endDateFilter)}`
          : 'del último año';

  const matchesDateRange = (date: Date) => {
    if (isNaN(date.getTime())) return false;
    if (!dateRangeEnabled) return true;
    if (startDateFilter) {
      const start = new Date(`${startDateFilter}T00:00:00`);
      if (date < start) return false;
    }
    if (endDateFilter) {
      const end = new Date(`${endDateFilter}T23:59:59`);
      if (date > end) return false;
    }
    return true;
  };

  // Filter chart data. El backend manda los buckets diarios como 'YYYY-MM-DD': new Date() los
  // leeria como medianoche UTC (el dia anterior en Lima) y el filtro se correria un dia.
  const filteredChartData = useMemo(() => {
    return chartData.filter(item => {
      const raw = item.fecha || item.label;
      const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw.replace(' ', 'T'));
      return matchesDateRange(date);
    });
  }, [chartData, startDateFilter, endDateFilter, dateRangeEnabled]);

  // Filter irrigation logs
  const filteredRiegoLog = useMemo(() => {
    return riegoLog.filter(log => {
      let date: Date;
      if (log.fecha) {
        date = new Date(log.fecha);
      } else if (log.fechaStr.includes('-')) {
        date = new Date(log.fechaStr.replace(' ', 'T'));
      } else {
        const parts = log.fechaStr.split(' ')[0].split('/');
        const timeParts = log.fechaStr.split(' ')[1] || '00:00';
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${timeParts}`);
      }
      if (isNaN(date.getTime())) return true;
      return matchesDateRange(date);
    });
  }, [riegoLog, startDateFilter, endDateFilter, dateRangeEnabled]);

  // Compute stats helper
  const computeStatsForField = (filteredData: any[], field: string, sensorName: string) => {
    const values = filteredData
      .map(item => item[field])
      .filter(val => val !== null && val !== undefined);

    if (values.length === 0) {
      return { sensor: sensorName, min: null, prom: null, max: null };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    const prom = sum / values.length;

    return { sensor: sensorName, min, prom, max };
  };

  const activeStats = useMemo(() => {
    if (!stats) return null;
    return {
      humedadSuelo: computeStatsForField(filteredChartData, 'humedadSuelo', stats.humedadSuelo?.sensor || 'Humedad Suelo'),
      humedadAmbiente: computeStatsForField(filteredChartData, 'humedadAmbiente', stats.humedadAmbiente?.sensor || 'Humedad Ambiente'),
      temperaturaAmbiente: computeStatsForField(filteredChartData, 'temperaturaAmbiente', stats.temperaturaAmbiente?.sensor || 'Temp. Ambiente'),
      temperaturaSuelo: computeStatsForField(filteredChartData, 'temperaturaSuelo', stats.temperaturaSuelo?.sensor || 'Temp. Suelo'),
    };
  }, [stats, filteredChartData]);

  const fetchNewData = async (newCultivo: string, newRango: number) => {
    setIsLoadingData(true);
    setIdCultivo(newCultivo);
    setRango(newRango);
    setStartDateFilter('');
    setEndDateFilter('');
    try {
      const res = await obtenerDatosHistoricoPorCultivo(userId, Number(newCultivo), newRango);
      if (res.success && res.data) {
        setDataState(res.data);
      } else {
        alert(res.error || "Error al cargar los datos históricos.");
      }
    } catch {
      alert("Error de conexión al cargar datos.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCultivoChange = (val: string) => {
    fetchNewData(val, rango);
  };

  const handleRangoChange = (newRango: number) => {
    setFilterMode('relative');
    fetchNewData(idCultivo, newRango);
  };

  const handleModeChange = (mode: FilterMode) => {
    setFilterMode(mode);
    setStartDateFilter('');
    setEndDateFilter('');
    if (mode === 'relative' && !RELATIVE_OPTIONS.some((option) => option.value === rango)) {
      fetchNewData(idCultivo, 7);
      return;
    }
    if (mode === 'calendar' && rango < 365) {
      fetchNewData(idCultivo, 365);
    }
  };

  useEffect(() => {
    setIdCultivo(initialCultivo);
    setRango(initialRango);
    setDataState(initialData);
  }, [initialCultivo, initialRango, initialData]);

  useEffect(() => {
    if (filterMode === 'relative') {
      setStartDateFilter('');
      setEndDateFilter('');
    }
  }, [filterMode, rango]);



  const StatRow = ({ label, color, stat, isLast = false }: { label: string, color: string, stat: SensorStat, isLast?: boolean }) => (
    <Grid columns="2fr 2fr 1fr 1fr 1fr" gap="3" align="center" py="3" style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-mockup)' }}>
      <Text size="2" weight="bold" style={{ color }}>{label}</Text>
      <Text size="1" color="gray" style={{ fontFamily: 'var(--font-mono)' }}>{stat.sensor}</Text>
      <Text size="2" className="tabular-nums" style={{ color: 'var(--foreground)' }}>{stat.min !== null ? stat.min.toFixed(1) : '--'}</Text>
      <Text size="2" weight="bold" className="tabular-nums" style={{ color }}>{stat.prom !== null ? stat.prom.toFixed(1) : '--'}</Text>
      <Text size="2" className="tabular-nums" style={{ color: 'var(--foreground)' }}>{stat.max !== null ? stat.max.toFixed(1) : '--'}</Text>
    </Grid>
  );

  return (
    <Flex direction="column" gap="5" style={{ opacity: isLoadingData ? 0.5 : 1, transition: 'opacity 0.2s' }}>

      {/* HEADER GLOBAL */}
      <Flex justify="between" align="end" mb="1" wrap="wrap" gap="4">
        <Box>
          <Flex align="center" gap="3" mb="2" wrap="wrap">
            <IconTile icon={BarChart3} t="green" size={40} />
            <Text size={{ initial: '5', sm: '6' }} weight="bold" as="div" style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}>Análisis histórico</Text>
            <SearchableSelect
              value={idCultivo}
              onValueChange={handleCultivoChange}
              placeholder="Seleccionar cultivo"
              searchPlaceholder="Buscar cultivo..."
              style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border2-mockup)', width: 240 }}
              options={cultivos.map((c) => ({ value: c.id.toString(), label: c.nombre_planta }))}
            />
          </Flex>
          <Text size="2" color="gray">
            Visualización de telemetría a largo plazo e historial de riego
          </Text>
        </Box>
      </Flex>

      {/* FILTROS DE TIEMPO EXCLUYENTES */}
      <Flex gap="3" wrap="wrap" mb="2" style={{ background: 'var(--surface-mockup)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-mockup)' }} align="center">
        <Text size="2" color="gray" weight="medium">Modo de tiempo:</Text>

        <Flex gap="2" style={{ background: 'var(--bg-mockup)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border2-mockup)' }}>
          <Button size="1" variant={filterMode === 'relative' ? 'solid' : 'ghost'} color="green" onClick={() => handleModeChange('relative')} style={{ cursor: 'pointer' }}>
            Reciente
          </Button>
          <Button size="1" variant={filterMode === 'calendar' ? 'solid' : 'ghost'} color="green" onClick={() => handleModeChange('calendar')} style={{ cursor: 'pointer' }}>
            Calendario
          </Button>
        </Flex>

        <Flex gap="2" style={{ background: 'var(--bg-mockup)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border2-mockup)' }}>
          {RELATIVE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="1"
              variant={rango === option.value ? "solid" : "ghost"}
              color="green"
              disabled={!isRelativeMode}
              onClick={() => handleRangoChange(option.value)}
              style={{ cursor: isRelativeMode ? 'pointer' : 'default', opacity: isRelativeMode ? 1 : 0.45 }}
            >
              {option.label}
            </Button>
          ))}
        </Flex>

        <TextField.Root type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} disabled={!dateRangeEnabled} style={{ background: 'var(--bg-mockup)', opacity: dateRangeEnabled ? 1 : 0.55 }} />
        <TextField.Root type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} disabled={!dateRangeEnabled} style={{ background: 'var(--bg-mockup)', opacity: dateRangeEnabled ? 1 : 0.55 }} />
        {false && <Select.Root value="all">
          <Select.Trigger style={{ background: 'var(--bg-mockup)', opacity: canUseWeekday ? 1 : 0.55, minWidth: 145 }} />
          <Select.Content>
            {WEEKDAY_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>}

        {false && <Select.Root value="all">
          <Select.Trigger style={{ background: 'var(--bg-mockup)', opacity: canUseMonthYear ? 1 : 0.55, minWidth: 155 }} />
          <Select.Content>
            {MONTH_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>}

        {false && <Select.Root value="all">
          <Select.Trigger style={{ background: 'var(--bg-mockup)', opacity: canUseMonthYear ? 1 : 0.55, minWidth: 110 }} />
          <Select.Content>
            <Select.Item value="all">Todos los años</Select.Item>
            {(availableYears.length > 0 ? availableYears : [new Date().getFullYear().toString()]).map((year) => (
              <Select.Item key={year} value={year}>{year}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>}

        {(startDateFilter || endDateFilter) && (
          <Button size="1" color="red" variant="soft" onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }} style={{ cursor: 'pointer', marginLeft: 'auto' }}>
            Limpiar filtros
          </Button>
        )}
        <Text size="1" color="gray" style={{ marginLeft: 'auto' }}>
          {filterMode === 'relative' ? 'Rangos rapidos activos.' : 'Selecciona fecha de inicio y fin.'}
        </Text>
      </Flex>

      {/* TARJETA 1: Gráfico Macro */}
      <Card size={{ initial: "2", sm: "3", md: "4" }} style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '14px' }}>
        <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
          <Flex align="center" gap="3">
            <IconTile icon={Activity} t="green" />
            <Box>
            <Text size="3" weight="bold" mb="1" as="div" style={{ color: 'var(--foreground)' }}>
              Historial de parámetros
            </Text>
            <Text size="2" color="gray" as="div">
              Mostrando datos {isRelativeMode ? (rango <= 1 ? `de las últimas ${relativeLabel}` : `de los últimos ${relativeLabel}`) : calendarLabel}
            </Text>
            </Box>
          </Flex>
        </Flex>

        <Box className="w-full min-w-0 h-[240px] sm:h-[320px] md:h-[380px]">
          <HistoricoMultiLineChart filteredChartData={filteredChartData} />
        </Box>
      </Card>

      <Grid columns={{ initial: '1', lg: '2' }} gap="4">

        {/* TARJETA 2: Estadísticas */}
        {activeStats && (
          <Card size={{ initial: "2", sm: "3", md: "4" }} style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '14px', height: '100%' }}>
            <Flex align="center" gap="3" mb="4">
              <IconTile icon={Sigma} t="blue" />
              <Text size="3" weight="bold" as="div" style={{ color: 'var(--foreground)' }}>
                Estadísticas del período <Text size="2" color="gray" weight="regular">· {isRelativeMode ? relativeLabel : calendarLabel}</Text>
              </Text>
            </Flex>
            <ScrollArea scrollbars="horizontal" style={{ width: '100%' }}>
              <Box style={{ minWidth: '450px' }}>
                <Grid columns="2fr 2fr 1fr 1fr 1fr" gap="3" align="center" mb="2">
                  <Text size="1" weight="medium" color="gray">Parámetro</Text>
                  <Text size="1" weight="medium" color="gray">Sensor</Text>
                  <Text size="1" weight="medium" color="gray">Mín.</Text>
                  <Text size="1" weight="medium" color="gray">Prom.</Text>
                  <Text size="1" weight="medium" color="gray">Máx.</Text>
                </Grid>
                <Box>
                  <StatRow label="Hum. suelo (%)" color="#22c55e" stat={activeStats.humedadSuelo} />
                  <StatRow label="Hum. ambiental (%)" color="#06b6d4" stat={activeStats.humedadAmbiente} />
                  <StatRow label="Temp. ambiental (°C)" color="#f59e0b" stat={activeStats.temperaturaAmbiente} />
                  <StatRow label="Temp. suelo (°C)" color="#3b82f6" stat={activeStats.temperaturaSuelo} isLast={true} />
                </Box>
              </Box>
            </ScrollArea>
          </Card>
        )}

        {/* TARJETA 3: Log de Riegos */}
        <Card size={{ initial: "2", sm: "3", md: "4" }} style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '14px', height: '100%' }}>
          <Flex align="center" gap="3" mb="4">
            <IconTile icon={Droplets} t="blue" />
            <Text size="3" weight="bold" as="div" style={{ color: 'var(--foreground)' }}>
              Log de riegos
            </Text>
          </Flex>

          <Grid columns={{ initial: '1.5fr 1fr 1fr', sm: '2fr 1.5fr 1fr' }} gap="3" align="center" mb="2">
            <Text size="1" weight="medium" color="gray">Fecha / hora</Text>
            <Text size="1" weight="medium" color="gray">Origen</Text>
            <Text size="1" weight="medium" color="gray">Litros</Text>
          </Grid>

          {filteredRiegoLog.length === 0 ? (
            <Flex align="center" justify="center" py="6">
              <Text color="gray">No se registraron riegos en este período.</Text>
            </Flex>
          ) : (
            <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: '300px', paddingRight: '12px' }}>
              <Box>
                {filteredRiegoLog.map((log: any, idx: number) => (
                  <Grid key={log.id} columns={{ initial: '1.5fr 1fr 1fr', sm: '2fr 1.5fr 1fr' }} gap="3" align="center" py="3" style={{ borderBottom: idx === filteredRiegoLog.length - 1 ? 'none' : '1px solid var(--border-mockup)' }}>
                    <Text size="2" className="tabular-nums" style={{ color: 'var(--foreground)' }}>{log.fechaStr}</Text>
                    <Text size="2" weight="bold" style={{ color: log.colorOrigen }}>{log.origen}</Text>
                    <Text size="2" weight="medium" className="tabular-nums" style={{ color: 'var(--blue)' }}>{log.litros}{log.litros !== '--' ? ' L' : ''}</Text>
                  </Grid>
                ))}
              </Box>
            </ScrollArea>
          )}
        </Card>
      </Grid>
    </Flex>
  );
}
