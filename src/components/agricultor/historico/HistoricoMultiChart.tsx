// src/components/agricultor/historico/HistoricoMultiChart.tsx
"use client";

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text, Flex, Select, Card, Button, Grid, ScrollArea } from '@radix-ui/themes';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { HistoricoResponse } from '@/services/historico';

type CultivoBasico = { id: number; nombre_planta: string; };
type SensorStat = { sensor: string; min: number | null; prom: number | null; max: number | null; };

export default function HistoricoMultiChart({ 
  cultivos, 
  initialData, 
  initialCultivo, 
  initialRango 
}: { 
  cultivos: CultivoBasico[], 
  initialData: HistoricoResponse, 
  initialCultivo: string, 
  initialRango: number 
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Desestructuramos la data que nos inyectó la página (page.tsx)
  const { chartData, stats, riegoLog } = initialData;

  const handleCultivoChange = (val: string) => {
    startTransition(() => {
      router.push(`/dashboard/agricultor/historico?cultivo=${val}&rango=${initialRango}`);
    });
  };

  const handleRangoChange = (rango: number) => {
    startTransition(() => {
      router.push(`/dashboard/agricultor/historico?cultivo=${initialCultivo}&rango=${rango}`);
    });
  };

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
    <Flex direction="column" gap="5" style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
      
      {/* TARJETA 1: Gráfico Macro */}
      <Card size="4" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px', minHeight: '500px' }}>
        <Flex justify="between" align="center" mb="6" wrap="wrap" gap="4">
          <Box>
            <Text size="5" weight="bold" color="indigo" as="div" mb="2">
              Los 4 parámetros — {initialRango} días
            </Text>
            <Select.Root value={initialCultivo} onValueChange={handleCultivoChange}>
              <Select.Trigger style={{ background: 'var(--surface2-mockup)', color: 'white', border: '1px solid var(--border-mockup)', width: '220px' }} />
              <Select.Content>
                {cultivos.map((c) => (
                  <Select.Item key={c.id} value={c.id.toString()}>{c.nombre_planta}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Box>

          <Flex gap="2" style={{ background: 'var(--bg-mockup)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-mockup)' }}>
            {[7, 30, 90].map((r) => (
              <Button 
                key={r} 
                variant={initialRango === r ? "solid" : "ghost"} 
                color="green"
                onClick={() => handleRangoChange(r)}
                style={{ cursor: 'pointer', borderRadius: '6px' }}
              >
                {r}d
              </Button>
            ))}
          </Flex>
        </Flex>

        <Box style={{ width: '100%', minWidth: 0, height: '380px' }}>
          <ResponsiveContainer width="100%" height={380} minWidth={0}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        {stats && (
          <Card size="4" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px', height: '100%' }}>
            <Text size="4" weight="bold" color="indigo" mb="5" as="div">
              Estadísticas del período — {initialRango} días
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
                  <StatRow label="Hum. suelo (%)" color="#22c55e" stat={stats.humedadSuelo} />
                  <StatRow label="Hum. ambiental (%)" color="#06b6d4" stat={stats.humedadAmbiente} />
                  <StatRow label="Temp. ambiental (°C)" color="#f59e0b" stat={stats.temperaturaAmbiente} />
                  <StatRow label="Temp. suelo (°C)" color="#3b82f6" stat={stats.temperaturaSuelo} isLast={true} />
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

          {riegoLog.length === 0 ? (
            <Flex align="center" justify="center" py="6">
              <Text color="gray">No se registraron riegos en este período.</Text>
            </Flex>
          ) : (
            <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: '300px', paddingRight: '12px' }}>
              <Box>
                {riegoLog.map((log: any, idx: number) => (
                  <Grid key={log.id} columns={{ initial: '1.5fr 1fr 1fr', sm: '2fr 1.5fr 1fr' }} gap="3" align="center" py="3" style={{ borderBottom: idx === riegoLog.length - 1 ? 'none' : '1px solid var(--border-mockup)' }}>
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
