"use client";

import React, { useState, useTransition, useMemo, useEffect, useRef } from "react";
import {
  Box,
  Text,
  Flex,
  Card,
  Button,
  Grid,
  Badge,
  Tabs,
  Dialog,
  ScrollArea,
} from "@radix-ui/themes";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { SensoresPanel } from "./SensoresPanel";
import { ActuadoresPanel } from "./ActuadoresPanel";
import { useControlData } from "../hooks/useControlData";
import { useControlEvents } from "../hooks/useControlEvents";
import {
  getDispositivosSensores,
  getDispositivosActuadores,
  getSystemStatusBadge,
} from "../selectors";
import {
  toggleCapturaDatos,
  calibrarSensor,
  actualizarTiempoMaximoRele,
  actualizarCooldownRiego,
  ejecutarPrediccionEnVivo,
} from "@/actions/control";
import { listarModelosML, seleccionarModeloML } from "@/actions/ml";
import type { ControlPanelProps } from "../types";

export function ControlPanel({
  userId,
  cultivos,
  data,
  idCultivo: initialIdCultivo,
  modelosML: initialModelosML,
}: ControlPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<string>("sensores");

  // Hook para gestión de polling GET inteligente y visibilidad de pestaña
  const {
    controlData,
    setControlData,
    idCultivo,
    isLoading: isLoadingControl,
    selectCrop,
    refresh,
  } = useControlData({
    initialData: data,
    initialIdCultivo,
    activeTab,
  });

  // Hook para escuchar eventos WebSocket
  useControlEvents({
    activeCropId: idCultivo,
    onControlUpdate: refresh,
  });

  // Estados locales para actuadores y ML
  const [maxRelayMinutes, setMaxRelayMinutes] = useState<number>(
    data.bomba?.timeoutMin || 10
  );
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(
    data.cooldownMinutos ?? 30
  );
  const [modelosML, setModelosML] = useState<any[] | null>(
    initialModelosML || null
  );
  const [isLoadingModelosML, setIsLoadingModelosML] = useState(false);
  const [isCheckingMl, setIsCheckingMl] = useState(false);
  const [lastMlCheck, setLastMlCheck] = useState<{
    status: "ok" | "error";
    message: string;
  } | null>(null);

  // Sincronizar estados locales cuando controlData cambia
  useEffect(() => {
    if (controlData.bomba?.timeoutMin !== undefined) {
      setMaxRelayMinutes(controlData.bomba.timeoutMin);
    }
    if (controlData.cooldownMinutos !== undefined) {
      setCooldownMinutes(controlData.cooldownMinutos);
    }
  }, [controlData.bomba?.timeoutMin, controlData.cooldownMinutos]);

  // Clasificación de dispositivos
  const dispositivosSensores = useMemo(
    () => getDispositivosSensores(controlData.dispositivos || []),
    [controlData.dispositivos]
  );
  const dispositivosActuadores = useMemo(
    () =>
      getDispositivosActuadores(
        controlData.dispositivos || [],
        dispositivosSensores
      ),
    [controlData.dispositivos, dispositivosSensores]
  );

  const isSensorsActivos = dispositivosSensores.some(
    (dev: any) => dev.funcionamientoActivo && dev.conectado
  );
  const isActuadoresActivos = dispositivosActuadores.some(
    (dev: any) => dev.funcionamientoActivo && dev.conectado
  );
  const isActuatorActive = dispositivosActuadores.some(
    (dev: any) => dev.funcionamientoActivo
  );
  const isConexionDirecta = Boolean(
    controlData.esConexionDirecta ||
      controlData.fuenteAgua?.tipo === "conexion_directa" ||
      controlData.actuadorTipo?.metodoMedicion === "flujometro"
  );
  const isRiegoEnCurso = Boolean(
    (controlData.bomba?.encendida || controlData.riegoActivo) && isActuatorActive
  );

  const sesionPausada = (controlData as any).sesionPausada;
  const prevRiegoRef = useRef<boolean>(isRiegoEnCurso);
  const prevPausadoRef = useRef<boolean>(Boolean(sesionPausada));
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const currentCrop = cultivos.find((c: any) => c.id === idCultivo);
    const currentCropName = (currentCrop as any)?.nombre || (currentCrop as any)?.nombre_personalizado || "Parcela Principal";

    // 1. Detección de inicio de riego
    if (!prevRiegoRef.current && isRiegoEnCurso) {
      window.dispatchEvent(
        new CustomEvent("yaku:riego_evento", {
          detail: { tipo: "inicio", parcela: currentCropName },
        })
      );
    }
    // 2. Detección de finalización de riego
    else if (prevRiegoRef.current && !isRiegoEnCurso && !sesionPausada) {
      window.dispatchEvent(
        new CustomEvent("yaku:riego_evento", {
          detail: { tipo: "fin", parcela: currentCropName, volumen: 180 },
        })
      );
    }

    // 3. Detección de problemas o pausas durante el riego
    if (!prevPausadoRef.current && sesionPausada) {
      const motivo = sesionPausada.motivo || "Caudal o presión anómala en la tubería";
      window.dispatchEvent(
        new CustomEvent("yaku:riego_evento", {
          detail: { tipo: "problema", parcela: currentCropName, motivo },
        })
      );
    }

    prevRiegoRef.current = isRiegoEnCurso;
    prevPausadoRef.current = Boolean(sesionPausada);
  }, [isRiegoEnCurso, sesionPausada, idCultivo, cultivos]);

  const { badgeColor, badgeText, badgeDotColor } = getSystemStatusBadge(
    isSensorsActivos,
    isActuadoresActivos
  );

  // Carga diferida de modelos ML solo al abrir pestaña 'actuadores'
  useEffect(() => {
    if (activeTab !== "actuadores" || modelosML !== null || isLoadingModelosML) {
      return;
    }

    let cancelled = false;
    setIsLoadingModelosML(true);
    listarModelosML(idCultivo)
      .then((res) => {
        if (!cancelled) {
          setModelosML(res.success && res.data ? res.data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setModelosML([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingModelosML(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, idCultivo, modelosML, isLoadingModelosML]);

  // Manejo de cambio de cultivo
  const handleCultivoChange = async (newIdStr: string) => {
    const newId = parseInt(newIdStr, 10);
    if (isNaN(newId)) return;
    setModelosML(null);
    await selectCrop(newId);
  };

  // Guardar duración de relé
  const handleSaveRelayDuration = () => {
    if (isActuatorActive) {
      alert(
        "Bloqueado: no se puede cambiar el tiempo del relé mientras el dispositivo está activo."
      );
      return;
    }
    if (
      !Number.isInteger(maxRelayMinutes) ||
      maxRelayMinutes < 1 ||
      maxRelayMinutes > 30
    ) {
      alert("El tiempo máximo del relé debe estar entre 1 y 30 minutos.");
      return;
    }
    startTransition(async () => {
      try {
        await actualizarTiempoMaximoRele(idCultivo, maxRelayMinutes);
        setControlData((current) => ({
          ...current,
          bomba: { ...current.bomba, timeoutMin: maxRelayMinutes },
        }));
      } catch (err: any) {
        alert(`Error al guardar la configuración: ${err.message}`);
      }
    });
  };

  // Guardar cooldown
  const handleSaveCooldown = () => {
    if (
      !Number.isInteger(cooldownMinutes) ||
      cooldownMinutes < 1 ||
      cooldownMinutes > 1440
    ) {
      alert(
        "El tiempo de cooldown debe ser un número entero entre 1 y 1440 minutos (24 horas)."
      );
      return;
    }
    startTransition(async () => {
      try {
        const res = await actualizarCooldownRiego(idCultivo, cooldownMinutes);
        if (res.success) {
          setControlData((current) => ({
            ...current,
            cooldownMinutos: cooldownMinutes,
          }));
          alert("Tiempo de cooldown ML actualizado correctamente.");
        } else {
          alert(`Error al guardar el cooldown: ${res.error}`);
        }
      } catch (err: any) {
        alert(`Error al guardar la configuración: ${err.message}`);
      }
    });
  };

  // Alternar captura de datos
  const handleToggleCaptura = async (dispositivoId: number, active: boolean) => {
    const esActuador = dispositivosActuadores.some(
      (dev: any) => dev.id === dispositivoId
    );
    if (esActuador && active) {
      const haySensorActivo = dispositivosSensores.some(
        (dev: any) => dev.funcionamientoActivo
      );
      if (!haySensorActivo) {
        alert(
          "No se puede activar el dispositivo actuador: primero active el dispositivo de sensores."
        );
        return;
      }
    }

    const previousData = controlData;
    setControlData((current) => {
      const updatedDispositivos = (current.dispositivos || []).map((dev: any) =>
        dev.id === dispositivoId ? { ...dev, funcionamientoActivo: active } : dev
      );
      if (esActuador && !active) {
        return {
          ...current,
          dispositivos: updatedDispositivos,
          bomba: { ...current.bomba, encendida: false },
          valvula: { ...current.valvula, abierta: false },
          riegoActivo: null,
          sesionPausada: {
            activa: false,
            motivo: null,
            segundosTranscurridos: 0,
            duracionSegundos: 0,
            tiempoRestanteSeg: 0,
          },
          ultimoRiegoFechaFin: current.bomba?.encendida
            ? new Date().toISOString()
            : current.ultimoRiegoFechaFin,
        };
      }
      return {
        ...current,
        dispositivos: updatedDispositivos,
      };
    });

    startTransition(async () => {
      const res = await toggleCapturaDatos(userId, dispositivoId, active);
      if (!res.success) {
        setControlData(previousData);
        alert(`Error al cambiar estado de captura: ${res.error}`);
      } else {
        await refresh();
      }
    });
  };

  // Seleccionar modelo ML
  const handleSelectModel = async (idModelo: number) => {
    startTransition(async () => {
      const res = await seleccionarModeloML(idModelo, idCultivo);
      if (!res.success) {
        alert(`❌ Error al seleccionar el modelo: ${res.error}`);
      } else {
        // Actualizar visualmente la lista de modelos
        setModelosML((prev) =>
          prev
            ? prev.map((m) => ({
                ...m,
                activo: m.id_modelo === idModelo,
              }))
            : null
        );
        await refresh();
      }
    });
  };

  // Calibrar sensor
  const handleCalibrarSensor = async (
    devId: number,
    pin: number,
    offset: number
  ) => {
    startTransition(async () => {
      const res = await calibrarSensor(devId, pin, offset);
      if (res.success) {
        alert(
          `✅ Calibración de offset ${offset} enviada con éxito para GPIO ${pin}.`
        );
      } else {
        alert(`❌ Error al calibrar: ${res.error}`);
      }
    });
  };

  // Ejecución manual de ML (eliminado el polling automático de 30s)
  const runLiveMlCheck = async () => {
    if (isCheckingMl || !isActuatorActive || isRiegoEnCurso) return;
    setIsCheckingMl(true);
    try {
      const res = await ejecutarPrediccionEnVivo(userId, idCultivo);
      if (!res.success) {
        setLastMlCheck({
          status: "error",
          message: res.error || "No se pudo ejecutar la predicción ML.",
        });
        alert(`Error al verificar ML: ${res.error}`);
        return;
      }

      const recomendacion =
        res.data?.recomendacion === "regar" ? "REGAR" : "NO REGAR";
      setLastMlCheck({
        status: "ok",
        message: `Última verificación ML: ${recomendacion}`,
      });
      await refresh();
    } catch (err: any) {
      setLastMlCheck({
        status: "error",
        message: err.message || "Error al ejecutar la predicción ML.",
      });
      alert(`Error al verificar ML: ${err.message}`);
    } finally {
      setIsCheckingMl(false);
    }
  };

  const { bomba, modo, seguridad = {}, logs = [] } = controlData;

  return (
    <Box
      style={{
        opacity: isPending || isLoadingControl ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .threshold-input::-webkit-outer-spin-button,
            .threshold-input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            .threshold-input {
              -moz-appearance: textfield;
            }
          `,
        }}
      />

      {/* HEADER */}
      <Flex justify="between" align="end" mb="6" wrap="wrap" gap="4">
        <Box>
          <Flex align="center" gap="4" mb="3">
            <Text size="6" weight="bold" color="indigo" as="div">
              Control y configuración
            </Text>
            <SearchableSelect
              value={idCultivo.toString()}
              onValueChange={handleCultivoChange}
              placeholder="Seleccionar cultivo"
              searchPlaceholder="Buscar cultivo..."
              style={{
                background: "var(--surface2-mockup)",
                borderColor: "var(--border-mockup)",
                width: 240,
              }}
              options={cultivos.map((c: any) => ({
                value: c.id.toString(),
                label: c.nombre_planta,
              }))}
            />
          </Flex>
          <Text size="3" style={{ color: "#9ca3af", fontFamily: "monospace" }}>
            Modo activo:{" "}
            <span style={{ color: "#818cf8", fontWeight: "bold" }}>
              {modo?.actual || "Automático"}
            </span>{" "}
            · GPIO {bomba?.pin || "N/A"} → Relé → Bomba
          </Text>
        </Box>
        <Badge
          color={badgeColor as any}
          size="3"
          variant="soft"
          style={{ borderRadius: "8px", padding: "6px 12px" }}
        >
          <Box
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: badgeDotColor,
              marginRight: "8px",
            }}
          />
          {badgeText}
        </Badge>
      </Flex>

      {/* MAIN GRID */}
      <Grid
        columns={seguridad?.esAdmin ? { initial: "1", lg: "1.2fr 0.8fr" } : "1"}
        gap="5"
        mb="5"
        align="start"
      >
        {/* COLUMNA IZQUIERDA: CONFIGURACIÓN Y CONTROL */}
        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          style={{ width: "100%" }}
        >
          <Tabs.List
            style={{
              marginBottom: "1.5rem",
              background: "var(--bg-mockup)",
              borderRadius: "8px",
              padding: "4px",
              border: "1px solid var(--border-mockup)",
              display: "flex",
            }}
          >
            <Tabs.Trigger
              value="sensores"
              style={{
                cursor: "pointer",
                padding: "8px 16px",
                fontSize: "0.9rem",
                flex: 1,
                textAlign: "center",
              }}
            >
              📡 Sensores de Captura
            </Tabs.Trigger>
            <Tabs.Trigger
              value="actuadores"
              style={{
                cursor: "pointer",
                padding: "8px 16px",
                fontSize: "0.9rem",
                flex: 1,
                textAlign: "center",
              }}
            >
              ⚡ Actuadores Físicos
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="sensores">
            <SensoresPanel
              dispositivosSensores={dispositivosSensores}
              onToggleCaptura={handleToggleCaptura}
              onCalibrarSensor={handleCalibrarSensor}
            />
          </Tabs.Content>

          <Tabs.Content value="actuadores">
            <ActuadoresPanel
              controlData={controlData}
              dispositivosActuadores={dispositivosActuadores}
              isActuatorActive={isActuatorActive}
              isConexionDirecta={isConexionDirecta}
              isRiegoEnCurso={isRiegoEnCurso}
              maxRelayMinutes={maxRelayMinutes}
              setMaxRelayMinutes={setMaxRelayMinutes}
              onSaveRelayDuration={handleSaveRelayDuration}
              cooldownMinutes={cooldownMinutes}
              setCooldownMinutes={setCooldownMinutes}
              onSaveCooldown={handleSaveCooldown}
              onToggleCaptura={handleToggleCaptura}
              modelosML={modelosML}
              isLoadingModelosML={isLoadingModelosML}
              onSelectModel={handleSelectModel}
              onCheckMlManual={runLiveMlCheck}
              isCheckingMl={isCheckingMl}
              lastMlCheck={lastMlCheck}
              isPending={isPending}
            />
          </Tabs.Content>
        </Tabs.Root>

        {/* COLUMNA DERECHA: LOG DE AUDITORÍA (Solo visible para Admin) */}
        {seguridad?.esAdmin && (
          <Box>
            <Card
              size="4"
              style={{
                background: "var(--surface-mockup)",
                borderColor: "var(--border-mockup)",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Text size="3" weight="bold" color="indigo" mb="5" as="div">
                Log de auditoría del sistema
              </Text>

              {/* VISTA RESUMIDA (3 Columnas, 5 Filas máximo) */}
              <Box style={{ flexGrow: 1 }}>
                <Grid columns="1.5fr 1.5fr 2fr" gap="3" mb="3">
                  <Text size="1" weight="bold" style={{ color: "#6b7280" }}>
                    FECHA (LIMA)
                  </Text>
                  <Text size="1" weight="bold" style={{ color: "#6b7280" }}>
                    MÓDULO
                  </Text>
                  <Text size="1" weight="bold" style={{ color: "#6b7280" }}>
                    ACCIÓN
                  </Text>
                </Grid>

                {logs.slice(0, 5).map((l: any) => (
                  <Grid
                    key={`resumen_${l.id}`}
                    columns="1.5fr 1.5fr 2fr"
                    gap="3"
                    py="3"
                    style={{ borderBottom: "1px solid var(--border-mockup)" }}
                  >
                    <Text size="2" color="indigo" style={{ fontFamily: "monospace" }}>
                      {l.fecha}
                    </Text>
                    <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>
                      {l.modulo}
                    </Text>
                    <Text
                      size="2"
                      weight="bold"
                      style={{ color: "#38bdf8", fontFamily: "monospace" }}
                    >
                      {l.accion}
                    </Text>
                  </Grid>
                ))}
              </Box>

              {/* BOTÓN Y MODAL (Tabla Completa) */}
              <Dialog.Root>
                <Dialog.Trigger>
                  <Button
                    variant="outline"
                    color="gray"
                    style={{
                      width: "100%",
                      marginTop: "20px",
                      borderColor: "var(--border-mockup)",
                      color: "#d1d5db",
                      cursor: "pointer",
                    }}
                  >
                    Ver más detalles
                  </Button>
                </Dialog.Trigger>

                <Dialog.Content
                  style={{
                    maxWidth: 850,
                    background: "var(--surface-mockup)",
                    border: "1px solid var(--border-mockup)",
                  }}
                >
                  <Dialog.Title style={{ color: "white" }}>
                    Log completo de auditoría
                  </Dialog.Title>
                  <Dialog.Description size="2" mb="4" style={{ color: "#9ca3af" }}>
                    Historial detallado de eventos del sistema y acciones manuales registradas.
                  </Dialog.Description>

                  <ScrollArea scrollbars="horizontal" style={{ width: "100%" }}>
                    <Box
                      style={{
                        minWidth: "700px",
                        background: "var(--bg-mockup)",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      <Grid
                        columns="1.5fr 1fr 2fr 3fr 1fr"
                        gap="3"
                        mb="3"
                        px="2"
                      >
                        <Text size="1" weight="bold" style={{ color: "#6b7280" }}>
                          FECHA (LIMA)
                        </Text>
                        <Text size="1" weight="bold" style={{ color: "#6b7280" }}>
                          MÓDULO
                        </Text>
                        <Text size="1" weight="bold" style={{ color: "#6b7280" }}>
                          ACCIÓN
                        </Text>
                        <Text size="1" weight="bold" style={{ color: "#6b7280" }}>
                          DESCRIPCIÓN
                        </Text>
                        <Text size="1" weight="bold" style={{ color: "#6b7280" }}>
                          IP
                        </Text>
                      </Grid>

                      <ScrollArea
                        type="auto"
                        scrollbars="vertical"
                        style={{ maxHeight: "400px", paddingRight: "10px" }}
                      >
                        {logs.map((l: any) => (
                          <Grid
                            key={`full_${l.id}`}
                            columns="1.5fr 1fr 2fr 3fr 1fr"
                            gap="3"
                            py="3"
                            px="2"
                            style={{
                              borderBottom: "1px solid var(--border-mockup)",
                            }}
                          >
                            <Text
                              size="2"
                              color="indigo"
                              style={{ fontFamily: "monospace" }}
                            >
                              {l.fecha}
                            </Text>
                            <Text
                              size="2"
                              color="gray"
                              style={{ fontFamily: "monospace" }}
                            >
                              {l.modulo}
                            </Text>
                            <Text
                              size="2"
                              weight="bold"
                              style={{
                                color: "#38bdf8",
                                fontFamily: "monospace",
                              }}
                            >
                              {l.accion}
                            </Text>
                            <Text
                              size="2"
                              color="gray"
                              style={{
                                fontFamily: "monospace",
                                lineHeight: "1.2",
                              }}
                            >
                              {l.descripcion}
                            </Text>
                            <Text
                              size="2"
                              color="gray"
                              style={{ fontFamily: "monospace" }}
                            >
                              {l.ip_acceso}
                            </Text>
                          </Grid>
                        ))}
                      </ScrollArea>
                    </Box>
                  </ScrollArea>

                  <Flex mt="5" justify="end">
                    <Dialog.Close>
                      <Button
                        variant="soft"
                        color="gray"
                        style={{ cursor: "pointer" }}
                      >
                        Cerrar tabla
                      </Button>
                    </Dialog.Close>
                  </Flex>
                </Dialog.Content>
              </Dialog.Root>
            </Card>
          </Box>
        )}
      </Grid>
    </Box>
  );
}
