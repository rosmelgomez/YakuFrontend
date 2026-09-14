// src/screens/agricultor/FuenteAguaScreen.tsx
import React, { useState, useEffect, useTransition } from "react";
import { useNavigate } from "react-router-dom";
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

export default function FuenteAguaScreen() {
  const navigate = useNavigate();
  const [fuentes, setFuentes] = useState<WaterSourceItem[]>([]);
  const [dashboardCrops, setDashboardCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "tanque" | "conexion_directa">("all");

  // Modal registration state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
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

  const handleCreateFuente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      alert("Ingrese el nombre de la fuente de agua.");
      return;
    }

    if (newTipo === "tanque") {
      if (!newCapacidad || Number(newCapacidad) <= 0) {
        alert("Ingrese una capacidad válida en litros.");
        return;
      }
      if (!newAltura || Number(newAltura) <= 0) {
        alert("Ingrese una altura válida en centímetros.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const payload = {
          nombre: newNombre.trim(),
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
        setIsSuccessModalOpen(true);

        void loadData();
      } catch (err: any) {
        alert(`Error al registrar fuente: ${err.message || "Error desconocido"}`);
      }
    });
  };

  const tanquesCount = fuentes.filter((f) => f.tipo === "tanque").length;
  const redesCount = fuentes.filter((f) => f.tipo !== "tanque").length;
  const filteredFuentes = filter === "all" ? fuentes : fuentes.filter((f) => f.tipo === filter);

  return (
    <div className="page-content w-full px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6 space-y-6">
      {/* Header with Title, Counts and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Droplets size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Fuentes de Agua</h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                {fuentes.length} fuente{fuentes.length !== 1 ? "s" : ""} registrada{fuentes.length !== 1 ? "s" : ""} ·{" "}
                {tanquesCount} tanque{tanquesCount !== 1 ? "s" : ""} · {redesCount} red{redesCount !== 1 ? "es" : ""} directa{redesCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => navigate("/dashboard/agricultor/cultivos")}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-medium border border-slate-700/60 flex items-center justify-center gap-2 transition-colors"
          >
            <Sprout size={16} className="text-emerald-400" />
            Mis Cultivos
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 transition-all"
          >
            <Plus size={16} />
            Nueva Fuente de Agua
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: "all", label: "Todas las Fuentes", count: fuentes.length },
          { key: "tanque", label: "Tanques / Reservorios", count: tanquesCount },
          { key: "conexion_directa", label: "Red Directa", count: redesCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              filter === tab.key
                ? "bg-sky-600 text-white shadow-md shadow-sky-900/30"
                : "bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700"
            }`}
          >
            {tab.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === tab.key ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-4">
              <div className="h-6 bg-slate-800 rounded w-2/3" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-10 bg-slate-800/60 rounded" />
                <div className="h-10 bg-slate-800/60 rounded" />
                <div className="h-10 bg-slate-800/60 rounded" />
              </div>
              <div className="h-16 bg-slate-800/40 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredFuentes.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4 text-sky-400">
            <Droplets size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {filter === "all" ? "No tienes fuentes de agua registradas" : "Sin fuentes en esta categoría"}
          </h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            {filter === "all"
              ? "Registra tu primer tanque o conexión de red directa para monitorear el nivel, consumo y automatizar el riego."
              : "Prueba cambiando de filtro o registra una nueva fuente en esta categoría."}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium inline-flex items-center gap-2 shadow-lg shadow-sky-900/30 transition-all"
          >
            <Plus size={16} />
            Registrar Fuente de Agua
          </button>
        </div>
      ) : (
        /* Water Sources Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
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

            const levelColor = tankPct >= 50 ? "#0ea5e9" : tankPct >= 25 ? "#f59e0b" : "#ef4444";
            const levelBadgeClass =
              tankPct >= 50
                ? "bg-sky-950/70 text-sky-400 border-sky-800/60"
                : tankPct >= 25
                ? "bg-amber-950/70 text-amber-400 border-amber-800/60"
                : "bg-rose-950/70 text-rose-400 border-rose-800/60";

            // Red Directa telemetry
            const isValveOpen = Boolean(linkedCrop?.dispositivos?.some((d: any) => d.funcionamientoActivo));
            const litrosHoy = Number(linkedCrop?.resumenDia?.litrosHoy || 0);
            const riegosHoy = Number(linkedCrop?.resumenDia?.riegosHoy || 0);
            const ultimoRiego = linkedCrop?.resumenDia?.ultimoRiego || null;

            // Cut-off detection
            const isCutOff = !isTanque && isValveOpen && litrosHoy === 0;

            return (
              <div
                key={fuente.id}
                className="bg-slate-900/85 border border-slate-800/90 hover:border-slate-700/80 transition-all rounded-2xl p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-base truncate">{fuente.nombre}</h3>
                      <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1 truncate">
                        {linkedCrop ? (
                          <>
                            <Sprout size={12} className="text-emerald-400 shrink-0" />
                            <span>
                              Parcela: <strong className="text-slate-200">{linkedCrop.nombreCultivo}</strong>
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">Sin cultivo asignado</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${
                        isTanque
                          ? "bg-sky-950/80 text-sky-400 border-sky-800/60"
                          : "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                      }`}
                    >
                      {isTanque ? "Tanque" : "Red Directa"}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    {isTanque ? (
                      hasTanqueTelemetry ? (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1.5 ${levelBadgeClass}`}
                        >
                          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                          {tankPct >= 50 ? "Nivel Óptimo" : tankPct >= 25 ? "Nivel Bajo" : "Nivel Crítico"} · {tankPct}%
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/70 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          Esperando lectura ultrasónica
                        </span>
                      )
                    ) : isCutOff ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950 text-rose-400 border border-rose-800 inline-flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle size={12} />
                        ¡Corte de Suministro Detectado!
                      </span>
                    ) : isValveOpen ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        Riego Activo · Flujo Normal
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        Válvula Cerrada · En Reposo
                      </span>
                    )}
                  </div>

                  {/* Specs Overview */}
                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 mb-4 font-mono">
                    {isTanque ? (
                      <>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Capacidad</span>
                          <span className="font-bold text-white">{tankCapacidad.toLocaleString("es-PE")} L</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Altura Tanque</span>
                          <span className="font-semibold text-slate-200">
                            {tankHeight > 0 ? `${tankHeight} cm` : "--"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Seguridad</span>
                          <span className="font-semibold text-slate-300">{tankSafety} cm</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Suministro</span>
                          <span className="font-bold text-white">Continua</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Electroválvula</span>
                          <span className="font-semibold text-emerald-400">GPIO 25</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Sensor Flujo</span>
                          <span className="font-semibold text-sky-400">GPIO 27</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Telemetry & Consumption Box */}
                  <div className="mb-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 space-y-2.5">
                    {isTanque ? (
                      <>
                        {hasTanqueTelemetry ? (
                          <>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Nivel de agua:</span>
                                <span className="font-mono font-bold text-sky-400">
                                  {tankPct}% ({tankLitros.toLocaleString("es-PE")} L)
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${Math.min(100, Math.max(3, tankPct))}%`,
                                    backgroundColor: levelColor,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                              <span>Bomba de riego:</span>
                              <span
                                className={`font-semibold flex items-center gap-1 ${
                                  bombaEncendida ? "text-emerald-400" : "text-slate-400"
                                }`}
                              >
                                <Power
                                  size={12}
                                  className={bombaEncendida ? "text-emerald-400 animate-pulse" : "text-slate-500"}
                                />
                                {bombaEncendida ? "Encendida" : "En Reposo"}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400 flex items-center gap-2 py-0.5">
                            <Radio size={14} className="text-slate-500 shrink-0" />
                            <span>Esperando lecturas de sensor ultrasónico</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span>Consumo registrado hoy:</span>
                          <span className="text-slate-200 font-mono font-semibold">
                            {litrosHoy.toFixed(1)} L ({riegosHoy} riegos)
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Electroválvula:</span>
                          <span
                            className={`font-semibold flex items-center gap-1 ${
                              isValveOpen ? "text-emerald-400" : "text-slate-400"
                            }`}
                          >
                            <Zap size={13} className={isValveOpen ? "text-emerald-400" : "text-slate-500"} />
                            {isValveOpen ? "Abierta (Energizada)" : "Cerrada (NC)"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span>Consumo medido hoy:</span>
                          <span className="text-slate-200 font-mono font-semibold">
                            {litrosHoy.toFixed(1)} L ({riegosHoy} riegos)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span>Último riego:</span>
                          <span className="text-slate-300">
                            {ultimoRiego
                              ? new Date(ultimoRiego).toLocaleDateString("es-PE", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Ninguno registrado"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => navigate("/dashboard/agricultor")}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink size={14} className="text-slate-400" />
                    Ver en Dashboard
                  </button>
                  {linkedCrop && (
                    <button
                      onClick={() => navigate("/dashboard/agricultor/cultivos")}
                      className="px-3 py-2 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 text-sky-400 border border-sky-800/40 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      title="Ver cultivo vinculado"
                    >
                      <Sprout size={14} />
                      Cultivo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Registrar Nueva Fuente de Agua */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Droplets size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Nueva Fuente de Agua</h3>
                  <p className="text-xs text-slate-400">Configura un tanque o suministro por red directa</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFuente} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre de la Fuente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tanque Principal Sector Norte"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Instalación *</label>
                <select
                  value={newTipo}
                  onChange={(e) => setNewTipo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="tanque">Tanque / Reservorio (Medición con Sensor Ultrasónico)</option>
                  <option value="conexion_directa">Conexión Directa (Medición con Flujómetro YF-S201)</option>
                </select>
              </div>

              {newTipo === "tanque" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Capacidad (Litros) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Ej: 5000"
                        value={newCapacidad}
                        onChange={(e) => setNewCapacidad(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Altura Total (cm) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Ej: 180"
                        value={newAltura}
                        onChange={(e) => setNewAltura(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Distancia Sensor a Techo / Seguridad (cm)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ej: 10"
                      value={newAlturaSeguridad}
                      onChange={(e) => setNewAlturaSeguridad(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </>
              )}

              {newTipo === "conexion_directa" && (
                <div className="p-3 bg-sky-950/40 border border-sky-800/40 rounded-xl text-xs text-sky-200">
                  En conexión directa, el volumen se mide por los pulsos del caudalímetro YF-S201 (GPIO 27) y el flujo se
                  controla mediante la electroválvula (GPIO 25).
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium shadow-lg shadow-sky-900/30 transition-all flex items-center justify-center gap-2"
                >
                  {isPending ? "Guardando..." : "Guardar Fuente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center text-white shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center mx-auto mb-4 text-sky-400">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">¡Fuente de Agua Registrada!</h3>
            <p className="text-slate-400 text-sm mb-6">
              La fuente ha sido registrada con éxito y ya está lista para vincularse a tus cultivos y sensores.
            </p>
            <button
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium shadow-lg shadow-sky-900/30 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
