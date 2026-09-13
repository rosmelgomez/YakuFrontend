import type { DispositivoItem } from "./types";

export const EXCLUDED_UMBRAL_CODES = ["NIVEL_AGUA", "BAT_PCT", "CAUDAL"];
export const EXCLUDED_UMBRAL_NAMES = ["nivel de tanque", "nivel de batería", "caudal de riego", "caudal"];

export function filtrarUmbralesSueloAmbiente(items: any[] = []): any[] {
  return (items || []).filter((u: any) => {
    const code = (u?.codigo || "").toUpperCase();
    const name = (u?.nombre || "").toLowerCase();
    if (EXCLUDED_UMBRAL_CODES.includes(code)) return false;
    if (EXCLUDED_UMBRAL_NAMES.some((n) => name.includes(n))) return false;
    return true;
  });
}

export function getDispositivosSensores(dispositivos: DispositivoItem[] = []): DispositivoItem[] {
  return dispositivos.filter(
    (dev: any) =>
      dev.tipoId === 1 ||
      dev.tipoNombre?.toLowerCase().includes("sensor") ||
      dev.tipoNombre?.toLowerCase().includes("colector") ||
      dev.nombre?.toLowerCase().includes("suelo") ||
      dev.nombre?.toLowerCase().includes("clima")
  );
}

export function getDispositivosActuadores(
  dispositivos: DispositivoItem[] = [],
  sensores: DispositivoItem[] = []
): DispositivoItem[] {
  const sensorIds = new Set(sensores.map((s) => s.id));
  return dispositivos.filter((dev) => !sensorIds.has(dev.id));
}

export function getSystemStatusBadge(isSensorsActivos: boolean, isActuadoresActivos: boolean) {
  if (isSensorsActivos && isActuadoresActivos) {
    return {
      badgeColor: "green",
      badgeText: "Sistema operativo",
      badgeDotColor: "#22c55e",
    };
  }
  if (isSensorsActivos || isActuadoresActivos) {
    return {
      badgeColor: "orange",
      badgeText: "Operación parcial",
      badgeDotColor: "#f97316",
    };
  }
  return {
    badgeColor: "red",
    badgeText: "Sistema inactivo",
    badgeDotColor: "#ef4444",
  };
}

export function formatearTiempoDesdeUltimo(seconds: number | null): string {
  if (seconds === null) return "Sin registros";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  let res = "";
  if (h > 0) res += `${h}h `;
  if (m > 0 || h > 0) res += `${m}m `;
  res += `${s}s`;
  return res;
}

export function formatearSegundos(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    h.toString().padStart(2, "0"),
    m.toString().padStart(2, "0"),
    s.toString().padStart(2, "0"),
  ].join(":");
}
