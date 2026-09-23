"use client";

import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Line } from 'recharts';

export default function DashboardConsumptionChart({ chartData, config, limite }: any) {
  // Asegurar que haya datos utilizables y que los valores numéricos sean válidos
  const safeData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    return chartData.map((d: any) => ({
      ...d,
      valorReal: Number(d.valorReal ?? d.valor ?? 0)
    }));
  }, [chartData]);

  // Dominio Y garantizado de al menos [0, 10] para que si todos los días tienen 0L no genere NaN por división por cero
  const yDomain = useMemo(() => {
    const maxVal = Math.max(...(safeData.map((d: any) => d.valorReal) || [0]), Number(limite) || 0, 10);
    return [0, Math.ceil(maxVal * 1.15)];
  }, [safeData, limite]);

  // Cuántas etiquetas de tiempo mostrar en el eje X: con muchos puntos (rango corto con buckets
  // de 15 min/1h) hay que saltar etiquetas para que no se amontonen; con pocos (7 días) se muestran todas.
  const xAxisInterval = useMemo(() => {
    const desiredTicks = 7;
    if (safeData.length <= desiredTicks) return 0;
    return Math.ceil(safeData.length / desiredTicks) - 1;
  }, [safeData.length]);

  return (
    <div style={{ width: '100%', minWidth: '1px', height: '250px', minHeight: '220px', position: 'relative' }}>
      <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={200} initialDimension={{ width: 600, height: 250 }}>
        <LineChart data={safeData} margin={{ top: 10, right: 12, left: -6, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} vertical={false} />
          <XAxis 
            dataKey="xLabel" 
            stroke="#94a3b8" 
            fontSize={11} 
            tickMargin={8}
            minTickGap={15}
            tickLine={false}
            interval={xAxisInterval}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={11} 
            width={38}
            tickLine={false}
            domain={yDomain} 
            tickFormatter={(val) => `${val}L`} 
          />
          <Tooltip 
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff', fontSize: '12px', padding: '6px 10px' }} 
            labelStyle={{ color: '#9ca3af', marginBottom: '4px', fontWeight: 'bold' }} 
            formatter={(value: any) => [`${value} L`, config?.title || 'Consumo']} 
          />
          {limite !== null && Number.isFinite(Number(limite)) && (
            <ReferenceLine 
              y={Number(limite)} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ position: 'insideBottomLeft', value: `Límite ${limite}L`, fill: '#ef4444', fontSize: 10 }} 
            />
          )}
          <Line 
            type="monotone" 
            dataKey="valorReal" 
            stroke={config?.color || '#38bdf8'} 
            strokeWidth={2.5} 
            dot={{ r: 3.5, fill: config?.color || '#38bdf8' }} 
            activeDot={{ r: 5.5, fill: config?.color || '#38bdf8', stroke: '#111827', strokeWidth: 2 }} 
            connectNulls 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
