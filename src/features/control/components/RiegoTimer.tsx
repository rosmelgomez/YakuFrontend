"use client";

import React, { useState, useEffect, useRef } from "react";
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
  onComplete?: () => void;
}

export function RiegoActivoTimer({
  isActuatorActive,
  riegoActivo,
  bombaEncendida,
  timeoutMin,
  onComplete,
}: RiegoActivoTimerProps) {
  const [seconds, setSeconds] = useState<number>(0);
  const plannedSeconds = Number(riegoActivo?.duracionSegundos || timeoutMin * 60);
  const completedRef = useRef<boolean>(false);

  useEffect(() => {
    completedRef.current = false;
  }, [riegoActivo?.id, bombaEncendida]);

  useEffect(() => {
    if (!isActuatorActive || !bombaEncendida) {
      setSeconds(0);
      return;
    }

    const baseElapsed = Number(riegoActivo?.segundosTranscurridos || 0);
    const referenceDate = riegoActivo?.fechaReferencia
      ? new Date(riegoActivo.fechaReferencia)
      : null;
    const mountTime = Date.now();

    const updateTimer = () => {
      const liveElapsed =
        referenceDate && !Number.isNaN(referenceDate.getTime())
          ? Math.max(0, Math.floor((Date.now() - referenceDate.getTime()) / 1000))
          : Math.max(0, Math.floor((Date.now() - mountTime) / 1000));
      const totalElapsed = baseElapsed + liveElapsed;
      const planned = Number(riegoActivo?.duracionSegundos || timeoutMin * 60);

      if (planned > 0 && totalElapsed >= planned) {
        setSeconds(planned);
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      } else {
        setSeconds(totalElapsed);
      }
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
    timeoutMin,
    onComplete,
  ]);

  return (
    <Text size="6" weight="bold" style={{ color: "#34d399", fontFamily: "monospace", marginTop: "4px" }}>
      {formatearSegundos(seconds)} / {formatearSegundos(plannedSeconds)}
    </Text>
  );
}
