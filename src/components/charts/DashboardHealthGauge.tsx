"use client";

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardHealthGauge({ saludData, colorSalud }: any) {
  return (
    <ResponsiveContainer width="100%" height={110} minWidth={0}>
      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Pie
          data={saludData}
          cx="50%"
          cy="80%"
          startAngle={180}
          endAngle={0}
          innerRadius={46}
          outerRadius={58}
          dataKey="value"
          stroke="none"
        >
          <Cell fill={colorSalud} />
          <Cell fill="#1e293b" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
