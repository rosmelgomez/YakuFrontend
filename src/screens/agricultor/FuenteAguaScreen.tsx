// src/screens/agricultor/FuenteAguaScreen.tsx
import React, { useState, useEffect, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "@radix-ui/themes";
import {
  Droplets,
  Plus,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  Power,
  ExternalLink,
  Sprout,
  Waves,
  Container,
} from "lucide-react";
import { listarFuentesAgua, registrarFuenteAgua } from "@/actions/crops";
import { getDashboardData } from "@/services/dashboard";
import { invalidateCache } from "@/lib/cache";

interface WaterSourceItem {
  id: number;
  nombre: string;
  tipo: string; // 'tanque' | 'conexion_directa'
  capacidad_litros?: number;
  altura_tanque_cm?: number;
  altura_seguridad_cm?: number;
}

type NivelTone = { fill: string; text: string; label: string };

function nivelTone(pct: number): NivelTone {
  if (pct >= 50) return { fill: "var(--blue)", text: "text-sky-300", label: "Nivel óptimo" };
  if (pct >= 25) return { fill: "var(--amber)", text: "text-amber-300", label: "Nivel bajo" };
  return { fill: "var(--red)", text: "text-rose-300", label: "Nivel crítico" };
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";

const inputClass =
  "w-full bg-[var(--bg-mockup)] border border-[var(--border2-mockup)] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25 transition-colors tabular-nums";

// Tanque dibujado: la columna de agua sube/baja con el porcentaje real y la
// franja superior marca la distancia de seguridad sensor-techo.
function TankGauge({
  pct,
  hasData,
  safetyRatio,
  color,
}: {
  pct: number;
  hasData: boolean;
  safetyRatio: number;
  color: string;
}) {
  const level = Math.min(100, Math.max(0, pct));
  return (
    <div
      className="relative w-16 sm:w-[72px] h-28 shrink-0 rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-mockup)",
        border: hasData ? "1px solid var(--border2-mockup)" : "1px dashed var(--border2-mockup)",
      }}
      role={hasData ? "meter" : undefined}
      aria-valuenow={hasData ? level : undefined}
      aria-valuemin={hasData ? 0 : undefined}
      aria-valuemax={hasData ? 100 : undefined}
      aria-label={hasData ? `Nivel del tanque ${level}%` : "Sin lectura del tanque"}
    >
      {/* Zona de seguridad (no utilizable) */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: `${Math.min(30, Math.max(6, safetyRatio * 100))}%`,
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 4px, transparent 4px 8px)",
          borderBottom: "1px dashed rgba(255,255,255,0.12)",
        }}
      />
      {/* Marcas de 25/50/75 */}
      {[25, 50, 75].map((m) => (
        <div
          key={m}
          className="absolute right-0 w-2 h-px bg-white/15"
          style={{ bottom: `${m}%` }}
        />
      ))}
      {hasData ? (
        <div
          className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
          style={{
            height: `${Math.max(3, level)}%`,
            background: `linear-gradient(to top, color-mix(in srgb, ${color} 55%, transparent), color-mix(in srgb, ${color} 30%, transparent))`,
            borderTop: `2px solid ${color}`,
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
          <Radio size={18} aria-hidden />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-slate-400 leading-tight">{label}</dt>
      <dd className={`m-0 mt-0.5 text-sm font-semibold tabular-nums truncate ${accent || "text-slate-100"}`}>
        {value}
      </dd>
    </div>
  );
}

export default function FuenteAguaScreen() {
  const navigate = useNavigate();
  const [fuentes, setFuentes] = useState<WaterSourceItem[]>([]);
  const [dashboardCrops, setDashboardCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "tanque" | "conexion_directa">("all");

  // Modal registration state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registradaNombre, setRegistradaNombre] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [newNombre, setNewNombre] = useState("");
  const [newTipo, setNewTipo] = useState("tanque");
  const [newCapacidad, setNewCapacidad] = useState("");
  const [newAltura, setNewAltura] = useState("");
  const [newAlturaSeguridad, setNewAlturaSeguridad] = useState("10");

  const loadData = async () => {
    try {
      setLoading(true);
      const [sources, dashboard] = await Promise.all([
        listarFuentesAgua().catch(() => []),
        getDashboardData().catch(() => []),
      ]);

      const sourcesList = Array.isArray(sources) ? sources : [];
      setFuentes(sourcesList);
      setDashboardCrops(Array.isArray(dashboard) ? dashboard : []);
    } catch (err) {
      console.error("Error al cargar fuentes de agua:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const abrirModal = () => {
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateFuente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      setFormError("Ingrese el nombre de la fuente de agua.");
      return;
    }

    if (newTipo === "tanque") {
      if (!newCapacidad || Number(newCapacidad) <= 0) {
        setFormError("Ingrese una capacidad válida en litros.");
        return;
      }
      if (!newAltura || Number(newAltura) <= 0) {
        setFormError("Ingrese una altura válida en centímetros.");
        return;
      }
    }
    setFormError(null);

    startTransition(async () => {
      try {
        const nombre = newNombre.trim();
        const payload = {
          nombre,
          tipo: newTipo,
          capacidad_litros: newTipo === "tanque" ? parseFloat(newCapacidad) : undefined,
          altura_tanque_cm: newTipo === "tanque" ? parseFloat(newAltura) : undefined,
          altura_seguridad_cm: newTipo === "tanque" ? parseFloat(newAlturaSeguridad) || 10 : undefined,
        };

        await registrarFuenteAgua(payload);
        invalidateCache("dashboard_data");
        invalidateCache("cultivos_base");

        setIsModalOpen(false);
        setNewNombre("");
        setNewCapacidad("");
        setNewAltura("");
        setNewAlturaSeguridad("10");
        setRegistradaNombre(nombre);

        void loadData();
      } catch (err: any) {
        setFormError(`Error al registrar fuente: ${err.message || "Error desconocido"}`);
      }
    });
  };

  const tanquesCount = fuentes.filter((f) => f.tipo === "tanque").length;
  const redesCount = fuentes.filter((f) => f.tipo !== "tanque").length;
  const filteredFuentes = filter === "all" ? fuentes : fuentes.filter((f) => f.tipo === filter);

  return (
    <div className="page-content w-full px-2 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Droplets className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight m-0">Fuentes de agua</h2>
            <p className="text-slate-400 text-[11px] sm:text-xs m-0 tabular-nums">
              {fuentes.length} fuente{fuentes.length !== 1 ? "s" : ""} registrada{fuentes.length !== 1 ? "s" : ""} ·{" "}
              {tanquesCount} tanque{tanquesCount !== 1 ? "s" : ""} · {redesCount} red{redesCount !== 1 ? "es" : ""}{" "}
              directa{redesCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => navigate("/dashboard/agricultor/cultivos")}
            className={`flex-1 sm:flex-none h-9 px-3.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs sm:text-sm font-medium border border-[var(--border2-mockup)] flex items-center justify-center gap-2 transition-colors ${focusRing}`}
          >
            <Sprout size={16} className="text-emerald-400" aria-hidden />
            Mis cultivos
          </button>

          <button
            onClick={abrirModal}
            className={`flex-1 sm:flex-none h-9 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-sky-950 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${focusRing}`}
          >
            <Plus size={16} aria-hidden />
            Nueva fuente de agua
          </button>
        </div>
      </div>

      {/* Confirmación de registro (en línea, no bloquea la pantalla) */}
      {registradaNombre && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3"
        >
          <CheckCircle2 size={18} className="text-sky-300 shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="m-0 text-sm font-semibold text-sky-100">
              Fuente de agua registrada: {registradaNombre}
            </p>
            <p className="m-0 text-xs text-sky-200/80">
              La fuente ha sido registrada con éxito y ya está lista para vincularse a tus cultivos y sensores.
            </p>
          </div>
          <button
            onClick={() => setRegistradaNombre(null)}
            aria-label="Cerrar aviso"
            className={`p-1 rounded-md text-sky-200/70 hover:text-white hover:bg-white/10 transition-colors ${focusRing}`}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Filtrar fuentes">
        {[
          { key: "all", label: "Todas", count: fuentes.length, icon: Droplets },
          { key: "tanque", label: "Tanques / reservorios", count: tanquesCount, icon: Container },
          { key: "conexion_directa", label: "Red directa", count: redesCount, icon: Waves },
        ].map((tab) => {
          const active = filter === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              aria-pressed={active}
              className={`h-8 px-3 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 border ${focusRing} ${
                active
                  ? "bg-sky-500/15 text-sky-200 border-sky-500/40"
                  : "bg-transparent text-slate-400 hover:text-white border-[var(--border2-mockup)] hover:bg-white/[0.04]"
              }`}
            >
              <Icon size={14} aria-hidden />
              {tab.label}
              <span
                className={`min-w-5 px-1.5 rounded-md text-[11px] font-semibold tabular-nums ${
                  active ? "bg-sky-400/20 text-sky-100" : "bg-white/[0.06] text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        /* Loading skeleton con la misma silueta que la tarjeta real */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[var(--surface-mockup)] border border-[var(--border-mockup)] rounded-2xl p-4 sm:p-5 animate-pulse space-y-4"
            >
              <div className="h-5 bg-white/[0.06] rounded w-2/3" />
              <div className="flex gap-4">
                <div className="w-16 h-28 bg-white/[0.05] rounded-xl" />
                <div className="flex-1 space-y-2 pt-2">
                  <div className="h-8 bg-white/[0.06] rounded w-1/2" />
                  <div className="h-3 bg-white/[0.04] rounded w-3/4" />
                  <div className="h-3 bg-white/[0.04] rounded w-2/3" />
                </div>
              </div>
              <div className="h-10 bg-white/[0.04] rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredFuentes.length === 0 ? (
        /* Empty state */
        <div className="text-center py-14 px-4 bg-[var(--surface-mockup)] border border-dashed border-[var(--border2-mockup)] rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4 text-sky-400">
            <Droplets size={28} aria-hidden />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
            {filter === "all" ? "No tienes fuentes de agua registradas" : "Sin fuentes en esta categoría"}
          </h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            {filter === "all"
              ? "Registra tu primer tanque o conexión de red directa para monitorear el nivel, consumo y automatizar el riego."
              : "Prueba cambiando de filtro o registra una nueva fuente en esta categoría."}
          </p>
          <button
            onClick={abrirModal}
            className={`h-9 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-sky-950 text-sm font-semibold inline-flex items-center gap-2 transition-colors ${focusRing}`}
          >
            <Plus size={16} aria-hidden />
            Registrar fuente de agua
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFuentes.map((fuente) => {
            const isTanque = fuente.tipo === "tanque";
            const linkedCrop = dashboardCrops.find(
              (c) => c.fuenteAgua?.id === fuente.id || c.tanque?.nombre === fuente.nombre
            );

            // Tanque telemetry
            const tanqueTelemetry = linkedCrop?.tanque;
            const hasTanqueTelemetry = Boolean(
              isTanque &&
                tanqueTelemetry &&
                tanqueTelemetry.litrosActuales !== undefined &&
                tanqueTelemetry.litrosActuales !== null
            );

            const tankCapacidad = fuente.capacidad_litros || tanqueTelemetry?.litrosTotales || 0;
            const tankLitros = hasTanqueTelemetry ? Number(tanqueTelemetry.litrosActuales) : 0;
            const tankPct = hasTanqueTelemetry
              ? Number(
                  tanqueTelemetry.porcentaje ??
                    (tankCapacidad > 0 ? Math.round((tankLitros / tankCapacidad) * 100) : 0)
                )
              : 0;
            const tankHeight = fuente.altura_tanque_cm || 0;
            const tankSafety = fuente.altura_seguridad_cm || 10;
            const bombaEncendida = Boolean(tanqueTelemetry?.bombaEncendida);
            const nivel = nivelTone(tankPct);

            // Red Directa telemetry
            const isValveOpen = Boolean(linkedCrop?.dispositivos?.some((d: any) => d.funcionamientoActivo));
            const litrosHoy = Number(linkedCrop?.resumenDia?.litrosHoy || 0);
            const riegosHoy = Number(linkedCrop?.resumenDia?.riegosHoy || 0);
            const ultimoRiego = linkedCrop?.resumenDia?.ultimoRiego || null;

            // Cut-off detection
            const isCutOff = !isTanque && isValveOpen && litrosHoy === 0;

            const ultimoRiegoTexto = ultimoRiego
              ? new Date(ultimoRiego).toLocaleDateString("es-PE", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Ninguno registrado";

            return (
              <article
                key={fuente.id}
                className={`bg-[var(--surface-mockup)] border rounded-2xl p-4 sm:p-5 flex flex-col gap-4 transition-colors ${
                  isCutOff ? "border-rose-500/40" : "border-[var(--border-mockup)] hover:border-[var(--border2-mockup)]"
                }`}
              >
                {/* Cabecera */}
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="m-0 font-bold text-white text-sm sm:text-base leading-snug truncate">
                      {fuente.nombre}
                    </h3>
                    <p className="m-0 text-slate-400 text-xs mt-0.5 flex items-center gap-1 min-w-0">
                      {linkedCrop ? (
                        <>
                          <Sprout size={12} className="text-emerald-400 shrink-0" aria-hidden />
                          <span className="truncate">
                            Parcela: <strong className="text-slate-200 font-medium">{linkedCrop.nombreCultivo}</strong>
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-500">Sin cultivo asignado</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0 border ${
                      isTanque
                        ? "bg-sky-500/10 text-sky-300 border-sky-500/25"
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                    }`}
                  >
                    {isTanque ? <Container size={12} aria-hidden /> : <Waves size={12} aria-hidden />}
                    {isTanque ? "Tanque" : "Red directa"}
                  </span>
                </header>

                {isTanque ? (
                  /* Lectura principal: tanque */
                  <div className="flex items-stretch gap-4">
                    <TankGauge
                      pct={tankPct}
                      hasData={hasTanqueTelemetry}
                      safetyRatio={tankHeight > 0 ? tankSafety / tankHeight : 0.1}
                      color={nivel.fill}
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                      {hasTanqueTelemetry ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums leading-none">
                              {tankPct}
                            </span>
                            <span className="text-lg font-semibold text-slate-400">%</span>
                          </div>
                          <p className={`m-0 text-xs font-semibold ${nivel.text}`}>{nivel.label}</p>
                          <p className="m-0 text-xs text-slate-400 tabular-nums">
                            <span className="text-slate-200 font-medium">{tankLitros.toLocaleString("es-PE")} L</span>{" "}
                            de {tankCapacidad.toLocaleString("es-PE")} L
                          </p>
                          <p
                            className={`m-0 text-xs font-medium flex items-center gap-1.5 ${
                              bombaEncendida ? "text-emerald-300" : "text-slate-400"
                            }`}
                          >
                            <Power
                              size={12}
                              aria-hidden
                              className={bombaEncendida ? "text-emerald-400 animate-pulse" : "text-slate-500"}
                            />
                            Bomba de riego {bombaEncendida ? "encendida" : "en reposo"}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="m-0 text-sm font-semibold text-slate-200">Esperando lectura ultrasónica</p>
                          <p className="m-0 text-xs text-slate-400">
                            El nivel aparecerá cuando el sensor ultrasónico envíe su primera medición.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Lectura principal: red directa */
                  <div className="flex flex-col gap-3">
                    {isCutOff && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2"
                      >
                        <AlertTriangle size={15} className="text-rose-300 shrink-0 mt-0.5" aria-hidden />
                        <div>
                          <p className="m-0 text-xs font-bold text-rose-200">¡Corte de suministro detectado!</p>
                          <p className="m-0 text-[11px] text-rose-200/75">
                            La válvula está abierta pero no se ha medido flujo hoy.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                          isValveOpen
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-white/[0.03] border-[var(--border2-mockup)] text-slate-500"
                        }`}
                      >
                        <Zap size={20} aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="m-0 text-[11px] text-slate-400">Electroválvula</p>
                        <p
                          className={`m-0 text-base font-bold flex items-center gap-2 ${
                            isValveOpen ? "text-emerald-300" : "text-slate-200"
                          }`}
                        >
                          {isValveOpen ? "Abierta (energizada)" : "Cerrada (NC)"}
                        </p>
                        <p className="m-0 text-xs text-slate-400">
                          {isCutOff
                            ? "Sin flujo registrado"
                            : isValveOpen
                            ? "Riego activo · flujo normal"
                            : "En reposo"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Consumo del día */}
                <dl className="m-0 grid grid-cols-3 gap-3 border-t border-[var(--border-mockup)] pt-3">
                  <Stat label={isTanque ? "Consumo hoy" : "Consumo medido hoy"} value={`${litrosHoy.toFixed(1)} L`} accent="text-sky-300" />
                  <Stat label="Riegos hoy" value={riegosHoy} />
                  {isTanque ? (
                    <Stat label="Capacidad" value={`${tankCapacidad.toLocaleString("es-PE")} L`} />
                  ) : (
                    <Stat label="Último riego" value={ultimoRiegoTexto} />
                  )}
                </dl>

                {/* Especificaciones de instalación */}
                <dl className="m-0 grid grid-cols-3 gap-3 rounded-lg bg-white/[0.025] px-3 py-2.5">
                  {isTanque ? (
                    <>
                      <Stat label="Altura tanque" value={tankHeight > 0 ? `${tankHeight} cm` : "--"} />
                      <Stat label="Seguridad" value={`${tankSafety} cm`} />
                      <Stat label="Sensor" value="Ultrasónico" />
                    </>
                  ) : (
                    <>
                      <Stat label="Suministro" value="Continua" />
                      <Stat label="Electroválvula" value="GPIO 25" accent="text-emerald-300" />
                      <Stat label="Sensor flujo" value="GPIO 27" accent="text-sky-300" />
                    </>
                  )}
                </dl>

                {/* Acciones */}
                <div className="flex items-center gap-2 mt-auto">
                  <button
                    onClick={() => navigate("/dashboard/agricultor")}
                    className={`flex-1 h-9 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border2-mockup)] text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${focusRing}`}
                  >
                    <ExternalLink size={14} className="text-slate-400" aria-hidden />
                    Ver en dashboard
                  </button>
                  {linkedCrop && (
                    <button
                      onClick={() => navigate("/dashboard/agricultor/cultivos")}
                      className={`h-9 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${focusRing}`}
                      title="Ver cultivo vinculado"
                    >
                      <Sprout size={14} aria-hidden />
                      Cultivo
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal: Registrar nueva fuente de agua */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Content
          style={{
            maxWidth: 460,
            width: "min(460px, 94vw)",
            background: "var(--surface-mockup)",
            border: "1px solid var(--border2-mockup)",
            borderRadius: "16px",
            padding: "clamp(16px, 4vw, 24px)",
            boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.7)",
          }}
        >
          <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b border-[var(--border-mockup)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                <Droplets size={18} aria-hidden />
              </div>
              <div>
                <Dialog.Title style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "white" }}>
                  Nueva fuente de agua
                </Dialog.Title>
                <Dialog.Description style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                  Configura un tanque o suministro por red directa
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close>
              <button
                aria-label="Cerrar"
                className={`p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors ${focusRing}`}
              >
                <X size={18} aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleCreateFuente} className="space-y-4" noValidate>
            <div>
              <label htmlFor="fuente-nombre" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre de la fuente
              </label>
              <input
                id="fuente-nombre"
                type="text"
                required
                autoFocus
                placeholder="Ej: Tanque Principal Sector Norte"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                className={inputClass}
              />
            </div>

            <fieldset className="m-0 p-0 border-0">
              <legend className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de instalación</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: "tanque",
                    title: "Tanque / reservorio",
                    desc: "Medición con sensor ultrasónico",
                    icon: Container,
                  },
                  {
                    value: "conexion_directa",
                    title: "Conexión directa",
                    desc: "Medición con flujómetro YF-S201",
                    icon: Waves,
                  },
                ].map((opt) => {
                  const checked = newTipo === opt.value;
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.value}
                      className={`relative flex flex-col gap-1 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-400 ${
                        checked
                          ? "border-sky-500/50 bg-sky-500/10"
                          : "border-[var(--border2-mockup)] bg-[var(--bg-mockup)] hover:bg-white/[0.03]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipo-fuente"
                        value={opt.value}
                        checked={checked}
                        onChange={(e) => setNewTipo(e.target.value)}
                        className="sr-only"
                      />
                      <span className={`flex items-center gap-1.5 text-sm font-semibold ${checked ? "text-sky-200" : "text-slate-200"}`}>
                        <Icon size={15} aria-hidden />
                        {opt.title}
                      </span>
                      <span className="text-[11px] text-slate-400 leading-snug">{opt.desc}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {newTipo === "tanque" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="fuente-capacidad" className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Capacidad (litros)
                    </label>
                    <input
                      id="fuente-capacidad"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      required
                      placeholder="Ej: 5000"
                      value={newCapacidad}
                      onChange={(e) => setNewCapacidad(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="fuente-altura" className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Altura total (cm)
                    </label>
                    <input
                      id="fuente-altura"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      required
                      placeholder="Ej: 180"
                      value={newAltura}
                      onChange={(e) => setNewAltura(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="fuente-seguridad" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Distancia sensor a techo / seguridad (cm)
                  </label>
                  <input
                    id="fuente-seguridad"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="Ej: 10"
                    value={newAlturaSeguridad}
                    onChange={(e) => setNewAlturaSeguridad(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {newTipo === "conexion_directa" && (
              <div className="p-3 bg-sky-500/10 border border-sky-500/25 rounded-lg text-xs text-sky-100/90 leading-relaxed">
                En conexión directa, el volumen se mide por los pulsos del caudalímetro YF-S201 (GPIO 27) y el flujo se
                controla mediante la electroválvula (GPIO 25).
              </div>
            )}

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden />
                {formError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`flex-1 h-10 px-4 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-sm font-medium transition-colors ${focusRing}`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={`flex-1 h-10 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-sky-950 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${focusRing}`}
              >
                {isPending ? "Guardando..." : "Guardar fuente"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
