"use client";

import React from "react";
import {
  Box,
  Card,
  Flex,
  Grid,
  Text,
  Badge,
  Switch,
  Button,
  TextField,
} from "@radix-ui/themes";
import { UltimoRiegoTimer, RiegoActivoTimer } from "./RiegoTimer";
import { formatearSegundos } from "../selectors";
import type { ControlData, DispositivoItem } from "../types";

interface ActuadoresPanelProps {
  controlData: ControlData;
  dispositivosActuadores: DispositivoItem[];
  isActuatorActive: boolean;
  isConexionDirecta: boolean;
  isRiegoEnCurso: boolean;
  maxRelayMinutes: number;
  setMaxRelayMinutes: (min: number) => void;
  onSaveRelayDuration: () => void;
  cooldownMinutes: number;
  setCooldownMinutes: (min: number) => void;
  onSaveCooldown: () => void;
  onToggleCaptura: (devId: number, active: boolean) => void;
  modelosML: any[] | null;
  isLoadingModelosML: boolean;
  onSelectModel: (idModelo: number) => void;
  onCheckMlManual: () => void;
  isCheckingMl: boolean;
  lastMlCheck: { status: "ok" | "error"; message: string } | null;
  isPending: boolean;
}

export function ActuadoresPanel({
  controlData,
  dispositivosActuadores,
  isActuatorActive,
  isConexionDirecta,
  isRiegoEnCurso,
  maxRelayMinutes,
  setMaxRelayMinutes,
  onSaveRelayDuration,
  cooldownMinutes,
  setCooldownMinutes,
  onSaveCooldown,
  onToggleCaptura,
  modelosML,
  isLoadingModelosML,
  onSelectModel,
  onCheckMlManual,
  isCheckingMl,
  lastMlCheck,
  isPending,
}: ActuadoresPanelProps) {
  const { bomba, modo } = controlData;

  return (
    <Flex direction="column" gap="5">
      {/* SECCIÓN CRONÓMETROS DE RIEGO */}
      <Card
        size="3"
        style={{
          background: "var(--surface-mockup)",
          borderColor: "var(--border-mockup)",
          borderRadius: "16px",
        }}
      >
        <Flex direction="column" gap="4">
          <Box>
            <Text size="3" weight="bold" color="indigo" mb="1" as="div">
              ⏱️ Cronómetros y Estado de Riego
            </Text>
            <Text size="2" color="gray">
              Monitoreo en tiempo real del tiempo transcurrido y suspensiones automáticas de seguridad.
            </Text>
          </Box>

          <Grid columns={{ initial: "1", md: "2" }} gap="4">
            {/* Cronómetro 1: Tiempo desde el último riego */}
            <Card
              size="2"
              style={{
                background: "var(--surface2-mockup)",
                borderColor: "var(--border-mockup)",
                borderRadius: "12px",
              }}
            >
              <Flex direction="column" gap="2" p="2">
                <Text size="2" weight="bold" color="gray">
                  Tiempo desde el último riego
                </Text>
                {bomba.encendida && isActuatorActive ? (
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2" style={{ marginTop: "4px" }}>
                      <Box
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: "#10b981",
                          animation: "pulse 1s infinite",
                        }}
                      />
                      <Text size="5" weight="bold" style={{ color: "#34d399", fontFamily: "monospace" }}>
                        Riego en curso
                      </Text>
                    </Flex>
                    <Text size="1" color="gray" style={{ marginTop: "2px" }}>
                      Sesión de riego en ejecución actualmente. El cronómetro se reiniciará al finalizar.
                    </Text>
                  </Flex>
                ) : (
                  <>
                    <UltimoRiegoTimer ultimoRiegoFechaFin={controlData.ultimoRiegoFechaFin} />
                    <Text size="1" color="gray">
                      Tiempo transcurrido desde que finalizó la última sesión de riego exitosa.
                    </Text>
                  </>
                )}
              </Flex>
            </Card>

            {/* Cronómetro 2: Estado del relé y suspensión */}
            <Card
              size="2"
              style={{
                background: "var(--surface2-mockup)",
                borderColor: "var(--border-mockup)",
                borderRadius: "12px",
              }}
            >
              <Flex direction="column" gap="2" p="2">
                <Text size="2" weight="bold" color="gray">
                  {isConexionDirecta
                    ? "Cronómetro de Ejecución de Válvula"
                    : "Cronómetro de Ejecución del Relé"}
                </Text>
                {(controlData as any).sesionPausada?.activa && isActuatorActive ? (
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <Box
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#fbbf24",
                          animation: "pulse 1.5s infinite",
                        }}
                      />
                      <Text size="2" weight="bold" style={{ color: "#fbbf24" }}>
                        Riego Suspendido (En Pausa)
                      </Text>
                    </Flex>
                    <Text
                      size="6"
                      weight="bold"
                      style={{ color: "#fbbf24", fontFamily: "monospace", marginTop: "4px" }}
                    >
                      {formatearSegundos((controlData as any).sesionPausada.segundosTranscurridos || 0)} /{" "}
                      {formatearSegundos(
                        (controlData as any).sesionPausada.duracionSegundos || (bomba.timeoutMin || 10) * 60
                      )}
                    </Text>
                    <Text size="2" weight="bold" style={{ color: "#fbbf24" }}>
                      Restante: {formatearSegundos((controlData as any).sesionPausada.tiempoRestanteSeg || 0)}
                    </Text>
                    <Text size="1" color="gray">
                      Pausado por:{" "}
                      <strong style={{ color: "#f87171" }}>
                        {(controlData as any).sesionPausada.motivo === "sin_flujo"
                          ? "Sin flujo de agua detectado en la tubería"
                          : (controlData as any).sesionPausada.motivo === "sensor_error"
                          ? "Error de lectura de sensor"
                          : (controlData as any).sesionPausada.motivo === "apagado_dispositivo"
                          ? "Dispositivo actuador apagado"
                          : isConexionDirecta
                          ? "Ausencia de flujo de agua"
                          : "Falta de agua física en el tanque"}
                      </strong>
                      .{" "}
                      {isConexionDirecta
                        ? "El riego se reanudará automáticamente al detectar flujo de agua."
                        : "El riego se reanudará automáticamente al normalizarse las condiciones."}
                    </Text>
                  </Flex>
                ) : bomba.encendida && isActuatorActive ? (
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <Box
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#10b981",
                          animation: "pulse 1s infinite",
                        }}
                      />
                      <Text size="2" weight="bold" style={{ color: "#34d399" }}>
                        {isConexionDirecta
                          ? "Válvula de Riego Activa (Abierta)"
                          : "Bomba Activa (Regando)"}
                      </Text>
                    </Flex>
                    <RiegoActivoTimer
                      isActuatorActive={isActuatorActive}
                      riegoActivo={controlData.riegoActivo}
                      bombaEncendida={bomba.encendida}
                      timeoutMin={bomba.timeoutMin || 10}
                    />
                    <Text size="1" color="gray">
                      {isConexionDirecta
                        ? "La electroválvula de riego se encuentra abierta y el sensor de flujo monitorea el caudal hacia el cultivo."
                        : "La bomba de agua se encuentra encendida y regando activamente el cultivo."}
                    </Text>
                  </Flex>
                ) : (
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <Box
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#6b7280",
                        }}
                      />
                      <Text size="2" weight="bold" color="gray">
                        {isConexionDirecta ? "Inactivo (Válvula Cerrada)" : "Inactivo (Bomba Apagada)"}
                      </Text>
                    </Flex>
                    <Text
                      size="6"
                      weight="bold"
                      style={{ color: "#9ca3af", fontFamily: "monospace", marginTop: "4px" }}
                    >
                      00:00:00
                    </Text>
                    <Text size="1" color="gray">
                      {isConexionDirecta
                        ? "La electroválvula de riego se encuentra cerrada. No hay riego en ejecución."
                        : "No hay sesiones de riego activas o en pausa en este momento."}
                    </Text>
                  </Flex>
                )}
              </Flex>
            </Card>
          </Grid>
        </Flex>
      </Card>

      <Grid columns={{ initial: "1", lg: "2" }} gap="5">
        {/* TIEMPO MÁXIMO RELÉ Y COOLDOWN ML */}
        <Card
          size="3"
          style={{
            background: "var(--surface-mockup)",
            borderColor: "var(--border-mockup)",
            borderRadius: "16px",
          }}
        >
          <Flex direction="column" gap="4">
            {/* Tiempo máximo por evento */}
            <Flex justify="between" align="end" gap="4" wrap="wrap">
              <Box style={{ flex: "1 1 280px" }}>
                <Text size="3" weight="bold" color="indigo" as="div">
                  {isConexionDirecta
                    ? "Tiempo máximo de apertura de válvula por evento"
                    : "Tiempo máximo del relé por evento de riego"}
                </Text>
                <Text size="2" color="gray" mt="1" as="div">
                  {isConexionDirecta
                    ? "Cierra la válvula automáticamente como protección de seguridad en eventos de riego ML."
                    : "Apaga la bomba automáticamente como protección de seguridad en eventos de riego ML."}
                </Text>
              </Box>
              <Flex align="end" gap="3" wrap="wrap">
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">
                    Minutos (1-30)
                  </Text>
                  <TextField.Root
                    type="number"
                    min="1"
                    max="30"
                    step="1"
                    disabled={isActuatorActive}
                    value={maxRelayMinutes === 0 ? "" : Number(maxRelayMinutes).toString()}
                    onChange={(event) => setMaxRelayMinutes(Number(event.target.value) || 0)}
                    style={{ width: "120px", background: "var(--surface2-mockup)", color: "white" }}
                  />
                </Box>
                <Button onClick={onSaveRelayDuration} disabled={isPending || isActuatorActive}>
                  Guardar
                </Button>
              </Flex>
            </Flex>

            {/* Separador */}
            <Box style={{ borderTop: "1px solid var(--border-mockup)" }} />

            {/* Cooldown entre riegos ML */}
            <Flex justify="between" align="end" gap="4" wrap="wrap">
              <Box style={{ flex: "1 1 280px" }}>
                <Text size="3" weight="bold" color="indigo" as="div">
                  ⏱️ Cooldown entre riegos ML
                </Text>
                <Text size="2" color="gray" mt="1" as="div">
                  Tiempo de reposo obligatorio tras finalizar un riego antes de que el modelo predictivo vuelva a evaluar o activar un nuevo ciclo automático.
                </Text>
              </Box>
              <Flex align="end" gap="3" wrap="wrap">
                <Box>
                  <Text size="1" color="gray" mb="1" as="div">
                    Minutos (1-1440)
                  </Text>
                  <TextField.Root
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={cooldownMinutes === 0 ? "" : Number(cooldownMinutes).toString()}
                    onChange={(event) => setCooldownMinutes(Number(event.target.value) || 0)}
                    style={{ width: "120px", background: "var(--surface2-mockup)", color: "white" }}
                  />
                </Box>
                <Button onClick={onSaveCooldown} disabled={isPending} color="indigo" variant="solid">
                  Guardar
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Card>

        {/* VINCULACIÓN Y ESTADO DE DISPOSITIVOS ACTUADORES */}
        <Card
          size="3"
          style={{
            background: "var(--surface-mockup)",
            borderColor: "var(--border-mockup)",
            borderRadius: "16px",
          }}
        >
          <Text size="3" weight="bold" color="indigo" mb="4" as="div">
            ⚡ Dispositivos Actuadores
          </Text>
          {dispositivosActuadores.length > 0 ? (
            <Flex direction="column" gap="3">
              {dispositivosActuadores.map((dev: any) => (
                <Flex
                  key={`act-${dev.id}`}
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
                        <Badge color="plum" variant="outline" size="1">
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
                          <Text
                            key={`act-${dev.id}-${s.id}-${index}`}
                            size="1"
                            color="gray"
                            style={{ display: "block" }}
                          >
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
              No hay dispositivos actuadores vinculados a este cultivo.
            </Text>
          )}
        </Card>
      </Grid>

      {/* PANEL MODO PREDICTIVO (ML) */}
      <Card
        size="3"
        style={{
          background: "var(--surface-mockup)",
          borderColor: "var(--border-mockup)",
          borderRadius: "16px",
        }}
      >
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center" wrap="wrap" gap="3">
            <Box>
              <Flex align="center" gap="2" mb="1">
                <Text size="4" weight="bold" color="indigo">
                  🧠 Modo Predictivo Inteligente (Machine Learning)
                </Text>
                <Badge color="purple" size="2" variant="solid">
                  Modo Único Activo
                </Badge>
              </Flex>
              <Text size="2" color="gray">
                El sistema opera de forma 100% autónoma guiado por modelos de Machine Learning entrenados para su cultivo.
              </Text>
            </Box>
            <Button
              size="2"
              color="purple"
              variant="soft"
              disabled={isCheckingMl || !isActuatorActive || isRiegoEnCurso || !modo.tieneModelo}
              onClick={onCheckMlManual}
              style={{ cursor: "pointer" }}
            >
              {isCheckingMl ? "Verificando..." : "⚡ Evaluar IA Ahora"}
            </Button>
          </Flex>

          {/* Ayuda memoria sobre frecuencia del riego */}
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
                  Ayuda memoria: ¿Por qué el riego por IA tiene un cooldown de{" "}
                  {controlData.cooldownMinutos ?? cooldownMinutes ?? 30} minutos?
                </Text>
                <Text
                  size="1"
                  color="gray"
                  style={{ display: "block", marginTop: "4px", lineHeight: "1.4" }}
                >
                  El riego automático por Inteligencia Artificial (ML) opera con un{" "}
                  <strong>
                    cooldown mínimo de {controlData.cooldownMinutos ?? cooldownMinutes ?? 30} minutos
                  </strong>{" "}
                  entre activaciones. Esto permite que el agua aplicada se filtre y distribuya de
                  manera uniforme a través del sustrato hasta llegar al sensor. Sin esta espera, el
                  sistema podría realizar lecturas falsas de suelo seco debido a la lentitud de
                  absorción natural, provocando un sobre-riego que podría ahogar o enfermar las raíces
                  del cultivo.
                </Text>
              </Box>
            </Flex>
          </Card>


          {/* Tarjeta de Estado del Riego Inteligente */}
          <Card
            size="2"
            style={{
              background: "var(--surface2-mockup)",
              borderColor: "var(--border-mockup)",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <Flex justify="between" align="center" wrap="wrap" gap="4">
              <Box>
                <Text size="3" weight="bold" color="indigo" as="div">
                  Estado del Actuador (ML)
                </Text>
                <Flex align="center" gap="2" mt="1">
                  <Box
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background:
                        bomba.encendida && isActuatorActive
                          ? "#22c55e"
                          : !isActuatorActive
                          ? "#ef4444"
                          : "#6b7280",
                      boxShadow:
                        bomba.encendida && isActuatorActive ? "0 0 8px #22c55e" : "none",
                    }}
                  />
                  <Text
                    size="2"
                    weight="bold"
                    style={{
                      color:
                        bomba.encendida && isActuatorActive
                          ? "#4ade80"
                          : !isActuatorActive
                          ? "#f87171"
                          : "#9ca3af",
                    }}
                  >
                    {bomba.encendida && isActuatorActive
                      ? isConexionDirecta
                        ? "Riego en curso (Válvula Abierta)"
                        : "Riego en curso (Bomba Encendida)"
                      : !isActuatorActive
                      ? "Actuador Apagado"
                      : isConexionDirecta
                      ? "Válvula Cerrada"
                      : "Bomba Apagada"}
                  </Text>
                </Flex>
              </Box>

              <Box style={{ borderLeft: "1px solid var(--border-mockup)", paddingLeft: "16px", minWidth: "220px" }}>
                <Text size="3" weight="bold" color="indigo" as="div">
                  Última Decisión de la IA
                </Text>
                {(controlData as any).ultimaPrediccion ? (
                  <Box mt="1">
                    <Text size="2" style={{ display: "block", color: "white" }}>
                      Recomendación:{" "}
                      <Badge
                        color={
                          (controlData as any).ultimaPrediccion.recomendacion === "regar"
                            ? "green"
                            : "gray"
                        }
                      >
                        {(controlData as any).ultimaPrediccion.recomendacion === "regar"
                          ? "REGAR"
                          : "NO REGAR"}
                      </Badge>
                    </Text>
                    {(controlData as any).ultimaPrediccion.probabilidad !== null && (
                      <Text size="1" color="gray" style={{ display: "block", marginTop: "2px" }}>
                        Probabilidad:{" "}
                        {((controlData as any).ultimaPrediccion.probabilidad * 100).toFixed(1)}%
                      </Text>
                    )}
                    {(controlData as any).ultimaPrediccion.nombre_modelo && (
                      <Text size="1" color="gray" style={{ display: "block", marginTop: "2px" }}>
                        Modelo:{" "}
                        <span style={{ color: "#d1d5db" }}>
                          {(controlData as any).ultimaPrediccion.nombre_modelo}
                        </span>
                      </Text>
                    )}
                    <Text
                      size="1"
                      color="gray"
                      style={{ display: "block", marginTop: "2px", fontFamily: "monospace" }}
                    >
                      Fecha: {(controlData as any).ultimaPrediccion.fecha}
                    </Text>
                  </Box>
                ) : (
                  <Text size="2" color="gray" style={{ display: "block", marginTop: "2px" }}>
                    No hay predicciones registradas aún.
                  </Text>
                )}
              </Box>
            </Flex>
            <Flex justify="start" align="center" gap="3" mt="3">
              <Text size="1" color={lastMlCheck?.status === "error" ? "red" : "gray"}>
                {isCheckingMl
                  ? "Verificando ML..."
                  : lastMlCheck?.message || "Verificación ML lista."}
              </Text>
            </Flex>
            {(controlData as any).ultimaPrediccion && (controlData as any).ultimaPrediccion.variables && (
              <Box mt="3" pt="2" style={{ borderTop: "1px solid var(--border-mockup)" }}>
                <Text size="1" color="gray" weight="bold" as="div">
                  Variables de entrada analizadas:
                </Text>
                <Flex gap="3" wrap="wrap" mt="1">
                  <Badge size="1" color="indigo">
                    Hum. Suelo: {(controlData as any).ultimaPrediccion.variables.humedad_suelo}%
                  </Badge>
                  <Badge size="1" color="indigo">
                    Temp. Suelo: {(controlData as any).ultimaPrediccion.variables.temperatura_suelo}°C
                  </Badge>
                  <Badge size="1" color="indigo">
                    Temp. Ambiente: {(controlData as any).ultimaPrediccion.variables.temperatura_ambiente}°C
                  </Badge>
                  <Badge size="1" color="indigo">
                    Hum. Ambiente: {(controlData as any).ultimaPrediccion.variables.humedad_ambiente}%
                  </Badge>
                </Flex>
              </Box>
            )}
          </Card>

          {/* MODELOS ML */}
          <Flex direction="column" gap="3" mt="1">
            <Text size="3" weight="bold" color="indigo" as="div">
              Modelos de Machine Learning Disponibles
            </Text>
            {isLoadingModelosML ? (
              <Card
                style={{
                  background: "var(--surface2-mockup)",
                  borderColor: "var(--border-mockup)",
                  borderRadius: "12px",
                  padding: "12px",
                }}
              >
                <Text size="2" color="gray">
                  Cargando modelos inteligentes...
                </Text>
              </Card>
            ) : modelosML && modelosML.length > 0 ? (
              modelosML.map((m: any) => {
                const isRF =
                  m.algoritmo?.toLowerCase().includes("random") ||
                  m.nombre_modelo?.toLowerCase().includes("random") ||
                  m.algoritmo?.toLowerCase().includes("rf");
                return (
                  <Card
                    key={m.id_modelo}
                    style={{
                      background: m.activo ? "rgba(139, 92, 246, 0.03)" : "var(--surface2-mockup)",
                      borderColor: m.activo ? "#a855f7" : "var(--border-mockup)",
                      borderWidth: m.activo ? "2px" : "1px",
                      borderRadius: "12px",
                      padding: "12px",
                      transition: "all 0.2s",
                    }}
                  >
                    <Flex justify="between" align="center" wrap="wrap" gap="3">
                      <Box style={{ flex: "1 1 auto" }}>
                        <Flex align="center" gap="2" mb="1">
                          <Text size="3" weight="bold" style={{ color: "white" }}>
                            {m.nombre_modelo}
                          </Text>
                          {isRF && <Badge color="indigo">Defecto / Recomendado</Badge>}
                          {m.activo && <Badge color="purple">Activo</Badge>}
                        </Flex>
                        <Text size="2" color="gray" style={{ display: "block", marginBottom: "2px" }}>
                          Algoritmo: <span style={{ color: "#d1d5db" }}>{m.algoritmo}</span> · Versión:{" "}
                          <span style={{ color: "#d1d5db" }}>{m.version || "1.0.0"}</span>
                        </Text>
                        {m.descripcion && (
                          <Text
                            size="1"
                            color="gray"
                            style={{ display: "block", fontStyle: "italic", marginBottom: "2px" }}
                          >
                            {m.descripcion}
                          </Text>
                        )}
                        {m.precision_modelo !== null && (
                          <Text size="1" color="gray" style={{ display: "block" }}>
                            Precisión del modelo:{" "}
                            <span style={{ color: "#c084fc", fontWeight: "bold" }}>
                              {(m.precision_modelo * 100).toFixed(1)}%
                            </span>
                          </Text>
                        )}
                      </Box>
                      <Button
                        color="purple"
                        variant={m.activo ? "solid" : "soft"}
                        disabled={m.activo}
                        onClick={() => onSelectModel(m.id_modelo)}
                        style={{ cursor: m.activo ? "default" : "pointer" }}
                      >
                        {m.activo ? "Seleccionado" : "Seleccionar"}
                      </Button>
                    </Flex>
                  </Card>
                );
              })
            ) : (
              <Text color="gray" size="2">
                No hay modelos de ML registrados en el sistema.
              </Text>
            )}
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
