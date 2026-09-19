import { fetchFromFastAPI } from "@/lib/bff";
import { swrFetch, invalidateCache } from "@/lib/cache";

export type CultivoBase = {
  id: number;
  nombre_planta: string;
};

const CACHE_KEY = "cultivos_base";

// `swrFetch` (cache real en memoria del navegador) en vez del `cache()` de
// 'react': ese es para React Server Components y no memoiza nada en un SPA
// cliente como este. Sin cache real, el prefetch por hover del menu
// (lib/prefetch.ts) pedia los datos y los descartaba, y cada pantalla
// (Control, Historico, Alertas, ML, Feedback) volvia a pedirlos desde cero.
export async function getCultivosBase(): Promise<CultivoBase[]> {
  return swrFetch(
    CACHE_KEY,
    async () => {
      const res = await fetchFromFastAPI("/dashboard/cultivos-base");
      if (!res.ok) {
        throw new Error("Error al conectar con el servidor backend.");
      }
      return res.json();
    },
    30_000
  );
}

export function invalidateCultivosBase(): void {
  invalidateCache(CACHE_KEY);
}
