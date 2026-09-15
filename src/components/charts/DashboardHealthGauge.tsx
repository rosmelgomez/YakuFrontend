"use client";

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardHealthGauge({ saludData, colorSalud }: any) {
  const safeData = Array.isArray(saludData) && saludData.length > 0 ? saludData : [{ name: 'Sin datos', value: 100 }];

  return (
    <div style={{ width: '100%', height: '110px', position: 'relative' }}>
      <ResponsiveContainer width="100%" height={110} minWidth={0}>
        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <Pie
            data={safeData}
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius={46}
            outerRadius={58}
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            {safeData.map((_entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? (colorSalud || '#22c55e') : '#1e293b'} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
