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
  Dialog,
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
  onSaveTimingConfig?: (relayMin: number, cooldownMin: number) => Promise<any>;
  onToggleCaptura: (devId: number, active: boolean) => void;
  modelosML: any[] | null;
  isLoadingModelosML: boolean;
  onSelectModel: (idModelo: number) => void;
  onCheckMlManual: () => void;
  isCheckingMl: boolean;
  lastMlCheck: { status: "ok" | "error"; message: string } | null;
  isPending: boolean;
  onStopIrrigation?: (motivo?: string) => void;
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
  onSaveTimingConfig,
  onToggleCaptura,
  modelosML,
  isLoadingModelosML,
  onSelectModel,
  onCheckMlManual,
  isCheckingMl,
  lastMlCheck,
  isPending,
  onStopIrrigation,
}: ActuadoresPanelProps) {
  const { bomba, modo } = controlData;

  // Estado del Formulario Flotante de Configuración de Tiempos
  const [isTimingModalOpen, setIsTimingModalOpen] = React.useState(false);
  const [draftRelayMin, setDraftRelayMin] = React.useState(maxRelayMinutes);
  const [draftCooldownMin, setDraftCooldownMin] = React.useState(cooldownMinutes);
  const [isSavingTiming, setIsSavingTiming] = React.useState(false);

  // Sincronizar borradores cuando cambien las props
  React.useEffect(() => {
    setDraftRelayMin(maxRelayMinutes);
  }, [maxRelayMinutes]);

  React.useEffect(() => {
    setDraftCooldownMin(cooldownMinutes);
  }, [cooldownMinutes]);

  const handleOpenTimingModal = () => {
    setDraftRelayMin(maxRelayMinutes);
    setDraftCooldownMin(cooldownMinutes);
    setIsTimingModalOpen(true);
  };

  const handleSaveTimingModal = async () => {
    if (isRiegoEnCurso) {
      alert("Bloqueado: no se pueden modificar los tiempos mientras hay un riego en curso.");
      return;
    }
    setIsSavingTiming(true);
    try {
      if (onSaveTimingConfig) {
        const res = await onSaveTimingConfig(draftRelayMin, draftCooldownMin);
        if (res?.success !== false) {
          setIsTimingModalOpen(false);
        }
      } else {
        setMaxRelayMinutes(draftRelayMin);
        setCooldownMinutes(draftCooldownMin);
        onSaveRelayDuration();
        onSaveCooldown();
        setIsTimingModalOpen(false);
      }
    } finally {
      setIsSavingTiming(false);
    }
  };

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
                {isRiegoEnCurso ? (
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
                ) : isRiegoEnCurso ? (
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
                      bombaEncendida={true}
                      timeoutMin={bomba.timeoutMin || 10}
                      onComplete={() => onStopIrrigation?.("cronometro_completado")}
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
        {/* PARÁMETROS DE TIEMPO Y COOLDOWN ML (CON FORMULARIO FLOTANTE) */}
        <Card
          size="3"
          style={{
            background: "var(--surface-mockup)",
            borderColor: "var(--border-mockup)",
            borderRadius: "16px",
          }}
        >
          <Flex direction="column" gap="4">
            <Flex justify="between" align="start" wrap="wrap" gap="2">
              <Box>
                <Text size="3" weight="bold" color="indigo" as="div">
                  ⏱️ Tiempo de Riego y Cooldown ML
                </Text>
                <Text size="2" color="gray" mt="1" as="div">
                  Duración configurada por ciclo y reposo obligatorio para el control predictivo.
                </Text>
              </Box>
              <Badge color={isRiegoEnCurso ? "amber" : "cyan"} variant="soft">
                {isRiegoEnCurso ? "Riego en curso" : "En espera (Standby)"}
              </Badge>
            </Flex>

            {/* Vista Resumen de los 2 Tiempos */}
            <Grid columns={{ initial: "1", sm: "2" }} gap="3">
              <Box
                style={{
                  background: "var(--surface2-mockup)",
                  border: "1px solid var(--border-mockup)",
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <Text size="1" color="gray" weight="bold" as="div" style={{ letterSpacing: "0.5px" }}>
                  TIEMPO DE RIEGO
                </Text>
                <Flex align="baseline" gap="2" mt="1">
                  <Text size="6" weight="bold" style={{ color: "#38bdf8" }}>
                    {maxRelayMinutes}
                  </Text>
                  <Text size="2" color="gray">
                    minutos
                  </Text>
                </Flex>
                <Text size="1" color="gray" mt="1" as="div">
                  Duración configurada por ciclo
                </Text>
              </Box>

              <Box
                style={{
                  background: "var(--surface2-mockup)",
                  border: "1px solid var(--border-mockup)",
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <Text size="1" color="gray" weight="bold" as="div" style={{ letterSpacing: "0.5px" }}>
                  COOLDOWN ENTRE RIEGOS ML
                </Text>
                <Flex align="baseline" gap="2" mt="1">
                  <Text size="6" weight="bold" style={{ color: "#34d399" }}>
                    {cooldownMinutes}
                  </Text>
                  <Text size="2" color="gray">
                    minutos
                  </Text>
                </Flex>
                <Text size="1" color="gray" mt="1" as="div">
                  Reposo tras culminar un riego
                </Text>
              </Box>
            </Grid>

            {/* Botón para abrir el Formulario Flotante */}
            <Dialog.Root open={isTimingModalOpen} onOpenChange={setIsTimingModalOpen}>
              <Dialog.Trigger>
                <Button
                  size="3"
                  color="indigo"
                  variant="surface"
                  disabled={isPending || isRiegoEnCurso}
                  onClick={handleOpenTimingModal}
                  style={{
                    width: "100%",
                    cursor: isRiegoEnCurso ? "not-allowed" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  ⚙️ Configurar Tiempos de Riego
                </Button>
              </Dialog.Trigger>

              {/* Formulario Flotante (Modal Dialog) */}
              <Dialog.Content
                style={{
                  maxWidth: 500,
                  width: "min(500px, 94vw)",
                  background: "var(--surface-mockup)",
                  border: "1px solid var(--border-mockup)",
                  borderRadius: "16px",
                  padding: "clamp(16px, 4vw, 24px)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                }}
              >
                <Dialog.Title style={{ color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
                  ⚙️ Configurar Tiempo de Riego y Cooldown
                </Dialog.Title>
                <Dialog.Description size="2" mb="4" style={{ color: "#9ca3af" }}>
                  Modifique el tiempo de riego por ciclo y el tiempo de reposo del modelo predictivo (ML).
                </Dialog.Description>

                <Flex direction="column" gap="4">
                  {/* Input Flotante 1: Tiempo de Riego */}
                  <Box
                    style={{
                      background: "var(--surface2-mockup)",
                      borderRadius: "12px",
                      padding: "14px",
                      border: "1px solid var(--border-mockup)",
                    }}
                  >
                    <Flex justify="between" align="center" mb="1">
                      <Text size="2" weight="bold" style={{ color: "white" }}>
                        ⏱️ Tiempo de Riego por Evento
                      </Text>
                      <Badge color="cyan" variant="soft">
                        1 - 30 min
                      </Badge>
                    </Flex>
                    <Text size="1" color="gray" mb="2" as="div">
                      {isConexionDirecta
                        ? "Duración de apertura de la electroválvula en cada evento de riego."
                        : "Duración de encendido de la bomba en cada evento de riego."}
                    </Text>
                    <TextField.Root
                      type="number"
                      min="1"
                      max="30"
                      step="1"
                      disabled={isSavingTiming}
                      value={draftRelayMin === 0 ? "" : Number(draftRelayMin).toString()}
                      onChange={(e) => setDraftRelayMin(Number(e.target.value) || 0)}
                      placeholder="10"
                      style={{
                        background: "var(--bg-mockup)",
                        color: "white",
                        fontSize: "1rem",
                      }}
                    />
                  </Box>

                  {/* Input Flotante 2: Cooldown ML */}
                  <Box
                    style={{
                      background: "var(--surface2-mockup)",
                      borderRadius: "12px",
                      padding: "14px",
                      border: "1px solid var(--border-mockup)",
                    }}
                  >
                    <Flex justify="between" align="center" mb="1">
                      <Text size="2" weight="bold" style={{ color: "white" }}>
                        ⏰ Cooldown entre Riegos ML
                      </Text>
                      <Badge color="green" variant="soft">
                        1 - 1440 min
                      </Badge>
                    </Flex>
                    <Text size="1" color="gray" mb="2" as="div">
                      Tiempo de reposo tras culminar un riego antes de que el modelo ML evalúe un nuevo ciclo.
                    </Text>
                    <TextField.Root
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      disabled={isSavingTiming}
                      value={draftCooldownMin === 0 ? "" : Number(draftCooldownMin).toString()}
                      onChange={(e) => setDraftCooldownMin(Number(e.target.value) || 0)}
                      placeholder="30"
                      style={{
                        background: "var(--bg-mockup)",
                        color: "white",
                        fontSize: "1rem",
                      }}
                    />
                    <Box
                      style={{
                        background: "rgba(99, 102, 241, 0.1)",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        marginTop: "10px",
                      }}
                    >
                      <Text size="1" style={{ color: "#c7d2fe" }} as="div">
                        💡 <strong>Actualización Inmediata:</strong> Si reduce el cooldown y el tiempo transcurrido desde el último riego ya cumplió la nueva meta, el sistema evaluará y regará de inmediato.
                      </Text>
                    </Box>
                  </Box>

                  {/* Botones de Acción */}
                  <Flex justify="end" gap="3" mt="2">
                    <Dialog.Close>
                      <Button
                        variant="soft"
                        color="gray"
                        disabled={isSavingTiming}
                        onClick={() => setIsTimingModalOpen(false)}
                      >
                        Cancelar
                      </Button>
                    </Dialog.Close>
                    <Button
                      color="indigo"
                      variant="solid"
                      loading={isSavingTiming}
                      disabled={isSavingTiming || isRiegoEnCurso}
                      onClick={handleSaveTimingModal}
                    >
                      Guardar Configuración
                    </Button>
                  </Flex>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>

            {isRiegoEnCurso && (
              <Text size="1" color="orange" style={{ textAlign: "center" }} as="div">
                🔒 Modificación de tiempos bloqueada mientras haya un riego en curso.
              </Text>
            )}
          </Flex>
        </Card>

        {/* VINCULACIÓN Y ESTADO DE DISPOSITIVOS ACTUADORES */}
        <Card
          size={{ initial: "2", sm: "3" }}
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
            <div className="flex flex-col gap-3">
              {dispositivosActuadores.map((dev: any) => (
                <div
                  key={`act-${dev.id}`}
                  className="p-3 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 transition-colors"
                >
                  {/* FILA SUPERIOR: Encabezado del Actuador y Controles */}
                  <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm sm:text-base leading-tight">
                          {dev.nombre}
                        </span>
                        {dev.tipoNombre && (
                          <Badge color="plum" variant="outline" size="1">
                            {dev.tipoNombre}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                        MAC: {dev.mac}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {isRiegoEnCurso && dev.funcionamientoActivo && (
                        <Badge color="amber" variant="soft" size="1">
                          🔒 Riego activo
                        </Badge>
                      )}
                      <Badge color={dev.conectado ? "green" : "red"} variant="soft" size="1">
                        {dev.conectado ? "Online" : "Offline"}
                      </Badge>
                      <Switch
                        checked={dev.funcionamientoActivo}
                        disabled={isPending || (isRiegoEnCurso && dev.funcionamientoActivo)}
                        onCheckedChange={(checked) => onToggleCaptura(dev.id, checked)}
                        style={{
                          cursor: isRiegoEnCurso && dev.funcionamientoActivo ? "not-allowed" : "pointer",
                        }}
                      />
                    </div>
                  </div>

                  {/* SECCIÓN INFERIOR: Lista de Pines / Componentes */}
                  {dev.sensores && dev.sensores.length > 0 && (
                    <div className="mt-2.5 space-y-1 pl-2 border-l-2 border-slate-800">
                      {dev.sensores.map((s: any, index: number) => (
                        <div
                          key={`act-${dev.id}-${s.id}-${index}`}
                          className="text-xs text-slate-300 py-0.5"
                        >
                          <span className="text-slate-500 mr-1.5">•</span>
                          <span className="text-slate-200 font-medium">{s.nombre}</span>{" "}
                          <span className="text-slate-500 font-mono text-[11px]">
                            (GPIO {s.pin})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
            <Flex justify="between" align="center" wrap="wrap" gap="2">
              <Text size="3" weight="bold" color="indigo" as="div">
                Modelos de Machine Learning Disponibles
              </Text>
              {isRiegoEnCurso && (
                <Badge color="amber" variant="soft">
                  🔒 Selección bloqueada mientras el riego esté en curso
                </Badge>
              )}
            </Flex>
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
                        disabled={m.activo || isRiegoEnCurso || isPending}
                        onClick={() => onSelectModel(m.id_modelo)}
                        style={{
                          cursor: m.activo || isRiegoEnCurso ? "not-allowed" : "pointer",
                        }}
                        title={
                          isRiegoEnCurso
                            ? "Bloqueado: espere a que finalice el riego en curso para cambiar de modelo"
                            : undefined
                        }
                      >
                        {m.activo
                          ? "Seleccionado"
                          : isRiegoEnCurso
                          ? "Bloqueado (Riego en curso)"
                          : "Seleccionar"}
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
