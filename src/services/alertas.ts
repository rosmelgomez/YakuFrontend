// src/services/alertas.ts
import { fetchFromFastAPI } from "@/lib/bff";

export async function getAlertasData(userId: number, idCultivo: number) {
  const res = await fetchFromFastAPI(`/dashboard/alertas?idCultivo=${idCultivo}`);
  if (!res.ok) {
    throw new Error("Error al obtener datos de alertas desde FastAPI");
  }
  return res.json();
}

export async function getNotifConfig() {
  const res = await fetchFromFastAPI("/dashboard/alertas/config");
  if (!res.ok) {
    throw new Error("Error al obtener configuraciones de notificaciones");
  }
  return res.json();
}