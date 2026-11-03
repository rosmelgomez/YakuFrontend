// src/services/dashboard.ts
import { fetchFromFastAPI } from "@/lib/bff";

export async function getDashboardData(rango?: { fechaInicio: string; fechaFin: string }) {
  const query = rango
    ? `?${new URLSearchParams({ fecha_inicio: rango.fechaInicio, fecha_fin: rango.fechaFin })}`
    : "";
  // Con rango de calendario se lee siempre de la BD (sin caché), igual que el panel admin.
  const res = await fetchFromFastAPI(`/dashboard/data${query}`, rango ? { cache: "no-store" } : {});
  if (!res.ok) {
    throw new Error("Error al obtener datos del dashboard desde FastAPI");
  }
  return res.json();
}
