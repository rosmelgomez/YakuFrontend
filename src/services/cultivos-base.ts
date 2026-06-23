import { cache } from "react";
import { fetchFromFastAPI } from "@/lib/bff";

export type CultivoBase = {
  id: number;
  nombre_planta: string;
};

export const getCultivosBase = cache(async (): Promise<CultivoBase[]> => {
  const res = await fetchFromFastAPI("/dashboard/data");
  if (!res.ok) {
    throw new Error("Error al conectar con el servidor backend.");
  }

  const dashboardData = await res.json();
  return dashboardData.map((cultivo: any) => ({
    id: cultivo.idCultivo,
    nombre_planta: cultivo.nombreCultivo,
  }));
});
