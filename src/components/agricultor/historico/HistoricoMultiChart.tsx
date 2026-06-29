// src/components/agricultor/historico/HistoricoMultiChart.tsx
"use client";

import { useState, useEffect } from 'react';

import { Box, Text, Flex, Card, Button, Grid, ScrollArea, Select, TextField } from '@radix-ui/themes';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
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

  // Filter chart data
  const filteredChartData = chartData.filter(item => {
    const date = new Date(item.fecha || item.label + 'T00:00:00');
    return matchesDateRange(date);
  });

  // Filter irrigation logs
  const filteredRiegoLog = riegoLog.filter(log => {
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

  const activeStats = stats ? {
    humedadSuelo: computeStatsForField(filteredChartData, 'humedadSuelo', stats.humedadSuelo?.sensor || 'Humedad Suelo'),
    humedadAmbiente: computeStatsForField(filteredChartData, 'humedadAmbiente', stats.humedadAmbiente?.sensor || 'Humedad Ambiente'),
    temperaturaAmbiente: computeStatsForField(filteredChartData, 'temperaturaAmbiente', stats.temperaturaAmbiente?.sensor || 'Temp. Ambiente'),
    temperaturaSuelo: computeStatsForField(filteredChartData, 'temperaturaSuelo', stats.temperaturaSuelo?.sensor || 'Temp. Suelo'),
  } : null;

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
    if (mode === 'relative' && ![0, 1, 7].includes(rango)) {
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box style={{ background: 'var(--surface2-mockup)', padding: '12px', border: '1px solid var(--border-mockup)', borderRadius: '8px', color: 'white' }}>
          <Text size="2" weight="bold" mb="2" as="div">{label}</Text>
          {payload.map((entry: any, index: number) => (
            <Flex key={index} align="center" gap="2" mb="1">
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }} />
              <Text size="1" style={{ color: '#d1d5db' }}>{entry.name}:</Text>
              <Text size="1" weight="bold">
                {entry.value} {entry.dataKey.includes('temperatura') ? '°C' : entry.dataKey === 'riegos' ? 'eventos' : '%'}
              </Text>
            </Flex>
          ))}
        </Box>
      );
    }
    return null;
  };

  const StatRow = ({ label, color, stat, isLast = false }: { label: string, color: string, stat: SensorStat, isLast?: boolean }) => (
    <Grid columns="2fr 2fr 1fr 1fr 1fr" gap="3" align="center" py="3" style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-mockup)' }}>
      <Text size="2" weight="bold" style={{ color }}>{label}</Text>
      <Text size="2" style={{ color: '#64748b', fontFamily: 'monospace' }}>{stat.sensor}</Text>
      <Text size="2" color="indigo" style={{ fontFamily: 'monospace' }}>{stat.min !== null ? stat.min.toFixed(1) : '--'}</Text>
      <Text size="2" weight="bold" style={{ color, fontFamily: 'monospace' }}>{stat.prom !== null ? stat.prom.toFixed(1) : '--'}</Text>
      <Text size="2" color="indigo" style={{ fontFamily: 'monospace' }}>{stat.max !== null ? stat.max.toFixed(1) : '--'}</Text>
    </Grid>
  );

  return (
    <Flex direction="column" gap="5" style={{ opacity: isLoadingData ? 0.5 : 1, transition: 'opacity 0.2s' }}>
      
      {/* HEADER GLOBAL */}
      <Flex justify="between" align="end" mb="1" wrap="wrap" gap="4">
        <Box>
          <Flex align="center" gap="4" mb="2">
            <Text size="6" weight="bold" color="indigo" as="div">Análisis Histórico</Text>
            <SearchableSelect
              value={idCultivo}
              onValueChange={handleCultivoChange}
              placeholder="Seleccionar cultivo"
              searchPlaceholder="Buscar cultivo..."
              style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)', width: 240 }}
              options={cultivos.map((c) => ({ value: c.id.toString(), label: c.nombre_planta }))}
            />
          </Flex>
          <Text size="2" style={{ color: '#9ca3af' }}>
            Visualización de telemetría a largo plazo e historial de riego
          </Text>
        </Box>
      </Flex>

      {/* FILTROS DE TIEMPO EXCLUYENTES */}
      <Flex gap="3" wrap="wrap" mb="2" style={{ background: '#111827', padding: '12px 16px', borderRadius: '12px', border: '1px solid #1f2937' }} align="center">
        <Text size="2" color="gray" weight="medium">Modo de tiempo:</Text>

        <Flex gap="2" style={{ background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #1f2937' }}>
          <Button size="1" variant={filterMode === 'relative' ? 'solid' : 'ghost'} color="green" onClick={() => handleModeChange('relative')} style={{ cursor: 'pointer' }}>
            Reciente
          </Button>
          <Button size="1" variant={filterMode === 'calendar' ? 'solid' : 'ghost'} color="blue" onClick={() => handleModeChange('calendar')} style={{ cursor: 'pointer' }}>
            Calendario
          </Button>
        </Flex>

        <Flex gap="2" style={{ background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #1f2937' }}>
          {[
            { label: '6h', value: 0 },
            { label: '24h', value: 1 },
            { label: '7d', value: 7 }
          ].map((option) => (
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
        
        <TextField.Root type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} disabled={!dateRangeEnabled} style={{ background: '#0f172a', color: dateRangeEnabled ? 'white' : '#6b7280', opacity: dateRangeEnabled ? 1 : 0.55, borderColor: '#1f2937' }} />
        <TextField.Root type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} disabled={!dateRangeEnabled} style={{ background: '#0f172a', color: dateRangeEnabled ? 'white' : '#6b7280', opacity: dateRangeEnabled ? 1 : 0.55, borderColor: '#1f2937' }} />
        {false && <Select.Root value="all">
          <Select.Trigger style={{ background: '#0f172a', color: canUseWeekday ? 'white' : '#6b7280', opacity: canUseWeekday ? 1 : 0.55, borderColor: '#1f2937', minWidth: 145 }} />
          <Select.Content style={{ background: '#0f172a', color: 'white' }}>
            {WEEKDAY_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>}

        {false && <Select.Root value="all">
          <Select.Trigger style={{ background: '#0f172a', color: canUseMonthYear ? 'white' : '#6b7280', opacity: canUseMonthYear ? 1 : 0.55, borderColor: '#1f2937', minWidth: 155 }} />
          <Select.Content style={{ background: '#0f172a', color: 'white' }}>
            {MONTH_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>}

        {false && <Select.Root value="all">
          <Select.Trigger style={{ background: '#0f172a', color: canUseMonthYear ? 'white' : '#6b7280', opacity: canUseMonthYear ? 1 : 0.55, borderColor: '#1f2937', minWidth: 110 }} />
          <Select.Content style={{ background: '#0f172a', color: 'white' }}>
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
        <Text size="1" color="gray" style={{ fontFamily: 'monospace', marginLeft: 'auto' }}>
          {filterMode === 'relative' ? 'Rangos rapidos activos.' : 'Selecciona fecha de inicio y fin.'}
        </Text>
      </Flex>

      {/* TARJETA 1: Gráfico Macro */}
      <Card size="4" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px', minHeight: '500px' }}>
        <Flex justify="between" align="center" mb="6" wrap="wrap" gap="4">
          <Box>
            <Text size="4" weight="bold" color="indigo" mb="1" as="div">
              Historial de Parámetros
            </Text>
            <Text size="2" color="gray" as="div">
              Mostrando datos de las {rango === 0 ? 'últimas 6 horas' : rango === 1 ? 'últimas 24 horas' : `últimos ${rango} días`}
            </Text>
          </Box>

          {false && <Flex gap="2" style={{ background: 'var(--bg-mockup)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-mockup)' }}>
            {[
              { label: '6h', value: 0 },
              { label: '24h', value: 1 },
              { label: '7d', value: 7 }
            ].map((option) => (
              <Button 
                key={option.value} 
                variant={rango === option.value ? "solid" : "ghost"} 
                color="green"
                disabled={!isRelativeMode}
                onClick={() => handleRangoChange(option.value)}
                style={{ cursor: isRelativeMode ? 'pointer' : 'default', borderRadius: '6px', opacity: isRelativeMode ? 1 : 0.45 }}
              >
                {option.label}
              </Button>
            ))}
          </Flex>}
        </Flex>

        <Box style={{ width: '100%', minWidth: 0, height: '380px' }}>
          <ResponsiveContainer width="100%" height={380} minWidth={0}>
            <LineChart data={filteredChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-mockup)" vertical={false} />
              <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickMargin={12} minTickGap={30} axisLine={false} tickLine={false} />
              <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(val) => val === 90 ? '90% / °C' : val} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="plainline" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#9ca3af' }} />

              <Line name="Hum. suelo (%)" type="monotone" dataKey="humedadSuelo" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls />
              <Line name="Hum. ambiental (%)" type="monotone" dataKey="humedadAmbiente" stroke="#06b6d4" strokeWidth={2} dot={false} connectNulls />
              <Line name="Temp. ambiental (°C)" type="monotone" dataKey="temperaturaAmbiente" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
              <Line name="Temp. suelo (°C)" type="monotone" dataKey="temperaturaSuelo" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
              <Line name="Eventos de riego" type="monotone" dataKey="riegos" stroke="#1e40af" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3, fill: '#1e40af' }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      <Grid columns={{ initial: '1', lg: '2' }} gap="5">
        
        {/* TARJETA 2: Estadísticas */}
        {activeStats && (
          <Card size="4" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px', height: '100%' }}>
            <Text size="4" weight="bold" color="indigo" mb="5" as="div">
              Estadísticas del período — {rango === 0 ? '6 horas' : rango === 1 ? '24 horas' : `${rango} días`}
            </Text>
            <ScrollArea scrollbars="horizontal" style={{ width: '100%' }}>
              <Box style={{ minWidth: '450px' }}>
                <Grid columns="2fr 2fr 1fr 1fr 1fr" gap="3" align="center" mb="2">
                  <Text size="1" weight="bold" style={{ color: '#6b7280', letterSpacing: '1px' }}>PARÁMETRO</Text>
                  <Text size="1" weight="bold" style={{ color: '#6b7280', letterSpacing: '1px' }}>SENSOR</Text>
                  <Text size="1" weight="bold" style={{ color: '#6b7280', letterSpacing: '1px' }}>MÍN</Text>
                  <Text size="1" weight="bold" style={{ color: '#6b7280', letterSpacing: '1px' }}>PROM.</Text>
                  <Text size="1" weight="bold" style={{ color: '#6b7280', letterSpacing: '1px' }}>MÁX</Text>
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
        <Card size="4" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px', height: '100%' }}>
          <Text size="4" weight="bold" color="indigo" mb="5" as="div">
            Log de riegos
          </Text>
          
          <Grid columns={{ initial: '1.5fr 1fr 1fr', sm: '2fr 1.5fr 1fr' }} gap="3" align="center" mb="2">
            <Text size="1" weight="bold" style={{ color: '#6b7280', letterSpacing: '1px' }}>FECHA/HORA</Text>
            <Text size="1" weight="bold" style={{ color: '#6b7280', letterSpacing: '1px' }}>ORIGEN</Text>
            <Text size="1" weight="bold" style={{ color: '#6b7280', letterSpacing: '1px' }}>LITROS</Text>
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
                    <Text size="2" color="indigo" style={{ fontFamily: 'monospace' }}>{log.fechaStr}</Text>
                    <Text size="2" weight="bold" style={{ color: log.colorOrigen, fontFamily: 'monospace' }}>{log.origen}</Text>
                    <Text size="2" color="indigo" style={{ fontFamily: 'monospace' }}>{log.litros}{log.litros !== '--' ? 'L' : ''}</Text>
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
