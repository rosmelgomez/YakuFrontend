// src/actions/historico.ts


import { getHistoricoData } from "@/services/historico";

export async function obtenerDatosHistoricoPorCultivo(userId: number, idCultivo: number, dias: number) {
  try {
    const data = await getHistoricoData(userId, idCultivo, dias);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al cargar datos históricos" };
  }
}
