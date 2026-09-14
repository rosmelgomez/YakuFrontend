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
        size="3"
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
          <Flex direction="column" gap="3">
            {dispositivosSensores.map((dev: any) => (
              <Flex
                key={`sensor-${dev.id}`}
                justify="between"
                align="center"
                style={{
                  borderBottom: "1px solid var(--border-mockup)",
                  paddingBottom: "10px",
                }}
              >
                <Box>
                  <Flex align="center" gap="2">
                    <Text size="2" weight="bold" style={{ color: "white" }}>
                      {dev.nombre}
                    </Text>
                    {dev.tipoNombre && (
                      <Badge color="indigo" variant="outline" size="1">
                        {dev.tipoNombre}
                      </Badge>
                    )}
                  </Flex>
                  <Text
                    size="1"
                    color="gray"
                    style={{ fontFamily: "monospace", display: "block", marginTop: "2px" }}
                  >
                    MAC: {dev.mac}
                  </Text>
                  {dev.sensores && dev.sensores.length > 0 && (
                    <Box mt="1" pl="2" style={{ borderLeft: "2px solid var(--border-mockup)" }}>
                      {dev.sensores.map((s: any, index: number) => (
                        <Flex
                          key={`sensor-${dev.id}-${s.id}-${index}`}
                          align="center"
                          gap="2"
                          mt="1"
                        >
                          <Text size="1" color="gray">
                            • <span style={{ color: "#9ca3af" }}>{s.nombre}</span>{" "}
                            <span
                              style={{
                                color: "#6b7280",
                                fontSize: "0.75rem",
                                fontFamily: "monospace",
                              }}
                            >
                              (GPIO {s.pin})
                            </span>
                          </Text>
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
                              height: "18px",
                              padding: "0 4px",
                              fontSize: "0.7rem",
                            }}
                          >
                            ⚙️ Calibrar
                          </Button>
                        </Flex>
                      ))}
                    </Box>
                  )}
                </Box>
                <Flex gap="3" align="center">
                  <Badge color={dev.conectado ? "green" : "red"} variant="soft">
                    {dev.conectado ? "Online" : "Offline"}
                  </Badge>
                  <Switch
                    checked={dev.funcionamientoActivo}
                    onCheckedChange={(checked) => onToggleCaptura(dev.id, checked)}
                    style={{ cursor: "pointer" }}
                  />
                </Flex>
              </Flex>
            ))}
          </Flex>
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
