"use client";

import React, { useId, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';

type Punto = { ts: number; valorReal: number | null };

// Gráfico tipo "bolsa": la línea sigue cada lectura real sobre un eje de tiempo continuo y el
// eje Y se ajusta al rango de los datos, para que variaciones pequeñas (p. ej. 72% -> 74%)
// se vean subir y bajar en vez de quedar como una recta sobre una escala fija de 0-100.
export default function DashboardHistoryChart({ chartData, config, umbralVisual, timeZone, range }: any) {
  const gradientId = useId().replace(/:/g, '');
  const color = config?.color || '#22c55e';
  const unidad = config?.isPercentage ? '%' : '°C';

  const data: Punto[] = chartData || [];
  const valores = useMemo(
    () => data.map((p) => p.valorReal).filter((v): v is number => typeof v === 'number'),
    [data]
  );

  const yDomain = useMemo(() => {
    if (valores.length === 0) return [0, 100] as [number, number];
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    // Margen proporcional a la variación, con un mínimo para que una serie casi constante no
    // amplifique ruido de décimas como si fueran grandes saltos.
    const pad = Math.max((max - min) * 0.2, config?.isPercentage ? 1 : 0.5);
    let lo = min - pad;
    let hi = max + pad;
    if (config?.isPercentage) {
      lo = Math.max(0, lo);
      hi = Math.min(100, hi);
    }
    return [Math.floor(lo), Math.ceil(hi)] as [number, number];
  }, [valores, config?.isPercentage]);

  const primero = valores.length > 0 ? valores[0] : null;
  const ultimo = valores.length > 0 ? valores[valores.length - 1] : null;
  const variacion = primero !== null && ultimo !== null ? ultimo - primero : null;
  const minimo = valores.length > 0 ? Math.min(...valores) : null;
  const maximo = valores.length > 0 ? Math.max(...valores) : null;

  const formatTick = (ts: number) =>
    new Date(ts).toLocaleString('es-PE', range === '7d'
      ? { weekday: 'short', day: 'numeric', timeZone }
      : { hour: '2-digit', minute: '2-digit', timeZone });
  const formatTooltipLabel = (ts: number) =>
    new Date(ts).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone });

  const umbral = umbralVisual !== null && umbralVisual !== undefined && Number.isFinite(Number(umbralVisual))
    ? Number(umbralVisual)
    : null;

  return (
    <div style={{ width: '100%', minWidth: '1px', position: 'relative' }}>
      {ultimo !== null && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '8px', fontFamily: 'monospace' }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white' }}>
            {ultimo.toFixed(1)}{unidad}
          </span>
          {variacion !== null && (
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: variacion > 0 ? '#22c55e' : variacion < 0 ? '#ef4444' : '#94a3b8' }}>
              {variacion > 0 ? '▲' : variacion < 0 ? '▼' : '■'} {variacion > 0 ? '+' : ''}{variacion.toFixed(1)}{unidad}
            </span>
          )}
          {minimo !== null && maximo !== null && (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              mín {minimo.toFixed(1)}{unidad} · máx {maximo.toFixed(1)}{unidad}
            </span>
          )}
        </div>
      )}
      <div style={{ width: '100%', height: '250px', minHeight: '220px' }}>
        <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={200} initialDimension={{ width: 600, height: 250 }}>
          <AreaChart data={data} margin={{ top: 10, right: 12, left: -6, bottom: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTick}
              stroke="#94a3b8"
              fontSize={11}
              tickMargin={8}
              minTickGap={40}
              tickLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              width={42}
              tickLine={false}
              domain={yDomain}
              allowDecimals={false}
              tickFormatter={(val) => `${val}${config?.isPercentage ? '%' : '°'}`}
            />
            <Tooltip
              cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
              contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff', fontSize: '12px', padding: '6px 10px' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px', fontWeight: 'bold' }}
              labelFormatter={(ts: any) => formatTooltipLabel(Number(ts))}
              formatter={(value: any) => [`${value}${unidad}`, config?.title || 'Valor']}
            />
            {umbral !== null && (
              <ReferenceLine
                y={umbral}
                stroke="#ef4444"
                strokeDasharray="3 3"
                ifOverflow="hidden"
                label={{ position: 'insideBottomLeft', value: `${config?.umbralRef === 'min' ? 'mín' : 'máx'} ${umbral}${config?.isPercentage ? '%' : '°'}`, fill: '#ef4444', fontSize: 10 }}
              />
            )}
            <Area
              type="linear"
              dataKey="valorReal"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={data.length === 1 ? { r: 4, fill: color } : false}
              activeDot={{ r: 5, fill: color, stroke: '#111827', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
