"use client";

import React, { useState, useTransition, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
import { HorarioRiegoPanel } from "./HorarioRiegoPanel";
import { SectionHeader, controlStyles } from "./ui";
import { CalendarClock, Radio, ScrollText, SlidersHorizontal, Zap } from "lucide-react";
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
  detenerRiego,
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
  const VALID_TABS = ["sensores", "actuadores", "horarios"];
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTabState] = useState<string>(
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "sensores"
  );
  // Se guarda la pestaña activa en la URL (?tab=...) para que al recargar
  // la pagina (F5) se mantenga en la misma pestaña en vez de volver siempre
  // a "Sensores de Captura".
  const setActiveTab = useCallback(
    (tab: string) => {
      setActiveTabState(tab);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", tab);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

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
    (controlData.bomba?.encendida ||
      controlData.valvula?.abierta ||
      controlData.riegoActivo) &&
      isActuatorActive
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
    if (isRiegoEnCurso) {
      alert(
        "Bloqueado: no se puede cambiar el tiempo de riego mientras hay un riego en curso."
      );
      return;
    }
    if (
      !Number.isInteger(maxRelayMinutes) ||
      maxRelayMinutes < 1 ||
      maxRelayMinutes > 30
    ) {
      alert("El tiempo de riego debe estar entre 1 y 30 minutos.");
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
    if (isRiegoEnCurso) {
      alert(
        "Bloqueado: no se puede cambiar el tiempo de cooldown mientras hay un riego en curso."
      );
      return;
    }
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
          const elapsedSec = controlData.tiempoDesdeUltimoRiegoSeg ?? (
            controlData.ultimoRiegoFechaFin
              ? Math.floor((Date.now() - new Date(controlData.ultimoRiegoFechaFin).getTime()) / 1000)
              : null
          );
          if (elapsedSec !== null && elapsedSec >= cooldownMinutes * 60) {
            await runLiveMlCheck(true);
          }
        } else {
          alert(`Error al guardar el cooldown: ${res.error}`);
        }
      } catch (err: any) {
        alert(`Error al guardar la configuración: ${err.message}`);
      }
    });
  };

  // Guardar configuración completa de tiempos (Formulario Flotante)
  const handleSaveTimingConfig = async (newRelayMin: number, newCooldownMin: number) => {
    if (isRiegoEnCurso) {
      alert("Bloqueado: no se pueden modificar los tiempos mientras hay un riego en curso.");
      return { success: false, error: "Riego en curso" };
    }
    if (!Number.isInteger(newRelayMin) || newRelayMin < 1 || newRelayMin > 30) {
      alert("El tiempo de riego debe estar entre 1 y 30 minutos.");
      return { success: false, error: "Tiempo de riego inválido" };
    }
    if (!Number.isInteger(newCooldownMin) || newCooldownMin < 1 || newCooldownMin > 1440) {
      alert("El cooldown debe estar entre 1 y 1440 minutos.");
      return { success: false, error: "Cooldown inválido" };
    }

    try {
      const [resRelay, resCooldown] = await Promise.all([
        actualizarTiempoMaximoRele(idCultivo, newRelayMin),
        actualizarCooldownRiego(idCultivo, newCooldownMin),
      ]);

      if (!resRelay.success) {
        alert(`Error al guardar tiempo de riego: ${resRelay.error}`);
        return { success: false, error: resRelay.error };
      }
      if (!resCooldown.success) {
        alert(`Error al guardar cooldown: ${resCooldown.error}`);
        return { success: false, error: resCooldown.error };
      }

      setMaxRelayMinutes(newRelayMin);
      setCooldownMinutes(newCooldownMin);
      setControlData((current) => ({
        ...current,
        bomba: { ...current.bomba, timeoutMin: newRelayMin },
        cooldownMinutos: newCooldownMin,
      }));

      // Si el cooldown se redujo y el tiempo transcurrido ya lo superó, evaluar inmediatamente
      const elapsedSec = controlData.tiempoDesdeUltimoRiegoSeg ?? (
        controlData.ultimoRiegoFechaFin
          ? Math.floor((Date.now() - new Date(controlData.ultimoRiegoFechaFin).getTime()) / 1000)
          : null
      );
      if (elapsedSec !== null && elapsedSec >= newCooldownMin * 60) {
        await runLiveMlCheck(true);
      }
      return { success: true };
    } catch (err: any) {
      alert(`Error al guardar la configuración: ${err.message}`);
      return { success: false, error: err.message };
    }
  };

  // Alternar captura de datos
  const handleToggleCaptura = async (dispositivoId: number, active: boolean) => {
    const esActuador = dispositivosActuadores.some(
      (dev: any) => dev.id === dispositivoId
    );
    if (esActuador && !active && isRiegoEnCurso) {
      alert(
        "No se puede apagar el dispositivo actuador mientras hay un riego en curso. Espere a que finalice el ciclo de riego."
      );
      return;
    }
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
    if (isActuatorActive) {
      alert(
        "Bloqueado: no se puede cambiar el modelo de Machine Learning mientras el dispositivo actuador está activo. Desactive el dispositivo actuador primero para cambiar de modelo."
      );
      return;
    }
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
    offset: number,
    idAsignacion?: number | null,
    variable?: string | null
  ) => {
    startTransition(async () => {
      const res = await calibrarSensor(devId, pin, offset, idAsignacion);
      if (res.success) {
        alert(
          `Calibración aplicada correctamente: las próximas lecturas de ${
            variable ? variable.toLowerCase() : `el sensor en GPIO ${pin}`
          } sumarán ${offset > 0 ? "+" : ""}${offset}.`
        );
        await refresh();
      } else {
        alert(`❌ Error al calibrar: ${res.error}`);
      }
    });
  };

  // Detener riego (por cronómetro completado o manual)
  const handleStopIrrigation = async (motivo: string = "cronometro_completado") => {
    try {
      const res = await detenerRiego(idCultivo, motivo);
      if (res.success) {
        await refresh();
      } else {
        console.error("Error al detener riego:", res.error);
      }
    } catch (err) {
      console.error("Error al detener riego:", err);
    }
  };

  // Ejecución de ML (manual o automática tras cumplir cooldown)
  const runLiveMlCheck = async (silent = false) => {
    if (isCheckingMl || !isActuatorActive || isRiegoEnCurso) return;
    setIsCheckingMl(true);
    try {
      const res = await ejecutarPrediccionEnVivo(userId, idCultivo);
      if (!res.success) {
        const isCooldown = res.error?.toLowerCase().includes("cooldown");
        setLastMlCheck({
          status: isCooldown ? "ok" : "error",
          message: isCooldown
            ? `En reposo: ${res.error}`
            : (res.error || "No se pudo ejecutar la predicción ML."),
        });
        if (!silent && !isCooldown) {
          alert(`Error al verificar ML: ${res.error}`);
        }
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
      if (!silent) {
        alert(`Error al verificar ML: ${err.message}`);
      }
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
      <style dangerouslySetInnerHTML={{ __html: controlStyles }} />

      {/* HEADER RESPONSIVE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight leading-tight m-0">
              Control y configuración
            </h2>
            <p className="text-slate-400 text-[11px] sm:text-xs mt-0.5 m-0">
              Modo activo:{" "}
              <span className="text-emerald-400 font-semibold">{modo?.actual || "Automático"}</span>
              <span className="text-slate-600 mx-1.5">·</span>
              <span className="font-mono">GPIO {bomba?.pin || "N/A"}</span> → Relé → Bomba
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 shrink-0">
          <div className="w-full sm:w-60">
            <SearchableSelect
              value={idCultivo.toString()}
              onValueChange={handleCultivoChange}
              placeholder="Seleccionar cultivo"
              searchPlaceholder="Buscar cultivo..."
              style={{
                background: "var(--surface2-mockup)",
                borderColor: "var(--border2-mockup)",
                width: "100%",
              }}
              options={cultivos.map((c: any) => ({
                value: c.id.toString(),
                label: c.nombre_planta,
              }))}
            />
          </div>
          <Badge
            color={badgeColor as any}
            size="2"
            variant="soft"
            style={{ borderRadius: "999px", padding: "5px 12px", alignSelf: "flex-start" }}
          >
            <Box
              aria-hidden
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: badgeDotColor,
                marginRight: "6px",
              }}
            />
            {badgeText}
          </Badge>
        </div>
      </div>

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
            className="control-tabs"
            style={{
              marginBottom: "1.25rem",
              display: "flex",
              width: "100%",
              boxShadow: "inset 0 -1px 0 0 var(--border-mockup)",
            }}
          >
            <Tabs.Trigger value="sensores">
              <Radio size={15} aria-hidden />
              <span className="sm:hidden">Sensores</span>
              <span className="hidden sm:inline">Sensores de captura</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="actuadores">
              <Zap size={15} aria-hidden />
              <span className="sm:hidden">Actuadores</span>
              <span className="hidden sm:inline">Actuadores físicos</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="horarios">
              <CalendarClock size={15} aria-hidden />
              <span className="sm:hidden">Horarios</span>
              <span className="hidden sm:inline">Horarios de riego</span>
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="sensores">
            <SensoresPanel
              dispositivosSensores={dispositivosSensores}
              onToggleCaptura={handleToggleCaptura}
              onCalibrarSensor={handleCalibrarSensor}
            />
          </Tabs.Content>

          <Tabs.Content value="horarios">
            <HorarioRiegoPanel idAsignacion={controlData.bomba?.id} />
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
              onSaveTimingConfig={handleSaveTimingConfig}
              onToggleCaptura={handleToggleCaptura}
              modelosML={modelosML}
              isLoadingModelosML={isLoadingModelosML}
              onSelectModel={handleSelectModel}
              onCheckMlManual={runLiveMlCheck}
              isCheckingMl={isCheckingMl}
              lastMlCheck={lastMlCheck}
              isPending={isPending}
              onStopIrrigation={handleStopIrrigation}
            />
          </Tabs.Content>
        </Tabs.Root>

        {/* COLUMNA DERECHA: LOG DE AUDITORÍA (Solo visible para Admin) */}
        {seguridad?.esAdmin && (
          <Box>
            <Card
              size={{ initial: "2", sm: "3" }}
              style={{
                background: "var(--surface-mockup)",
                borderColor: "var(--border-mockup)",
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Box mb="4">
                <SectionHeader icon={ScrollText} t="gray" title="Log de auditoría del sistema" />
              </Box>

              {/* VISTA RESUMIDA (3 Columnas, 5 Filas máximo) */}
              <Box style={{ flexGrow: 1 }}>
                <Grid columns="1.5fr 1.5fr 2fr" gap="3" mb="3">
                  <Text size="1" weight="bold" style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>
                    FECHA (LIMA)
                  </Text>
                  <Text size="1" weight="bold" style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>
                    MÓDULO
                  </Text>
                  <Text size="1" weight="bold" style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>
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
                    <Text size="2" style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>
                      {l.fecha}
                    </Text>
                    <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>
                      {l.modulo}
                    </Text>
                    <Text
                      size="2"
                      weight="bold"
                      style={{ color: "var(--blue)", fontFamily: "monospace" }}
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
                      borderColor: "var(--border2-mockup)",
                      color: "var(--foreground)",
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
                  <Dialog.Description size="2" mb="4" style={{ color: "#8fa6b7" }}>
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
                        <Text size="1" weight="bold" style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>
                          FECHA (LIMA)
                        </Text>
                        <Text size="1" weight="bold" style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>
                          MÓDULO
                        </Text>
                        <Text size="1" weight="bold" style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>
                          ACCIÓN
                        </Text>
                        <Text size="1" weight="bold" style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>
                          DESCRIPCIÓN
                        </Text>
                        <Text size="1" weight="bold" style={{ color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>
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
                              style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
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
                                color: "var(--blue)",
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
