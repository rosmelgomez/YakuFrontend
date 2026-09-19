"use client";

import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine, Line } from 'recharts';

export default function MLPredictionChart({ historial, umbral }: any) {
  const hasRealData = Boolean(historial && Array.isArray(historial) && historial.length > 0);

  // Asegurar normalización completa para que Recharts siempre trace las líneas
  const chartData = useMemo(() => {
    if (!hasRealData) return [];

    let source = historial;

    // Si solo hay un punto registrado, extenderlo para trazar la línea
    if (source.length === 1) {
      const p = source[0];
      const hS = Number(p.humSuelo ?? p.humedadSuelo ?? 40);
      const hA = Number(p.humAmb ?? p.humedadAmbiente ?? 60);
      source = [
        p,
        { ...p, hora: `${p.hora || 'T'} (+15m)`, humSuelo: Math.max(0, hS - 1.2), humAmb: Math.max(0, hA - 1) },
      ];
    }

    return source.map((item: any, idx: number) => ({
      hora: item.hora || item.fecha || item.label || `T+${idx * 15}m`,
      humSuelo: Number(item.humSuelo ?? item.humedadSuelo ?? item.humedad_suelo ?? 40),
      humAmb: Number(item.humAmb ?? item.humedadAmbiente ?? item.humedad_ambiente ?? 60),
      tempAmb: Number(item.tempAmb ?? item.temperaturaAmbiente ?? item.temperatura_ambiente ?? 24),
      tempSuelo: Number(item.tempSuelo ?? item.temperaturaSuelo ?? item.temperatura_suelo ?? 20),
    }));
  }, [historial, hasRealData]);

  if (!hasRealData) {
    return (
      <div className="w-full h-full min-w-0 flex flex-col items-center justify-center gap-1 text-center" style={{ minHeight: '230px' }}>
        <span className="text-sm text-gray-400 font-medium">Sin datos suficientes para predecir</span>
        <span className="text-xs text-gray-500 max-w-xs">
          Este cultivo no tiene dispositivos asignados o aún no ha registrado lecturas. Asigna un dispositivo para generar predicciones.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-w-0 flex flex-col justify-between" style={{ minHeight: '230px' }}>
      <div className="w-full flex-1 min-w-0" style={{ height: '220px', minHeight: '200px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={190}>
          <LineChart data={chartData} margin={{ top: 8, right: 10, left: -10, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.6} vertical={false} />
            <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} tickMargin={6} tickLine={false} interval="preserveStartEnd" />
            
            {/* Eje Y para Humedad (%) */}
            <YAxis yAxisId="humedad" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `${val}%`} domain={[0, 100]} width={32} tickLine={false} />
            
            {/* Eje Y para Temperatura (°C) */}
            <YAxis yAxisId="temperatura" orientation="right" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `${val}°`} domain={[0, 50]} width={28} tickLine={false} />
            
            <Tooltip 
              contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff', fontSize: '11px', padding: '6px 10px' }} 
              labelStyle={{ color: '#9ca3af', marginBottom: '2px', fontWeight: 'bold' }}
            />
            <Legend verticalAlign="top" height={26} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingBottom: '4px' }} />

            {/* Línea de Umbral Crítico Mínimo de Humedad */}
            {umbral !== undefined && umbral !== null && !isNaN(Number(umbral)) && (
              <ReferenceLine y={Number(umbral)} yAxisId="humedad" stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: `${umbral}% mín`, fill: '#ef4444', fontSize: 10 }} />
            )}

            {/* Líneas de datos reales y proyectados con connectNulls e isAnimationActive={false} para evitar parpadeos */}
            <Line yAxisId="humedad" type="monotone" dataKey="humSuelo" name="Hum. Suelo" stroke="#22c55e" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} connectNulls={true} isAnimationActive={false} />
            <Line yAxisId="humedad" type="monotone" dataKey="humAmb" name="Hum. Ambiente" stroke="#2dd4bf" strokeWidth={1.6} dot={false} activeDot={{ r: 3 }} connectNulls={true} isAnimationActive={false} />
            <Line yAxisId="temperatura" type="monotone" dataKey="tempAmb" name="Temp. Ambiente" stroke="#f59e0b" strokeWidth={1.6} dot={false} activeDot={{ r: 3 }} connectNulls={true} isAnimationActive={false} />
            <Line yAxisId="temperatura" type="monotone" dataKey="tempSuelo" name="Temp. Suelo" stroke="#38bdf8" strokeWidth={1.6} dot={false} activeDot={{ r: 3 }} connectNulls={true} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
