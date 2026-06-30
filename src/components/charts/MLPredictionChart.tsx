"use client";

import React from 'react';
import { LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine, Line } from 'recharts';

export default function MLPredictionChart({ chartWidth, historial, umbral }: any) {
  return (
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
  );
}
