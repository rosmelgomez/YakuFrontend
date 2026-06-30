"use client";

import React from 'react';
import { Box } from '@radix-ui/themes';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, ReferenceLine, Line } from 'recharts';

export default function DashboardHistoryChart({ chartData, config, umbralVisual }: any) {
  return (
    <Box style={{ width: '100%', minWidth: 0, height: '250px' }}>
      <ResponsiveContainer width="100%" height={250} minWidth={0}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="xLabel" stroke="#4b5563" fontSize={12} tickMargin={10} minTickGap={20} />
          <YAxis stroke="#4b5563" fontSize={12} domain={config.isPercentage ? [0, 100] : ['auto', 'auto']} tickFormatter={(val) => `${val}${config.isPercentage ? '%' : '°'}`} />
          <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} labelStyle={{ color: '#9ca3af', marginBottom: '4px' }} formatter={(value: any) => [`${value}${config.isPercentage ? '%' : '°C'}`, config.title]} />
          {umbralVisual !== null && (
            <ReferenceLine y={umbralVisual} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: `${config.umbralRef === 'min' ? 'mín' : 'máx'} ${umbralVisual}${config.isPercentage ? '%' : '°'}`, fill: '#ef4444', fontSize: 12 }} />
          )}
          <Line type="monotone" dataKey="valorReal" stroke={config.color} strokeWidth={3} dot={false} activeDot={{ r: 6, fill: config.color, stroke: '#111827', strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
