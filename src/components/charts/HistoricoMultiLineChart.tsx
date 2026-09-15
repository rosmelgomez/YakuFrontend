"use client";

import React from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';

export default function HistoricoMultiLineChart({ filteredChartData }: any) {
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

  return (
    <div className="w-full h-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={filteredChartData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-mockup)" vertical={false} />
          <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickMargin={8} minTickGap={25} axisLine={false} tickLine={false} />
          <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(val) => val === 90 ? '90% / °C' : val} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#9ca3af' }} />

          <Line name="Hum. suelo (%)" type="monotone" dataKey="humedadSuelo" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls />
          <Line name="Hum. ambiental (%)" type="monotone" dataKey="humedadAmbiente" stroke="#06b6d4" strokeWidth={2} dot={false} connectNulls />
          <Line name="Temp. ambiental (°C)" type="monotone" dataKey="temperaturaAmbiente" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
          <Line name="Temp. suelo (°C)" type="monotone" dataKey="temperaturaSuelo" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
          <Line name="Eventos de riego" type="monotone" dataKey="riegos" stroke="#1e40af" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3, fill: '#1e40af' }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
