// src/services/historico.ts
import { fetchFromFastAPI } from "@/lib/bff";

export type HistoricoResponse = {
  chartData: (any & { fecha?: string })[];
  stats: any;
  riegoLog: {
    id: string;
    fecha?: string;
    fechaStr: string;
    origen: string;
    colorOrigen: string;
    litros: string;
  }[];
};

export async function getHistoricoData(userId: number, idCultivo: number, dias: number): Promise<HistoricoResponse> {
  const res = await fetchFromFastAPI(`/dashboard/historico?idCultivo=${idCultivo}&dias=${dias}`);
  if (!res.ok) {
    throw new Error("Error al obtener datos históricos desde FastAPI");
  }
  return res.json();
}
