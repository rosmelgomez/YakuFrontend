"use client";

import React from "react";
import {
  Box,
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
import { HorarioRiegoResumen } from "./HorarioRiegoResumen";
import { BrainCircuit, Cpu, Lock, Settings2, Sparkles, Timer, Zap } from "lucide-react";
import { HelpNote, Inset, Panel, SectionHeader, StatusDot, tone, type Tone } from "./ui";
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

  const sesionPausada = (controlData as any).sesionPausada;
  const ultimaPrediccion = (controlData as any).ultimaPrediccion;
  const cooldownVigente = controlData.cooldownMinutos ?? cooldownMinutes ?? 30;

  const motivoPausa =
    sesionPausada?.motivo === "sin_flujo"
      ? "Sin flujo de agua detectado en la tubería"
      : sesionPausada?.motivo === "sensor_error"
      ? "Error de lectura de sensor"
      : sesionPausada?.motivo === "apagado_dispositivo"
      ? "Dispositivo actuador apagado"
      : sesionPausada?.motivo === "desconexion_riego"
      ? "Reinicio del equipo (posible corte de energía)"
      : isConexionDirecta
      ? "Ausencia de flujo de agua"
      : "Falta de agua física en el tanque";

  const actuadorTone: Tone =
    bomba.encendida && isActuatorActive ? "green" : !isActuatorActive ? "red" : "gray";
  const actuadorTexto =
    bomba.encendida && isActuatorActive
      ? isConexionDirecta
        ? "Riego en curso (válvula abierta)"
        : "Riego en curso (bomba encendida)"
      : !isActuatorActive
      ? "Actuador apagado"
      : isConexionDirecta
      ? "Válvula cerrada"
      : "Bomba apagada";

  const labelStyle: React.CSSProperties = {
    color: "var(--muted-foreground)",
    fontWeight: 600,
  };

  return (
    <Flex direction="column" gap="4">
      {/* SECCIÓN CRONÓMETROS DE RIEGO */}
      <Panel>
        <Flex direction="column" gap="4">
          <SectionHeader
            icon={Timer}
            t="blue"
            title="Cronómetros y estado de riego"
            description="Monitoreo en tiempo real del tiempo transcurrido y suspensiones automáticas de seguridad."
          />

          <Grid columns={{ initial: "1", md: "2" }} gap="3">
            {/* Cronómetro 1: Tiempo desde el último riego */}
            <Inset>
              <Flex direction="column" gap="2">
                <Text size="2" style={labelStyle}>
                  Tiempo desde el último riego
                </Text>
                {isRiegoEnCurso ? (
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2" mt="1">
                      <StatusDot t="green" pulse />
                      <Text size="5" weight="bold" style={{ color: tone("green").fg }}>
                        Riego en curso
                      </Text>
                    </Flex>
                    <Text size="1" color="gray">
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
            </Inset>

            {/* Cronómetro 2: Estado del relé y suspensión */}
            <Inset>
              <Flex direction="column" gap="2">
                <Text size="2" style={labelStyle}>
                  {isConexionDirecta
                    ? "Cronómetro de ejecución de válvula"
                    : "Cronómetro de ejecución del relé"}
                </Text>
                {sesionPausada?.activa && isActuatorActive ? (
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <StatusDot t="amber" pulse />
                      <Text size="2" weight="bold" style={{ color: tone("amber").fg }}>
                        Riego suspendido (en pausa)
                      </Text>
                    </Flex>
                    <Text
                      size="6"
                      weight="bold"
                      className="control-num"
                      style={{ color: tone("amber").fg, fontFamily: "var(--font-mono)", marginTop: "4px" }}
                    >
                      {formatearSegundos(sesionPausada.segundosTranscurridos || 0)} /{" "}
                      {formatearSegundos(sesionPausada.duracionSegundos || (bomba.timeoutMin || 10) * 60)}
                    </Text>
                    <Text size="2" weight="bold" style={{ color: tone("amber").fg }}>
                      Restante: {formatearSegundos(sesionPausada.tiempoRestanteSeg || 0)}
                    </Text>
                    <Text size="1" color="gray">
                      Pausado por: <strong style={{ color: "#fca5a5" }}>{motivoPausa}</strong>.{" "}
                      {sesionPausada.motivo === "desconexion_riego"
                        ? "El riego se reanudará automáticamente por el tiempo restante cuando el equipo vuelva a conectarse."
                        : isConexionDirecta
                        ? "El riego se reanudará automáticamente al detectar flujo de agua."
                        : "El riego se reanudará automáticamente al normalizarse las condiciones."}
                    </Text>
                  </Flex>
                ) : isRiegoEnCurso ? (
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <StatusDot t="green" pulse />
                      <Text size="2" weight="bold" style={{ color: tone("green").fg }}>
                        {isConexionDirecta ? "Válvula de riego activa (abierta)" : "Bomba activa (regando)"}
                      </Text>
                    </Flex>
                    <RiegoActivoTimer
                      isActuatorActive={isActuatorActive}
                      riegoActivo={controlData.riegoActivo}
                      bombaEncendida={true}
                      timeoutMin={bomba.timeoutMin || 10}
                      onComplete={() => onStopIrrigation?.("cronometro_completado")}
                    />
                    {controlData.riegoActivo?.conexionPerdida && (
                      <Box
                        style={{
                          border: `1px solid ${tone("amber").brd}`,
                          background: tone("amber").bg,
                          borderRadius: "8px",
                          padding: "8px 10px",
                        }}
                      >
                        <Text size="2" weight="bold" style={{ color: tone("amber").fg }} as="div">
                          Sin conexión con el equipo
                        </Text>
                        <Text size="1" color="gray" as="div">
                          El riego continúa en el dispositivo
                          {controlData.riegoActivo.fechaFinEstimada
                            ? ` y terminará a las ${new Date(
                                controlData.riegoActivo.fechaFinEstimada
                              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : ""}
                          . Los litros medidos se actualizarán cuando vuelva a conectarse.
                        </Text>
                      </Box>
                    )}
                    <Text size="1" color="gray">
                      {isConexionDirecta
                        ? "La electroválvula de riego se encuentra abierta y el sensor de flujo monitorea el caudal hacia el cultivo."
                        : "La bomba de agua se encuentra encendida y regando activamente el cultivo."}
                    </Text>
                  </Flex>
                ) : (
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <StatusDot t="gray" />
                      <Text size="2" weight="bold" color="gray">
                        {isConexionDirecta ? "Inactivo (válvula cerrada)" : "Inactivo (bomba apagada)"}
                      </Text>
                    </Flex>
                    <Text
                      size="6"
                      weight="bold"
                      className="control-num"
                      style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", marginTop: "4px" }}
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
            </Inset>
          </Grid>
        </Flex>
      </Panel>

      {/* PROGRAMACIÓN DE HORARIOS DE RIEGO */}
      <HorarioRiegoResumen idAsignacion={bomba?.id} />

      <Grid columns={{ initial: "1", lg: "2" }} gap="4">
        {/* PARÁMETROS DE TIEMPO Y COOLDOWN ML */}
        <Panel>
          <Flex direction="column" gap="4">
            <SectionHeader
              icon={Settings2}
              t="teal"
              title="Tiempo de riego y cooldown ML"
              description="Duración configurada por ciclo y reposo obligatorio para el control predictivo."
              aside={
                <Badge color={isRiegoEnCurso ? "amber" : "gray"} variant="soft">
                  {isRiegoEnCurso ? "Riego en curso" : "En espera"}
                </Badge>
              }
            />

            <Grid columns="2" gap="3">
              <Inset>
                <Text size="1" as="div" style={labelStyle}>
                  Tiempo de riego
                </Text>
                <Flex align="baseline" gap="1" mt="1">
                  <Text size="7" weight="bold" className="control-num" style={{ color: tone("blue").fg, lineHeight: 1.1 }}>
                    {maxRelayMinutes}
                  </Text>
                  <Text size="2" color="gray">
                    min
                  </Text>
                </Flex>
                <Text size="1" color="gray" mt="1" as="div">
                  Duración configurada por ciclo
                </Text>
              </Inset>

              <Inset>
                <Text size="1" as="div" style={labelStyle}>
                  Cooldown entre riegos ML
                </Text>
                <Flex align="baseline" gap="1" mt="1">
                  <Text size="7" weight="bold" className="control-num" style={{ color: tone("green").fg, lineHeight: 1.1 }}>
                    {cooldownMinutes}
                  </Text>
                  <Text size="2" color="gray">
                    min
                  </Text>
                </Flex>
                <Text size="1" color="gray" mt="1" as="div">
                  Reposo tras culminar un riego
                </Text>
              </Inset>
            </Grid>

            <Dialog.Root open={isTimingModalOpen} onOpenChange={setIsTimingModalOpen}>
              <Dialog.Trigger>
                <Button
                  size="2"
                  variant="soft"
                  disabled={isPending || isRiegoEnCurso}
                  onClick={handleOpenTimingModal}
                  style={{ width: "100%", cursor: isRiegoEnCurso ? "not-allowed" : "pointer", fontWeight: 600 }}
                >
                  {isRiegoEnCurso ? <Lock size={15} aria-hidden /> : <Settings2 size={15} aria-hidden />}
                  Configurar tiempos de riego
                </Button>
              </Dialog.Trigger>

              <Dialog.Content
                style={{
                  maxWidth: 500,
                  width: "min(500px, 94vw)",
                  background: "var(--surface-mockup)",
                  border: "1px solid var(--border2-mockup)",
                  borderRadius: "14px",
                  padding: "clamp(16px, 4vw, 24px)",
                  boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.7)",
                }}
              >
                <Dialog.Title style={{ color: "var(--foreground)", fontSize: "1.125rem", fontWeight: 700 }}>
                  Configurar tiempo de riego y cooldown
                </Dialog.Title>
                <Dialog.Description size="2" mb="4" style={{ color: "var(--muted-foreground)" }}>
                  Modifique el tiempo de riego por ciclo y el tiempo de reposo del modelo predictivo (ML).
                </Dialog.Description>

                <Flex direction="column" gap="4">
                  <label style={{ display: "block" }}>
                    <Flex justify="between" align="center" mb="1">
                      <Text size="2" weight="bold" style={{ color: "var(--foreground)" }}>
                        Tiempo de riego por evento
                      </Text>
                      <Text size="1" color="gray" className="control-num">
                        1 – 30 min
                      </Text>
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
                      size="3"
                      disabled={isSavingTiming}
                      value={draftRelayMin === 0 ? "" : Number(draftRelayMin).toString()}
                      onChange={(e) => setDraftRelayMin(Number(e.target.value) || 0)}
                      placeholder="10"
                      style={{ background: "var(--bg-mockup)" }}
                    >
                      <TextField.Slot side="right">
                        <Text size="1" color="gray">min</Text>
                      </TextField.Slot>
                    </TextField.Root>
                  </label>

                  <label style={{ display: "block" }}>
                    <Flex justify="between" align="center" mb="1">
                      <Text size="2" weight="bold" style={{ color: "var(--foreground)" }}>
                        Cooldown entre riegos ML
                      </Text>
                      <Text size="1" color="gray" className="control-num">
                        1 – 1440 min
                      </Text>
                    </Flex>
                    <Text size="1" color="gray" mb="2" as="div">
                      Tiempo de reposo tras culminar un riego antes de que el modelo ML evalúe un nuevo ciclo.
                    </Text>
                    <TextField.Root
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      size="3"
                      disabled={isSavingTiming}
                      value={draftCooldownMin === 0 ? "" : Number(draftCooldownMin).toString()}
                      onChange={(e) => setDraftCooldownMin(Number(e.target.value) || 0)}
                      placeholder="30"
                      style={{ background: "var(--bg-mockup)" }}
                    >
                      <TextField.Slot side="right">
                        <Text size="1" color="gray">min</Text>
                      </TextField.Slot>
                    </TextField.Root>
                  </label>

                  <Box
                    style={{
                      background: tone("blue").bg,
                      border: `1px solid ${tone("blue").brd}`,
                      borderRadius: "8px",
                      padding: "10px 12px",
                    }}
                  >
                    <Text size="1" style={{ color: "#bae6fd" }} as="div">
                      <strong>Actualización inmediata:</strong> si reduce el cooldown y el tiempo transcurrido desde el
                      último riego ya cumplió la nueva meta, el sistema evaluará y regará de inmediato.
                    </Text>
                  </Box>

                  <Flex justify="end" gap="3" mt="1">
                    <Dialog.Close>
                      <Button
                        variant="soft"
                        color="gray"
                        disabled={isSavingTiming}
                        onClick={() => setIsTimingModalOpen(false)}
                        style={{ cursor: "pointer" }}
                      >
                        Cancelar
                      </Button>
                    </Dialog.Close>
                    <Button
                      variant="solid"
                      loading={isSavingTiming}
                      disabled={isSavingTiming || isRiegoEnCurso}
                      onClick={handleSaveTimingModal}
                      style={{ cursor: "pointer" }}
                    >
                      Guardar configuración
                    </Button>
                  </Flex>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>

            {isRiegoEnCurso && (
              <Flex align="center" justify="center" gap="1" style={{ marginTop: "-6px" }}>
                <Lock size={12} aria-hidden style={{ color: tone("amber").fg }} />
                <Text size="1" style={{ color: tone("amber").fg }}>
                  Modificación de tiempos bloqueada mientras haya un riego en curso.
                </Text>
              </Flex>
            )}
          </Flex>
        </Panel>

        {/* VINCULACIÓN Y ESTADO DE DISPOSITIVOS ACTUADORES */}
        <Panel>
          <Flex direction="column" gap="4">
            <SectionHeader icon={Zap} t="amber" title="Dispositivos actuadores" />
            {dispositivosActuadores.length > 0 ? (
              <Flex direction="column" gap="3">
                {dispositivosActuadores.map((dev: any) => (
                  <Inset key={`act-${dev.id}`}>
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
                        {isRiegoEnCurso && dev.funcionamientoActivo && (
                          <Badge color="amber" variant="soft" size="1">
                            <Lock size={11} aria-hidden /> Riego activo
                          </Badge>
                        )}
                        <Badge color={dev.conectado ? "green" : "red"} variant="soft" size="1">
                          {dev.conectado ? "Online" : "Offline"}
                        </Badge>
                        <Switch
                          aria-label={`Activar ${dev.nombre}`}
                          checked={dev.funcionamientoActivo}
                          disabled={isPending || (isRiegoEnCurso && dev.funcionamientoActivo)}
                          onCheckedChange={(checked) => onToggleCaptura(dev.id, checked)}
                          style={{
                            cursor: isRiegoEnCurso && dev.funcionamientoActivo ? "not-allowed" : "pointer",
                          }}
                        />
                      </Flex>
                    </Flex>

                    {dev.sensores && dev.sensores.length > 0 && (
                      <Flex
                        direction="column"
                        gap="1"
                        mt="3"
                        pt="3"
                        style={{ borderTop: "1px solid var(--border-mockup)" }}
                      >
                        {dev.sensores.map((s: any, index: number) => (
                          <Flex key={`act-${dev.id}-${s.id}-${index}`} align="center" justify="between" gap="2">
                            <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                              <Cpu size={13} aria-hidden style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                              <Text size="1" style={{ color: "var(--foreground)" }}>
                                {s.nombre}
                              </Text>
                            </Flex>
                            <Text size="1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                              GPIO {[s.pin, ...(s.pinesAdicionales || [])].join(", ")}
                            </Text>
                          </Flex>
                        ))}
                      </Flex>
                    )}
                  </Inset>
                ))}
              </Flex>
            ) : (
              <Text color="gray" size="2">
                No hay dispositivos actuadores vinculados a este cultivo.
              </Text>
            )}
          </Flex>
        </Panel>
      </Grid>

      {/* PANEL MODO PREDICTIVO (ML) */}
      <Panel>
        <Flex direction="column" gap="4">
          <SectionHeader
            icon={BrainCircuit}
            t="purple"
            title={
              <Flex as="span" align="center" gap="2" wrap="wrap">
                Modo predictivo inteligente (Machine Learning)
                <Badge color="purple" size="1" variant="soft">
                  Modo único activo
                </Badge>
              </Flex>
            }
            description="El sistema opera de forma 100% autónoma guiado por modelos de Machine Learning entrenados para su cultivo."
            aside={
              <Button
                size="2"
                color="purple"
                variant="solid"
                disabled={isCheckingMl || !isActuatorActive || isRiegoEnCurso || !modo.tieneModelo}
                loading={isCheckingMl}
                onClick={onCheckMlManual}
                style={{ cursor: "pointer" }}
              >
                <Sparkles size={15} aria-hidden />
                Evaluar IA ahora
              </Button>
            }
          />

          <HelpNote title={`¿Por qué el riego por IA tiene un cooldown de ${cooldownVigente} minutos?`}>
            <p>
              El riego automático por Inteligencia Artificial (ML) opera con un{" "}
              <strong>cooldown mínimo de {cooldownVigente} minutos</strong> entre activaciones. Esto permite que el
              agua aplicada se filtre y distribuya de manera uniforme a través del sustrato hasta llegar al sensor.
              Sin esta espera, el sistema podría realizar lecturas falsas de suelo seco debido a la lentitud de
              absorción natural, provocando un sobre-riego que podría ahogar o enfermar las raíces del cultivo.
            </p>
          </HelpNote>

          {/* Estado del riego inteligente */}
          <Inset style={{ padding: 0 }}>
            <Grid columns={{ initial: "1", sm: "2" }}>
              <Box p="4">
                <Text size="1" as="div" style={labelStyle}>
                  Estado del actuador (ML)
                </Text>
                <Flex align="center" gap="2" mt="2">
                  <StatusDot t={actuadorTone} pulse={actuadorTone === "green"} />
                  <Text size="3" weight="bold" style={{ color: tone(actuadorTone).fg }}>
                    {actuadorTexto}
                  </Text>
                </Flex>
                <Text
                  size="1"
                  as="div"
                  mt="2"
                  style={{ color: lastMlCheck?.status === "error" ? tone("red").fg : "var(--muted-foreground)" }}
                >
                  {isCheckingMl ? "Verificando ML..." : lastMlCheck?.message || "Verificación ML lista."}
                </Text>
              </Box>

              <Box
                p="4"
                className="border-t sm:border-t-0 sm:border-l"
                style={{ borderColor: "var(--border-mockup)" }}
              >
                <Text size="1" as="div" style={labelStyle}>
                  Última decisión de la IA
                </Text>
                {ultimaPrediccion ? (
                  <Box mt="2">
                    <Flex align="center" gap="2" wrap="wrap">
                      <Badge
                        size="2"
                        variant="soft"
                        color={ultimaPrediccion.recomendacion === "regar" ? "green" : "gray"}
                      >
                        {ultimaPrediccion.recomendacion === "regar" ? "REGAR" : "NO REGAR"}
                      </Badge>
                      {ultimaPrediccion.probabilidad !== null && (
                        <Text size="2" className="control-num" style={{ color: "var(--foreground)" }}>
                          {(ultimaPrediccion.probabilidad * 100).toFixed(1)}%{" "}
                          <Text size="1" color="gray">
                            probabilidad
                          </Text>
                        </Text>
                      )}
                    </Flex>
                    {ultimaPrediccion.nombre_modelo && (
                      <Text size="1" color="gray" as="div" mt="2">
                        Modelo: <span style={{ color: "var(--foreground)" }}>{ultimaPrediccion.nombre_modelo}</span>
                      </Text>
                    )}
                    <Text size="1" color="gray" as="div" className="control-num" style={{ marginTop: 2 }}>
                      Fecha: {ultimaPrediccion.fecha}
                    </Text>
                  </Box>
                ) : (
                  <Text size="2" color="gray" as="div" mt="2">
                    No hay predicciones registradas aún.
                  </Text>
                )}
              </Box>
            </Grid>

            {ultimaPrediccion && ultimaPrediccion.variables && (
              <Box px="4" py="3" style={{ borderTop: "1px solid var(--border-mockup)" }}>
                <Text size="1" as="div" style={labelStyle} mb="2">
                  Variables de entrada analizadas
                </Text>
                <Grid columns={{ initial: "2", md: "4" }} gap="3">
                  {[
                    ["Hum. suelo", `${ultimaPrediccion.variables.humedad_suelo}%`],
                    ["Temp. suelo", `${ultimaPrediccion.variables.temperatura_suelo}°C`],
                    ["Temp. ambiente", `${ultimaPrediccion.variables.temperatura_ambiente}°C`],
                    ["Hum. ambiente", `${ultimaPrediccion.variables.humedad_ambiente}%`],
                  ].map(([label, valor]) => (
                    <Box key={label}>
                      <Text size="1" color="gray" as="div">
                        {label}
                      </Text>
                      <Text size="3" weight="bold" className="control-num" style={{ color: "var(--foreground)" }}>
                        {valor}
                      </Text>
                    </Box>
                  ))}
                </Grid>
              </Box>
            )}
          </Inset>

          {/* MODELOS ML */}
          <Flex direction="column" gap="3" mt="1">
            <Flex justify="between" align="center" wrap="wrap" gap="2">
              <Text size="2" weight="bold" style={{ color: "var(--foreground)" }}>
                Modelos de Machine Learning disponibles
              </Text>
              {isRiegoEnCurso && (
                <Badge color="amber" variant="soft">
                  <Lock size={11} aria-hidden /> Selección bloqueada mientras el riego esté en curso
                </Badge>
              )}
            </Flex>
            {isLoadingModelosML ? (
              <Inset>
                <Text size="2" color="gray">
                  Cargando modelos inteligentes...
                </Text>
              </Inset>
            ) : modelosML && modelosML.length > 0 ? (
              modelosML.map((m: any) => {
                const isRF =
                  m.algoritmo?.toLowerCase().includes("random") ||
                  m.nombre_modelo?.toLowerCase().includes("random") ||
                  m.algoritmo?.toLowerCase().includes("rf");
                return (
                  <Inset
                    key={m.id_modelo}
                    style={{
                      background: m.activo ? tone("purple").bg : "var(--surface2-mockup)",
                      borderColor: m.activo ? tone("purple").brd : "var(--border-mockup)",
                      transition: "background-color 200ms, border-color 200ms",
                    }}
                  >
                    <Flex justify="between" align="center" wrap="wrap" gap="3">
                      <Box style={{ flex: "1 1 240px", minWidth: 0 }}>
                        <Flex align="center" gap="2" mb="1" wrap="wrap">
                          <Text size="3" weight="bold" style={{ color: "var(--foreground)" }}>
                            {m.nombre_modelo}
                          </Text>
                          {isRF && (
                            <Badge color="gray" variant="soft" size="1">
                              Defecto / Recomendado
                            </Badge>
                          )}
                          {m.activo && (
                            <Badge color="purple" variant="soft" size="1">
                              Activo
                            </Badge>
                          )}
                        </Flex>
                        <Text size="1" color="gray" as="div">
                          Algoritmo: <span style={{ color: "var(--foreground)" }}>{m.algoritmo}</span>
                          <span style={{ margin: "0 6px" }}>·</span>
                          Versión: <span style={{ color: "var(--foreground)" }}>{m.version || "1.0.0"}</span>
                          {m.precision_modelo !== null && (
                            <>
                              <span style={{ margin: "0 6px" }}>·</span>
                              Precisión:{" "}
                              <span className="control-num" style={{ color: tone("purple").fg, fontWeight: 700 }}>
                                {/* precision_modelo ya viene como porcentaje (ej. 99.46) desde
                                    la BD (columna Numeric(5,2)); multiplicar por 100 de nuevo
                                    daba valores absurdos como "9946.0%". */}
                                {Number(m.precision_modelo).toFixed(1)}%
                              </span>
                            </>
                          )}
                        </Text>
                        {m.descripcion && (
                          <Text size="1" color="gray" as="div" mt="1" style={{ maxWidth: "70ch" }}>
                            {m.descripcion}
                          </Text>
                        )}
                      </Box>
                      <Button
                        color="purple"
                        variant={m.activo ? "soft" : "outline"}
                        disabled={m.activo || isRiegoEnCurso || isPending}
                        onClick={() => onSelectModel(m.id_modelo)}
                        style={{ cursor: m.activo || isRiegoEnCurso ? "not-allowed" : "pointer" }}
                        title={
                          isRiegoEnCurso
                            ? "Bloqueado: espere a que finalice el riego en curso para cambiar de modelo"
                            : undefined
                        }
                      >
                        {m.activo ? "Seleccionado" : isRiegoEnCurso ? "Bloqueado (riego en curso)" : "Seleccionar"}
                      </Button>
                    </Flex>
                  </Inset>
                );
              })
            ) : (
              <Text color="gray" size="2">
                No hay modelos de ML registrados en el sistema.
              </Text>
            )}
          </Flex>
        </Flex>
      </Panel>
    </Flex>
  );
}
