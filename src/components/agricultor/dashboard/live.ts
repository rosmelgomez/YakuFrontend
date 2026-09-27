// Utilidades de datos en vivo del dashboard del agricultor.
//
// El colector publica cada ~60 s por MQTT; el backend guarda la lectura
// (ya calibrada) y la reenvía por WebSocket dentro del evento "telemetria".
// Aquí se aplica esa lectura al estado sin recargar todo el dashboard, y se
// calcula el estado real del flujo de datos a partir de la edad de la última
// lectura (no de si el dispositivo está "activado").

import { useEffect, useState } from "react";

export const CLAVES_SENSOR = ["humedadSuelo", "humedadAmbiente", "temperaturaAmbiente", "temperaturaSuelo"] as const;
export type ClaveSensor = (typeof CLAVES_SENSOR)[number];

export type LecturaEnVivo = {
  idAsignacion?: number;
  valor: number | null;
  valorHistorial: number | null;
  porcentaje: number | null;
  ema: number | null;
  fecha: string | null;
};

/** Periodo de envío del colector: una lectura por minuto. */
export const PERIODO_ENVIO_MS = 60_000;
/** Hasta aquí se considera "en vivo" (margen para latencia y un envío perdido). */
export const LIMITE_EN_VIVO_MS = 2.5 * PERIODO_ENVIO_MS;
/** A partir de aquí una tarjeta de sensor se muestra como sin datos recientes. */
export const LIMITE_SENSOR_OBSOLETO_MS = 5 * 60_000;

export function aplicarLecturasEnVivo(
  cultivos: any[] | null,
  idCultivo: number | string,
  lecturas: Partial<Record<ClaveSensor, LecturaEnVivo>>
): any[] | null {
  if (!cultivos) return cultivos;
  return cultivos.map((c) => {
    if (Number(c.idCultivo) !== Number(idCultivo)) return c;
    const sensores = { ...c.sensores };
    const historial = { ...c.historialSensores };
    for (const clave of CLAVES_SENSOR) {
      const l = lecturas[clave];
      if (!l || l.fecha === null) continue;
      const previo = sensores[clave];
      if (previo && l.valor !== null) {
        sensores[clave] = {
          ...previo,
          valor: l.valor,
          porcentaje: l.porcentaje ?? previo.porcentaje,
          ema: l.ema,
          fecha: l.fecha,
        };
      }
      if (l.valorHistorial !== null && Array.isArray(historial[clave])) {
        const serie = historial[clave];
        const ultima = serie[serie.length - 1];
        // Evita duplicar si la misma lectura llega dos veces.
        if (!ultima || new Date(ultima.fecha).getTime() !== new Date(l.fecha).getTime()) {
          historial[clave] = [...serie, { fecha: l.fecha, valor: l.valorHistorial }];
        }
      }
    }
    return { ...c, sensores, historialSensores: historial };
  });
}

/** Fecha (ms) de la lectura más reciente entre los cuatro sensores. */
export function ultimaLecturaMs(cultivo: any): number | null {
  let max: number | null = null;
  for (const clave of CLAVES_SENSOR) {
    const f = cultivo?.sensores?.[clave]?.fecha;
    const t = f ? new Date(f).getTime() : NaN;
    if (Number.isFinite(t) && (max === null || t > max)) max = t;
  }
  return max;
}

export function haceTiempo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return "ahora";
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export type EstadoFlujo = {
  t: "green" | "amber" | "red" | "gray";
  texto: string;
  detalle: string;
  pulso: boolean;
};

export function estadoFlujo({
  ultimaLectura,
  recolectorActivo,
  wsConectado,
  ahora,
}: {
  ultimaLectura: number | null;
  recolectorActivo: boolean;
  wsConectado: boolean;
  ahora: number;
}): EstadoFlujo {
  if (!recolectorActivo) {
    return {
      t: "gray",
      texto: "Recolector inactivo",
      detalle: ultimaLectura ? `Última lectura ${haceTiempo(ahora - ultimaLectura)}` : "Sin lecturas",
      pulso: false,
    };
  }
  if (ultimaLectura === null) {
    return { t: "gray", texto: "Esperando datos", detalle: "Aún no hay lecturas de este cultivo", pulso: false };
  }
  const edad = ahora - ultimaLectura;
  if (!wsConectado) {
    return {
      t: "amber",
      texto: "Reconectando…",
      detalle: `Conexión en tiempo real caída · última lectura ${haceTiempo(edad)}`,
      pulso: false,
    };
  }
  if (edad <= LIMITE_EN_VIVO_MS) {
    return { t: "green", texto: "En vivo", detalle: `Última lectura ${haceTiempo(edad)}`, pulso: true };
  }
  if (edad <= 15 * 60_000) {
    return { t: "amber", texto: `Retrasado · ${haceTiempo(edad)}`, detalle: "El colector no ha enviado la última lectura", pulso: false };
  }
  return { t: "red", texto: "Sin datos", detalle: `Última lectura ${haceTiempo(edad)}`, pulso: false };
}

/** Reloj local para componentes que muestran antigüedad; no re-renderiza a sus padres. */
export function useAhora(intervaloMs = 1000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}

/** Estado del WebSocket de tiempo real (lo emite NotificationProvider). */
export function useWsConectado(): boolean {
  const [conectado, setConectado] = useState<boolean>(() =>
    typeof window === "undefined" ? true : (window as any).__yakuWsConectado !== false
  );
  useEffect(() => {
    const onStatus = (e: Event) => setConectado(Boolean((e as CustomEvent).detail?.conectado));
    window.addEventListener("yaku:ws_status", onStatus);
    return () => window.removeEventListener("yaku:ws_status", onStatus);
  }, []);
  return conectado;
}
