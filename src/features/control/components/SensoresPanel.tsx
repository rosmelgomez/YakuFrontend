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

  const handleCalibrateSubmit = async () => {
    if (calibDevId === null || calibPin === null) return;
    const offsetVal = parseFloat(calibOffset);
    if (isNaN(offsetVal)) {
      alert("Por favor ingrese un offset numérico válido.");
      return;
    }
    await onCalibrarSensor(calibDevId, calibPin, offsetVal);
    setCalibDevId(null);
  };

  return (
    <Flex direction="column" gap="5">
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
                    {dev.sensores.map((s: any, index: number) => (
                      <div
                        key={`sensor-${dev.id}-${s.id}-${index}`}
                        className="flex items-center justify-between gap-2 py-0.5"
                      >
                        <div className="min-w-0 flex-1 text-xs text-slate-300">
                          <span className="text-slate-500 mr-1.5">•</span>
                          <span className="text-slate-200 font-medium">{s.nombre}</span>{" "}
                          <span className="text-slate-500 font-mono text-[11px]">
                            (GPIO {s.pin})
                          </span>
                        </div>
                        <Button
                          size="1"
                          variant="ghost"
                          color="indigo"
                          onClick={() => {
                            setCalibDevId(dev.id);
                            setCalibPin(s.pin);
                            setCalibSensorName(s.nombre);
                            setCalibOffset("0.0");
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
                      </div>
                    ))}
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
                Offset de Compensación
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
              Nota: Este valor se enviará al firmware del ESP32 vía MQTT para sumar/restar a la
              lectura bruta.
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
