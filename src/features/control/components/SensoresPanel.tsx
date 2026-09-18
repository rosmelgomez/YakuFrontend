"use client";

import React, { useState } from "react";
import {
  Box,
  Card,
  Flex,
  Text,
  Badge,
  Switch,
  Button,
  Dialog,
  TextField,
} from "@radix-ui/themes";
import type { DispositivoItem } from "../types";
import { diagnosticarSensor } from "@/actions/control";

interface SensoresPanelProps {
  dispositivosSensores: DispositivoItem[];
  onToggleCaptura: (devId: number, active: boolean) => void;
  onCalibrarSensor: (devId: number, pin: number, offset: number) => Promise<void>;
}

export function SensoresPanel({
  dispositivosSensores,
  onToggleCaptura,
  onCalibrarSensor,
}: SensoresPanelProps) {
  const [calibDevId, setCalibDevId] = useState<number | null>(null);
  const [calibPin, setCalibPin] = useState<number | null>(null);
  const [calibSensorName, setCalibSensorName] = useState<string>("");
  const [calibOffset, setCalibOffset] = useState<string>("0.0");
  const [diagLoadingId, setDiagLoadingId] = useState<number | null>(null);
  const [diagResults, setDiagResults] = useState<Record<number, any>>({});

  const handleDiagnosticar = async (idAsignacion: number) => {
    setDiagLoadingId(idAsignacion);
    const res = await diagnosticarSensor(idAsignacion);
    setDiagLoadingId(null);
    if (res.success) {
      setDiagResults((prev) => ({ ...prev, [idAsignacion]: res.data }));
    } else {
      alert(`❌ Error al diagnosticar: ${res.error}`);
    }
  };

  const OFFSET_MIN = -50;
  const OFFSET_MAX = 50;

  const handleCalibrateSubmit = async () => {
    if (calibDevId === null || calibPin === null) return;
    const offsetVal = parseFloat(calibOffset);
    if (isNaN(offsetVal)) {
      alert("Por favor ingrese un offset numérico válido.");
      return;
    }
    if (offsetVal < OFFSET_MIN || offsetVal > OFFSET_MAX) {
      alert(`El offset debe estar entre ${OFFSET_MIN} y ${OFFSET_MAX}.`);
      return;
    }
    await onCalibrarSensor(calibDevId, calibPin, offsetVal);
    setCalibDevId(null);
  };

  return (
    <Flex direction="column" gap="5">
      {/* Ayuda memoria: cómo calibrar un sensor */}
      <Card
        size="2"
        style={{
          background: "rgba(59, 130, 246, 0.06)",
          borderColor: "rgba(59, 130, 246, 0.25)",
          borderRadius: "12px",
          padding: "16px",
        }}
      >
        <Flex gap="3" align="start">
          <Text size="5" style={{ marginTop: "-2px" }}>
            ℹ️
          </Text>
          <Box>
            <Text size="2" weight="bold" style={{ color: "#93c5fd" }} as="div">
              Ayuda memoria: ¿cómo calibro un sensor?
            </Text>
            <Text
              size="1"
              color="gray"
              style={{ display: "block", marginTop: "4px", lineHeight: "1.5" }}
            >
              Compare la lectura que muestra el sistema para este sensor con una medición de
              referencia (un higrómetro/termómetro de mano, o el dato real que usted observa en el
              cultivo). El offset es la diferencia que hay que sumarle a la lectura del sistema
              para que coincida con la realidad:
            </Text>
            <Text
              size="1"
              style={{ display: "block", marginTop: "6px", color: "#c7d2fe", fontFamily: "monospace" }}
            >
              offset = valor real observado − valor mostrado por el sistema
            </Text>
            <Text
              size="1"
              color="gray"
              style={{ display: "block", marginTop: "6px", lineHeight: "1.5" }}
            >
              Ejemplo: si el sistema marca 45% de humedad de suelo pero al comprobarlo
              físicamente el suelo está en 50%, ingrese <strong>+5</strong>. Si el sistema marca
              55% y en realidad es 50%, ingrese <strong>-5</strong>. El ajuste se aplica de
              inmediato a todas las lecturas nuevas de ese sensor (incluyendo las que usa el
              modelo predictivo ML), y puede reabrir "Calibrar" en cualquier momento para afinarlo
              o volver a 0.
            </Text>
          </Box>
        </Flex>
      </Card>

      <Card
        size={{ initial: "2", sm: "3" }}
        style={{
          background: "var(--surface-mockup)",
          borderColor: "var(--border-mockup)",
          borderRadius: "16px",
        }}
      >
        <Text size="3" weight="bold" color="indigo" mb="4" as="div">
          📡 Dispositivos de Captura de Sensores
        </Text>
        {dispositivosSensores.length > 0 ? (
          <div className="flex flex-col gap-3">
            {dispositivosSensores.map((dev: any) => (
              <div
                key={`sensor-${dev.id}`}
                className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 transition-colors"
              >
                {/* FILA SUPERIOR: Encabezado del Dispositivo y Controles Principales */}
                <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800/60">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base leading-tight">
                        {dev.nombre}
                      </span>
                      {dev.tipoNombre && (
                        <Badge color="indigo" variant="outline" size="1">
                          {dev.tipoNombre}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                      MAC: {dev.mac}
                    </span>
                  </div>

                  {/* Estado de Conexión + Switch de Activación */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <Badge color={dev.conectado ? "green" : "red"} variant="soft" size="1">
                      {dev.conectado ? "Online" : "Offline"}
                    </Badge>
                    <Switch
                      checked={dev.funcionamientoActivo}
                      onCheckedChange={(checked) => onToggleCaptura(dev.id, checked)}
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                </div>

                {/* SECCIÓN INFERIOR: Lista de Sensores Vinculados */}
                {dev.sensores && dev.sensores.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 pl-2 border-l-2 border-slate-800">
                    {dev.sensores.map((s: any, index: number) => {
                      const diag = s.idAsignacion ? diagResults[s.idAsignacion] : null;
                      return (
                      <div
                        key={`sensor-${dev.id}-${s.id}-${index}`}
                        className="flex items-center justify-between gap-2 py-0.5 flex-wrap"
                      >
                        <div className="min-w-0 flex-1 text-xs text-slate-300">
                          <span className="text-slate-500 mr-1.5">•</span>
                          <span className="text-slate-200 font-medium">{s.nombre}</span>{" "}
                          <span className="text-slate-500 font-mono text-[11px]">
                            (GPIO {s.pin})
                          </span>
                          {diag && (
                            <div className="mt-1 text-[10.5px]" style={{ color: diag.estado === "Ok" ? "#4ade80" : "#f87171" }}>
                              {diag.estado === "Ok" ? "✅" : "⚠️"} {diag.estado}: {diag.motivo}
                            </div>
                          )}
                        </div>
                        <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
                          {!!s.offsetCalibracion && (
                            <Badge color="amber" variant="soft" size="1">
                              Offset: {s.offsetCalibracion > 0 ? "+" : ""}
                              {s.offsetCalibracion}
                            </Badge>
                          )}
                          {s.idAsignacion && (
                            <Button
                              size="1"
                              variant="ghost"
                              color="gray"
                              disabled={diagLoadingId === s.idAsignacion}
                              onClick={() => handleDiagnosticar(s.idAsignacion)}
                              style={{
                                cursor: "pointer",
                                height: "22px",
                                padding: "0 6px",
                                fontSize: "0.72rem",
                              }}
                            >
                              {diagLoadingId === s.idAsignacion ? "..." : "🩺 Diagnosticar"}
                            </Button>
                          )}
                          <Button
                            size="1"
                            variant="ghost"
                            color="indigo"
                            onClick={() => {
                              setCalibDevId(dev.id);
                              setCalibPin(s.pin);
                              setCalibSensorName(s.nombre);
                              setCalibOffset(String(s.offsetCalibracion ?? 0));
                            }}
                            style={{
                              cursor: "pointer",
                              height: "22px",
                              padding: "0 6px",
                              fontSize: "0.72rem",
                            }}
                          >
                            ⚙️ Calibrar
                          </Button>
                        </Flex>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Text color="gray" size="2">
            No hay dispositivos de captura de sensores vinculados a este cultivo.
          </Text>
        )}
      </Card>

      {/* MODAL DE CALIBRACIÓN REMOTA */}
      <Dialog.Root
        open={calibDevId !== null}
        onOpenChange={(open) => !open && setCalibDevId(null)}
      >
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            maxWidth: 400,
            width: "min(400px, 92vw)",
            background: "var(--surface-mockup)",
            border: "1px solid var(--border-mockup)",
          }}
        >
          <Dialog.Title style={{ color: "white" }}>Calibración de Sensor</Dialog.Title>
          <Text size="2" color="gray" mb="4">
            Ajuste de offset de calibración remota para el sensor{" "}
            <span style={{ color: "white", fontWeight: "bold" }}>{calibSensorName}</span> en pin
            GPIO {calibPin}.
          </Text>

          <Flex direction="column" gap="3" mt="3">
            <label>
              <Text color="gray" size="2">
                Offset de Compensación ({OFFSET_MIN} a {OFFSET_MAX})
              </Text>
            </label>
            <TextField.Root
              type="text"
              placeholder="Ej: -2.5 o 1.2"
              value={calibOffset}
              onChange={(e) => setCalibOffset(e.target.value)}
              style={{
                background: "var(--surface2-mockup)",
                color: "white",
                border: "1px solid var(--border-mockup)",
              }}
            />
            <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
              Este valor se suma automáticamente a cada lectura que reporte este sensor a partir
              de ahora (efecto inmediato en el servidor, no depende del firmware del dispositivo).
            </Text>
          </Flex>

          <Flex gap="3" mt="5" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" style={{ cursor: "pointer" }}>
                Cancelar
              </Button>
            </Dialog.Close>
            <Button color="green" onClick={handleCalibrateSubmit} style={{ cursor: "pointer" }}>
              Enviar Calibración
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
