"use client";

import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Line } from 'recharts';

export default function DashboardHistoryChart({ chartData, config, umbralVisual }: any) {
  // Asegurar que si hay 1 solo punto de datos, Recharts pueda trazar segmento y puntos visibles
  const safeData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    if (chartData.length === 1) {
      const p = chartData[0];
      return [
        { ...p, xLabel: `${p.xLabel} (inicio)` },
        { ...p, xLabel: p.xLabel }
      ];
    }
    return chartData;
  }, [chartData]);

  // Cuántas etiquetas de tiempo mostrar en el eje X: con muchos puntos (rango corto, ej. 6h con
  // buckets de 15 min) hay que saltar etiquetas para que no se amontonen; con pocos puntos
  // (rango largo, ej. 7d) se muestran todas. `interval` le dice a Recharts cuántos ticks saltar.
  const xAxisInterval = useMemo(() => {
    const desiredTicks = 7;
    if (safeData.length <= desiredTicks) return 0;
    return Math.ceil(safeData.length / desiredTicks) - 1;
  }, [safeData.length]);

  // Dominio Y seguro para evitar división por cero (NaN) cuando todos los valores son idénticos
  const yDomain = useMemo(() => {
    if (config?.isPercentage) return [0, 100] as [number, number];
    return ([dataMin, dataMax]: readonly [number | 'auto', number | 'auto']) => {
      const min = typeof dataMin === 'number' && Number.isFinite(dataMin) ? dataMin : 15;
      const max = typeof dataMax === 'number' && Number.isFinite(dataMax) ? dataMax : 30;
      const minReference = umbralVisual !== null && Number.isFinite(umbralVisual) ? umbralVisual - 5 : min - 5;
      const maxReference = umbralVisual !== null && Number.isFinite(umbralVisual) ? umbralVisual + 5 : max + 5;
      return [
        Math.floor(Math.min(min, minReference, 0)),
        Math.ceil(Math.max(max, maxReference, 35))
      ] as [number, number];
    };
  }, [config?.isPercentage, umbralVisual]);

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
            minTickGap={20}
            tickLine={false}
            interval={xAxisInterval}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={11} 
            width={38}
            tickLine={false}
            domain={yDomain} 
            tickFormatter={(val) => `${val}${config?.isPercentage ? '%' : '°'}`} 
          />
          <Tooltip 
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff', fontSize: '12px', padding: '6px 10px' }} 
            labelStyle={{ color: '#9ca3af', marginBottom: '4px', fontWeight: 'bold' }} 
            formatter={(value: any) => [`${value}${config?.isPercentage ? '%' : '°C'}`, config?.title || 'Valor']} 
          />
          {umbralVisual !== null && Number.isFinite(Number(umbralVisual)) && (
            <ReferenceLine 
              y={Number(umbralVisual)} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ position: 'insideBottomLeft', value: `${config?.umbralRef === 'min' ? 'mín' : 'máx'} ${umbralVisual}${config?.isPercentage ? '%' : '°'}`, fill: '#ef4444', fontSize: 10 }} 
            />
          )}
          <Line 
            type="monotone" 
            dataKey="valorReal" 
            stroke={config?.color || '#22c55e'} 
            strokeWidth={2.5} 
            dot={{ r: 3.5, fill: config?.color || '#22c55e' }} 
            activeDot={{ r: 5.5, fill: config?.color || '#22c55e', stroke: '#111827', strokeWidth: 2 }} 
            connectNulls 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
