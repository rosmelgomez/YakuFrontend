// src/services/ml.ts
import { fetchFromFastAPI } from "@/lib/bff";

export async function getMLDashboardData(userId: number, idCultivo: number) {
  const res = await fetchFromFastAPI(`/dashboard/ml?idCultivo=${idCultivo}`);
  if (!res.ok) {
    throw new Error("Error al obtener datos de ML desde FastAPI");
  }
  return res.json();
}