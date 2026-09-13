"use client";

import React, { useState, useEffect } from "react";
import { Text } from "@radix-ui/themes";
import { formatearTiempoDesdeUltimo, formatearSegundos } from "../selectors";

interface UltimoRiegoTimerProps {
  ultimoRiegoFechaFin?: string | null;
}

export function UltimoRiegoTimer({ ultimoRiegoFechaFin }: UltimoRiegoTimerProps) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!ultimoRiegoFechaFin) {
      setSeconds(null);
      return;
    }

    const fechaFin = new Date(ultimoRiegoFechaFin);

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((Date.now() - fechaFin.getTime()) / 1000));
      setSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [ultimoRiegoFechaFin]);

  return (
    <Text size="6" weight="bold" style={{ color: "#60a5fa", fontFamily: "monospace" }}>
      {formatearTiempoDesdeUltimo(seconds)}
    </Text>
  );
}

interface RiegoActivoTimerProps {
  isActuatorActive: boolean;
  riegoActivo?: {
    id?: number;
    segundosTranscurridos?: number;
    duracionSegundos?: number;
    fechaReferencia?: string;
  } | null;
  bombaEncendida: boolean;
  timeoutMin: number;
}

export function RiegoActivoTimer({
  isActuatorActive,
  riegoActivo,
  bombaEncendida,
  timeoutMin,
}: RiegoActivoTimerProps) {
  const [seconds, setSeconds] = useState<number>(0);
  const plannedSeconds = Number(riegoActivo?.duracionSegundos || timeoutMin * 60);

  useEffect(() => {
    if (!isActuatorActive || !riegoActivo || !bombaEncendida) {
      setSeconds(0);
      return;
    }

    const baseElapsed = Number(riegoActivo.segundosTranscurridos || 0);
    const referenceDate = riegoActivo.fechaReferencia
      ? new Date(riegoActivo.fechaReferencia)
      : null;

    const updateTimer = () => {
      const liveElapsed =
        referenceDate && !Number.isNaN(referenceDate.getTime())
          ? Math.max(0, Math.floor((Date.now() - referenceDate.getTime()) / 1000))
          : 0;
      const totalElapsed = baseElapsed + liveElapsed;
      const planned = Number(riegoActivo.duracionSegundos || 0);
      setSeconds(planned > 0 ? Math.min(totalElapsed, planned) : totalElapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [
    isActuatorActive,
    riegoActivo?.id,
    riegoActivo?.segundosTranscurridos,
    riegoActivo?.duracionSegundos,
    riegoActivo?.fechaReferencia,
    bombaEncendida,
  ]);

  return (
    <Text size="6" weight="bold" style={{ color: "#34d399", fontFamily: "monospace", marginTop: "4px" }}>
      {formatearSegundos(seconds)} / {formatearSegundos(plannedSeconds)}
    </Text>
  );
}
