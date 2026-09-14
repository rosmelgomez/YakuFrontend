// src/screens/agricultor/SensoresScreen.tsx
import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Icons } from "@/components/ui/Icons";
import { mockSensors, sensorHistoryData } from "@/data/mockData";
import type { Sensor } from "@/types";

export default function SensoresScreen() {
  const [selected, setSelected] = useState<Sensor>(mockSensors[0]);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? mockSensors : mockSensors.filter(s => s.status === filter);

  const onlineCount = mockSensors.filter(s => s.status === "online").length;
  const warningCount = mockSensors.filter(s => s.status === "warning").length;
  const offlineCount = mockSensors.filter(s => s.status === "offline").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Sensores IoT en Tiempo Real</h2>
          <p className="text-slate-400 text-sm">Monitoreo continuo de telemetría y estado de conectividad</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "En línea", count: onlineCount, color: "text-emerald-400 bg-emerald-950/40 border border-emerald-800/40" },
          { label: "Advertencia", count: warningCount, color: "text-amber-400 bg-amber-950/40 border border-amber-800/40" },
          { label: "Sin señal", count: offlineCount, color: "text-slate-400 bg-slate-900/60 border border-slate-800" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 flex items-center gap-3 ${s.color}`}>
            <div className="w-3 h-3 rounded-full bg-current animate-pulse" />
            <div>
              <p className="font-mono font-bold text-2xl">{s.count}</p>
              <p className="text-xs font-medium opacity-80">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div className="flex gap-2 mb-2">
            {["all", "online", "warning", "offline"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${filter === f ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                {f === "all" ? "Todos" : f}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map(s => (
              <div
                key={s.id}
                onClick={() => setSelected(s)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selected.id === s.id ? "bg-slate-800/90 border-emerald-500 shadow-md" : "bg-slate-900/60 border-slate-800 hover:border-slate-700"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white text-sm">{s.name}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{s.value} {s.unit}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{s.location}</span>
                  <span>{s.lastReading}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-white">{selected.name}</h3>
              <p className="text-xs text-slate-400">{selected.location} · {selected.type}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold font-mono text-emerald-400">{selected.value}</span>
              <span className="text-slate-400 text-sm ml-1">{selected.unit}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorHistoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff" }} />
                <Line type="monotone" dataKey="humidity" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
