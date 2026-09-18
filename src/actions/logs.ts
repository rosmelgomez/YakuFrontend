// src/actions/logs.ts

import { fetchFromFastAPI } from "@/lib/bff";

export async function listarLogsSistema(filtros: { modulo?: string; desde?: string; hasta?: string; limit?: number } = {}) {
  try {
    const params = new URLSearchParams();
    if (filtros.modulo) params.set("modulo", filtros.modulo);
    if (filtros.desde) params.set("desde", filtros.desde);
    if (filtros.hasta) params.set("hasta", filtros.hasta);
    params.set("limit", String(filtros.limit ?? 100));

    const res = await fetchFromFastAPI(`/admin/logs?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: text || "Error al obtener el historial" };
    }
    return { success: true, data: await res.json() };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al obtener el historial" };
  }
}
