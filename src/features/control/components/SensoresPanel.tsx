"use client";

import React, { useState } from "react";
import {
  Box,
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
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudFog,
  Droplets,
  Radio,
  SlidersHorizontal,
  Stethoscope,
  Thermometer,
  ThermometerSun,
  type LucideIcon,
} from "lucide-react";
import { HelpNote, Inset, Panel, SectionHeader, tone, type Tone } from "./ui";

interface SensoresPanelProps {
  dispositivosSensores: DispositivoItem[];
  onToggleCaptura: (devId: number, active: boolean) => void;
  onCalibrarSensor: (
    devId: number,
    pin: number,
    offset: number,
    idAsignacion?: number | null,
    variable?: string | null
  ) => Promise<void>;
}

// Variable que mide cada asignación. Un mismo sensor físico puede medir
// varias (el DHT22 reporta humedad y temperatura ambiente en un solo pin),
// y cada una se calibra por separado porque tiene su propia unidad y error.
const METRICAS: Record<string, { label: string; unidad: string; icon: LucideIcon; t: Tone; ejemplo: [number, number] }> = {
  HUM_SUELO: { label: "Humedad del suelo", unidad: "%", icon: Droplets, t: "green", ejemplo: [45, 50] },
  HUM_AMB: { label: "Humedad ambiente", unidad: "%", icon: CloudFog, t: "teal", ejemplo: [60, 65] },
  TEMP_AMB: { label: "Temperatura ambiente", unidad: "°C", icon: ThermometerSun, t: "amber", ejemplo: [24, 22.5] },
  TEMP_SUELO: { label: "Temperatura del suelo", unidad: "°C", icon: Thermometer, t: "blue", ejemplo: [20, 21] },
};

function metricaDe(s: any) {
  const conocida = s?.metricaCodigo ? METRICAS[s.metricaCodigo] : undefined;
  if (conocida) return conocida;
  return {
    label: s?.metricaNombre || "Variable no identificada",
    unidad: s?.metricaUnidad || "",
    icon: Activity,
    t: "gray" as Tone,
    ejemplo: [10, 12] as [number, number],
  };
}

const fmtOffset = (v: number) => `${v > 0 ? "+" : ""}${v}`;

export function SensoresPanel({
  dispositivosSensores,
  onToggleCaptura,
  onCalibrarSensor,
}: SensoresPanelProps) {
  const [calibDevId, setCalibDevId] = useState<number | null>(null);
  const [calibPin, setCalibPin] = useState<number | null>(null);
  const [calibSensorName, setCalibSensorName] = useState<string>("");
  const [calibSensor, setCalibSensor] = useState<any>(null);
  const [calibHermanas, setCalibHermanas] = useState<any[]>([]);
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
    const variable = calibSensor ? metricaDe(calibSensor).label : null;
    await onCalibrarSensor(calibDevId, calibPin, offsetVal, calibSensor?.idAsignacion ?? null, variable);
    setCalibDevId(null);
  };

  return (
    <Flex direction="column" gap="4">
      <HelpNote title="¿Cómo calibro un sensor?">
        <p>
          Compare la lectura que muestra el sistema para este sensor con una medición de referencia (un
          higrómetro/termómetro de mano, o el dato real que usted observa en el cultivo). El offset es la diferencia
          que hay que sumarle a la lectura del sistema para que coincida con la realidad:
        </p>
        <p style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          offset = valor real observado − valor mostrado por el sistema
        </p>
        <p>
          <strong>Cada variable se calibra por separado.</strong> Un sensor que mide dos cosas, como el DHT22 (humedad y
          temperatura ambiente en el mismo pin), aparece en dos filas: calibre la humedad en %, y la temperatura en °C,
          cada una con su propio offset.
        </p>
        <p>
          Ejemplo: si el sistema marca 45% de humedad de suelo pero al comprobarlo físicamente el suelo está en 50%,
          ingrese <strong>+5</strong>. Si el sistema marca 55% y en realidad es 50%, ingrese <strong>-5</strong>. El
          ajuste se aplica de inmediato a todas las lecturas nuevas de ese sensor (incluyendo las que usa el modelo
          predictivo ML), y puede reabrir "Calibrar" en cualquier momento para afinarlo o volver a 0.
        </p>
      </HelpNote>

      <Panel>
        <Flex direction="column" gap="4">
          <SectionHeader icon={Radio} t="green" title="Dispositivos de captura de sensores" />
          {dispositivosSensores.length > 0 ? (
            <Flex direction="column" gap="3">
              {dispositivosSensores.map((dev: any) => (
                <Inset key={`sensor-${dev.id}`}>
                  {/* Encabezado del dispositivo y controles principales */}
                  <Flex align="center" justify="between" gap="3">
                    <Box style={{ minWidth: 0, flex: 1 }}>
                      <Flex align="center" gap="2" wrap="wrap">
                        <Text size="2" weight="bold" style={{ color: "var(--foreground)" }}>
                          {dev.nombre}
                        </Text>
                        {dev.tipoNombre && (
                          <Badge color="gray" variant="outline" size="1">
                            {dev.tipoNombre}
                          </Badge>
                        )}
                      </Flex>
                      <Text
                        size="1"
                        as="div"
                        style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", marginTop: 2 }}
                      >
                        MAC {dev.mac}
                      </Text>
                    </Box>

                    <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
                      <Badge color={dev.conectado ? "green" : "red"} variant="soft" size="1">
                        {dev.conectado ? "Online" : "Offline"}
                      </Badge>
                      <Switch
                        aria-label={`Activar ${dev.nombre}`}
                        checked={dev.funcionamientoActivo}
                        onCheckedChange={(checked) => onToggleCaptura(dev.id, checked)}
                        style={{ cursor: "pointer" }}
                      />
                    </Flex>
                  </Flex>

                  {/* Sensores vinculados */}
                  {dev.sensores && dev.sensores.length > 0 && (
                    <Flex
                      direction="column"
                      mt="3"
                      style={{ borderTop: "1px solid var(--border-mockup)" }}
                    >
                      {dev.sensores.map((s: any, index: number) => {
                        const diag = s.idAsignacion ? diagResults[s.idAsignacion] : null;
                        const diagOk = diag?.estado === "Ok";
                        const metrica = metricaDe(s);
                        const MetricIcon = metrica.icon;
                        const hermanas = dev.sensores.filter(
                          (o: any) => o !== s && o.pin === s.pin && o.pin !== "N/A"
                        );
                        return (
                          <Flex
                            key={`sensor-${dev.id}-${s.id}-${index}`}
                            align="center"
                            justify="between"
                            gap="2"
                            wrap="wrap"
                            py="2"
                            style={{
                              borderBottom:
                                index < dev.sensores.length - 1 ? "1px solid var(--border-mockup)" : undefined,
                            }}
                          >
                            <Box style={{ minWidth: 0, flex: "1 1 180px" }}>
                              <Flex align="center" gap="2" wrap="wrap">
                                <span
                                  aria-hidden
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 6,
                                    background: tone(metrica.t).bg,
                                    border: `1px solid ${tone(metrica.t).brd}`,
                                    color: tone(metrica.t).fg,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <MetricIcon size={13} />
                                </span>
                                <Text size="2" weight="medium" style={{ color: "var(--foreground)" }}>
                                  {metrica.label}
                                  {metrica.unidad && (
                                    <Text size="1" color="gray" weight="regular"> ({metrica.unidad})</Text>
                                  )}
                                </Text>
                              </Flex>
                              <Text size="1" as="div" style={{ color: "var(--muted-foreground)", paddingLeft: 30, marginTop: 2 }}>
                                {s.nombre}
                                <span style={{ fontFamily: "var(--font-mono)", marginLeft: 6 }}>GPIO {s.pin}</span>
                                {hermanas.length > 0 && (
                                  <span> · también mide {hermanas.map((h: any) => metricaDe(h).label.toLowerCase()).join(", ")}</span>
                                )}
                              </Text>
                              {diag && (
                                <Flex align="center" gap="1" mt="1" style={{ paddingLeft: 30 }}>
                                  {diagOk ? (
                                    <CheckCircle2 size={12} aria-hidden style={{ color: tone("green").fg }} />
                                  ) : (
                                    <AlertTriangle size={12} aria-hidden style={{ color: tone("red").fg }} />
                                  )}
                                  <Text size="1" style={{ color: diagOk ? tone("green").fg : "#fca5a5" }}>
                                    {diag.estado}: {diag.motivo}
                                  </Text>
                                </Flex>
                              )}
                            </Box>
                            <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
                              {!!s.offsetCalibracion && (
                                <Badge color="amber" variant="soft" size="1" className="control-num">
                                  Offset {fmtOffset(s.offsetCalibracion)}
                                  {metrica.unidad && ` ${metrica.unidad}`}
                                </Badge>
                              )}
                              {s.idAsignacion && (
                                <Button
                                  size="1"
                                  variant="soft"
                                  color="gray"
                                  loading={diagLoadingId === s.idAsignacion}
                                  disabled={diagLoadingId === s.idAsignacion}
                                  onClick={() => handleDiagnosticar(s.idAsignacion)}
                                  style={{ cursor: "pointer" }}
                                >
                                  <Stethoscope size={13} aria-hidden />
                                  Diagnosticar
                                </Button>
                              )}
                              <Button
                                size="1"
                                variant="soft"
                                onClick={() => {
                                  setCalibDevId(dev.id);
                                  setCalibPin(s.pin);
                                  setCalibSensorName(s.nombre);
                                  setCalibSensor(s);
                                  setCalibHermanas(hermanas);
                                  setCalibOffset(String(s.offsetCalibracion ?? 0));
                                }}
                                aria-label={`Calibrar ${metrica.label.toLowerCase()}`}
                                style={{ cursor: "pointer" }}
                              >
                                <SlidersHorizontal size={13} aria-hidden />
                                Calibrar
                              </Button>
                            </Flex>
                          </Flex>
                        );
                      })}
                    </Flex>
                  )}
                </Inset>
              ))}
            </Flex>
          ) : (
            <Text color="gray" size="2">
              No hay dispositivos de captura de sensores vinculados a este cultivo.
            </Text>
          )}
        </Flex>
      </Panel>

      {/* MODAL DE CALIBRACIÓN REMOTA */}
      <Dialog.Root
        open={calibDevId !== null}
        onOpenChange={(open) => !open && setCalibDevId(null)}
      >
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            maxWidth: 420,
            width: "min(420px, 92vw)",
            background: "var(--surface-mockup)",
            border: "1px solid var(--border2-mockup)",
            borderRadius: "14px",
          }}
        >
          {(() => {
            const m = metricaDe(calibSensor);
            const [mostrado, real] = m.ejemplo;
            const dif = Math.round((real - mostrado) * 10) / 10;
            return (
              <>
                <Dialog.Title style={{ color: "var(--foreground)" }}>
                  Calibrar {m.label.toLowerCase()}
                  {m.unidad && ` (${m.unidad})`}
                </Dialog.Title>
                <Text size="2" color="gray" as="p" mb="3">
                  Sensor <span style={{ color: "var(--foreground)", fontWeight: 700 }}>{calibSensorName}</span> en pin
                  GPIO {calibPin}.
                </Text>
                {calibHermanas.length > 0 && (
                  <Box
                    mb="3"
                    p="3"
                    style={{ background: tone("blue").bg, border: `1px solid ${tone("blue").brd}`, borderRadius: 8 }}
                  >
                    <Text size="1" style={{ color: "#bae6fd" }} as="div">
                      Este sensor también mide{" "}
                      <strong>{calibHermanas.map((h) => metricaDe(h).label.toLowerCase()).join(" y ")}</strong>. Esa
                      variable tiene su propia calibración en su fila: este offset solo corrige la{" "}
                      {m.label.toLowerCase()}.
                    </Text>
                  </Box>
                )}
                <Text size="1" color="gray" as="p" mb="3">
                  Ejemplo: si el sistema marca {mostrado}
                  {m.unidad} y su instrumento de referencia marca {real}
                  {m.unidad}, ingrese <strong style={{ color: "var(--foreground)" }}>{fmtOffset(dif)}</strong>.
                </Text>
              </>
            );
          })()}

          <label style={{ display: "block" }}>
            <Text size="2" weight="bold" as="div" mb="2" style={{ color: "var(--foreground)" }}>
              Offset de compensación
              {metricaDe(calibSensor).unidad && ` en ${metricaDe(calibSensor).unidad}`}{" "}
              <Text size="1" color="gray" weight="regular" className="control-num">
                ({OFFSET_MIN} a {OFFSET_MAX})
              </Text>
            </Text>
            <TextField.Root
              type="text"
              inputMode="decimal"
              size="3"
              placeholder="Ej: -2.5 o 1.2"
              value={calibOffset}
              onChange={(e) => setCalibOffset(e.target.value)}
              style={{ background: "var(--bg-mockup)" }}
            />
          </label>
          <Text size="1" color="gray" as="p" mt="2">
            Este valor se suma automáticamente a cada lectura de esta variable a partir de ahora (efecto
            inmediato en el servidor, no depende del firmware del dispositivo).
          </Text>

          <Flex gap="3" mt="5" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" style={{ cursor: "pointer" }}>
                Cancelar
              </Button>
            </Dialog.Close>
            <Button onClick={handleCalibrateSubmit} style={{ cursor: "pointer" }}>
              Enviar calibración
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
