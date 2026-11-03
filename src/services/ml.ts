// src/services/ml.ts
import { fetchFromFastAPI } from "@/lib/bff";

// Filtro de tiempo de la vista ML (mismo esquema que el panel de control).
export type MLFiltro =
  | { modo: 'reciente'; rango: '6h' | '24h' | '7d' | '30d' }
  | { modo: 'calendario'; fechaInicio: string; fechaFin: string };

export async function getMLDashboardData(userId: number, idCultivo: number, filtro?: MLFiltro) {
  const params = new URLSearchParams({ idCultivo: String(idCultivo) });
  if (filtro?.modo === 'reciente') params.set("rango", filtro.rango);
  if (filtro?.modo === 'calendario') {
    params.set("fecha_inicio", filtro.fechaInicio);
    params.set("fecha_fin", filtro.fechaFin);
  }
  const res = await fetchFromFastAPI(`/dashboard/ml?${params}`, filtro ? { cache: "no-store" } : {});
  if (!res.ok) {
    throw new Error("Error al obtener datos de ML desde FastAPI");
  }
  return res.json();
}
