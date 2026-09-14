// src/screens/agricultor/RiegoScreen.tsx
import React, { useState } from "react";
import { Icons } from "@/components/ui/Icons";
import type { IrrigationStatus } from "@/types";

interface Zone {
  id: string;
  name: string;
  status: IrrigationStatus;
  deviceConnected: boolean;
  deviceEnabled: boolean;
  startedAt?: string;
  duration?: number;
  waterUsed?: number;
  error?: string;
  triggeredBy?: "manual" | "schedule" | "ai";
  scheduledAt?: string;
}

const initialZones: Zone[] = [
  { id: "z1", name: "Zona A · Tomate Cherry", status: "active", deviceConnected: true, deviceEnabled: true, startedAt: "10:00", duration: 43, waterUsed: 280, triggeredBy: "schedule" },
  { id: "z2", name: "Zona B · Pimiento Rojo", status: "paused", deviceConnected: true, deviceEnabled: true, startedAt: "09:15", duration: 30, waterUsed: 190, triggeredBy: "manual" },
  { id: "z3", name: "Zona C · Lechuga Romana", status: "failed", deviceConnected: false, deviceEnabled: true, error: "El sensor de caudal no responde. Verifica la conexión.", triggeredBy: "ai" },
  { id: "z4", name: "Zona D · Reserva", status: "inactive", deviceConnected: true, deviceEnabled: false, scheduledAt: "16:00" },
];

export default function RiegoScreen() {
  const [zones, setZones] = useState<Zone[]>(initialZones);

  const toggleZone = (id: string) => {
    setZones(prev => prev.map(z => {
      if (z.id !== id) return z;
      const nextStatus = z.status === "active" ? "inactive" : "active";
      return { ...z, status: nextStatus };
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Control de Riego y Válvulas</h2>
          <p className="text-slate-400 text-sm">Monitoreo y accionamiento de sectores de riego automatizado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zones.map(zone => (
          <div key={zone.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white text-base">{zone.name}</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  {zone.deviceConnected ? "Dispositivo Conectado" : "Desconectado"}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${zone.status === "active" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-slate-800 text-slate-400"}`}>
                {zone.status === "active" ? "Regando" : "Detenido"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Agua consumida</p>
                <p className="font-semibold text-slate-200">{zone.waterUsed || 0} L</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-0.5">Duración activa</p>
                <p className="font-semibold text-slate-200">{zone.duration || 0} min</p>
              </div>
            </div>

            <button
              onClick={() => toggleZone(zone.id)}
              className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${zone.status === "active" ? "bg-red-600/80 hover:bg-red-600 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
            >
              {zone.status === "active" ? "Detener Riego" : "Iniciar Riego Manual"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
