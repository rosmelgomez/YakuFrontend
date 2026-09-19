// src/screens/agricultor/CultivosScreen.tsx
import React, { useState, useEffect, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sprout,
  Plus,
  Leaf,
  Calendar,
  Layers,
  Activity,
  Droplets,
  MapPin,
  ExternalLink,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Thermometer,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { guardarUmbrales, obtenerDatosAlertaPorCultivo } from "@/actions/alertas";
import {
  listarTodosCultivos,
  registrarCultivo,
  listarPlantas,
  listarFuentesAgua,
  listarRegiones,
  listarProvincias,
  listarDistritos,
} from "@/actions/crops";
import { getDashboardData } from "@/services/dashboard";
import { getCached, setCached, invalidateCache } from "@/lib/cache";
import SearchableSelect from "@/components/ui/SearchableSelect";

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Siembra: { bg: "bg-slate-800", text: "text-slate-300", border: "border-slate-700" },
  Germinación: { bg: "bg-sky-950/70", text: "text-sky-400", border: "border-sky-800/60" },
  Crecimiento: { bg: "bg-emerald-950/70", text: "text-emerald-400", border: "border-emerald-800/60" },
  Floración: { bg: "bg-amber-950/70", text: "text-amber-400", border: "border-amber-800/60" },
  Fructificación: { bg: "bg-violet-950/70", text: "text-violet-400", border: "border-violet-800/60" },
  Maduración: { bg: "bg-teal-950/70", text: "text-teal-400", border: "border-teal-800/60" },
  Cosecha: { bg: "bg-orange-950/70", text: "text-orange-400", border: "border-orange-800/60" },
};

export interface CropThresholds {
  humedadSuelo?: { min: number; max: number } | null;
  humedadAmbiente?: { min: number; max: number } | null;
  temperaturaSuelo?: { min: number; max: number } | null;
  temperaturaAmbiente?: { min: number; max: number } | null;
}

interface CropItem {
  idCultivo: number;
  nombreCultivo: string;
  conceptoPlanta: string;
  etapaCrecimiento: string;
  area: number | null;
  fechaSiembra: string | null;
  lugar?: string;
  fuenteAguaNombre?: string;
  sensoresCount: number;
  humedadSuelo: number | null;
  humedadSueloUmbral: { min: number; max: number } | null;
  riegosHoy: number;
  litrosHoy: number;
  ultimoRiego: string | null;
  umbrales?: CropThresholds | null;
}

export default function CultivosScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ? parseInt(user.id, 10) : 0;

  const [crops, setCrops] = useState<CropItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [registeredCropName, setRegisteredCropName] = useState("");

  // Floating modal state for Umbrales
  const [selectedCropForUmbrales, setSelectedCropForUmbrales] = useState<CropItem | null>(null);
  const [isUmbralesModalOpen, setIsUmbralesModalOpen] = useState(false);
  const [loadingUmbralesModal, setLoadingUmbralesModal] = useState(false);
  const [savingUmbralesModal, setSavingUmbralesModal] = useState(false);
  const [umbralesItems, setUmbralesItems] = useState<any[]>([]);
  const [umbralesSuccessMessage, setUmbralesSuccessMessage] = useState(false);

  // New crop form state
  const [isPending, startTransition] = useTransition();
  const [newNombre, setNewNombre] = useState("");
  const [newIdPlanta, setNewIdPlanta] = useState("");
  const [newIdFuenteAgua, setNewIdFuenteAgua] = useState("");
  const [newLugar, setNewLugar] = useState("");
  const [newEtapa, setNewEtapa] = useState("Crecimiento");
  const [newArea, setNewArea] = useState("");
  const [newFechaSiembra, setNewFechaSiembra] = useState(new Date().toISOString().split("T")[0]);
  const [newIdRegion, setNewIdRegion] = useState("");
  const [newIdProvincia, setNewIdProvincia] = useState("");
  const [newIdDistrito, setNewIdDistrito] = useState("");

  // Catalogs
  const [plantCatalog, setPlantCatalog] = useState<any[]>([]);
  const [waterSources, setWaterSources] = useState<any[]>([]);
  const [regiones, setRegiones] = useState<any[]>([]);
  const [provincias, setProvincias] = useState<any[]>([]);
  const [distritos, setDistritos] = useState<any[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // Load Crops Data (100% Real from DB & Dashboard Telemetry)
  const loadCropsData = async () => {
    try {
      setLoading(true);
      const [userCrops, dashboardList] = await Promise.all([
        listarTodosCultivos().catch(() => []),
        getDashboardData().catch(() => []),
      ]);

      const dbList = Array.isArray(userCrops) ? userCrops : [];
      const dashList = Array.isArray(dashboardList) ? dashboardList : [];

      // Combine DB records with live dashboard telemetry
      const mapped: CropItem[] = dbList.map((c: any) => {
        const id = c.id_cultivo || c.id;
        const dash = dashList.find((d: any) => d.idCultivo === id);

        const hs = dash?.sensores?.humedadSuelo;
        const humedadVal =
          hs && hs.valor !== null && hs.valor !== undefined
            ? Number(hs.porcentaje ?? hs.valor)
            : null;

        const defaultUmbrales: CropThresholds = {
          humedadSuelo: { min: 35, max: 75 },
          humedadAmbiente: { min: 40, max: 80 },
          temperaturaSuelo: { min: 18, max: 26 },
          temperaturaAmbiente: { min: 18, max: 30 },
        };

        const resolvedUmbrales: CropThresholds = {
          humedadSuelo: dash?.umbrales?.humedadSuelo || dash?.sensores?.humedadSuelo?.umbral || defaultUmbrales.humedadSuelo,
          humedadAmbiente: dash?.umbrales?.humedadAmbiente || dash?.sensores?.humedadAmbiente?.umbral || defaultUmbrales.humedadAmbiente,
          temperaturaSuelo: dash?.umbrales?.temperaturaSuelo || dash?.sensores?.temperaturaSuelo?.umbral || defaultUmbrales.temperaturaSuelo,
          temperaturaAmbiente: dash?.umbrales?.temperaturaAmbiente || dash?.sensores?.temperaturaAmbiente?.umbral || defaultUmbrales.temperaturaAmbiente,
        };

        return {
          idCultivo: id,
          nombreCultivo: c.nombre_planta || dash?.nombreCultivo || "Cultivo",
          conceptoPlanta: dash?.conceptoPlanta || c.nombre_planta || "Cultivo Agrícola",
          etapaCrecimiento: c.etapa_crecimiento || dash?.etapaCrecimiento || "Crecimiento",
          area:
            c.area_m2 !== null && c.area_m2 !== undefined
              ? Number(c.area_m2)
              : dash?.area_m2 !== null && dash?.area_m2 !== undefined
              ? Number(dash.area_m2)
              : null,
          fechaSiembra: c.fecha_siembra || dash?.fecha_siembra || null,
          lugar: c.lugar || dash?.lugar || undefined,
          fuenteAguaNombre: dash?.fuenteAgua?.nombre || (dash?.tanque?.nombre ?? undefined),
          sensoresCount: dash?.dispositivos?.length || 0,
          humedadSuelo: humedadVal,
          humedadSueloUmbral: hs?.umbral || null,
          riegosHoy: Number(dash?.resumenDia?.riegosHoy || 0),
          litrosHoy: Number(dash?.resumenDia?.litrosHoy || 0),
          ultimoRiego: dash?.resumenDia?.ultimoRiego || null,
          umbrales: resolvedUmbrales,
        };
      });

      setCrops(mapped);
    } catch (err) {
      console.error("Error al cargar cultivos:", err);
      setCrops([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUmbralesModal = async (crop: CropItem) => {
    setSelectedCropForUmbrales(crop);
    setIsUmbralesModalOpen(true);
    setLoadingUmbralesModal(true);
    setUmbralesSuccessMessage(false);

    try {
      const res = await obtenerDatosAlertaPorCultivo(crop.idCultivo);
      if (res.success && res.data && Array.isArray(res.data.umbrales) && res.data.umbrales.length > 0) {
        const clean = res.data.umbrales.filter((u: any) => {
          const code = (u.codigo || "").toUpperCase();
          return ["HUM_SUELO", "HUM_AMB", "TEMP_SUELO", "TEMP_AMB"].includes(code);
        });
        setUmbralesItems(clean);
      } else {
        setUmbralesItems([
          { id: 1, codigo: "HUM_SUELO", nombre: "Humedad del Suelo", unidad: "%", min: crop.umbrales?.humedadSuelo?.min ?? 35, max: crop.umbrales?.humedadSuelo?.max ?? 75 },
          { id: 2, codigo: "TEMP_SUELO", nombre: "Temperatura del Suelo", unidad: "°C", min: crop.umbrales?.temperaturaSuelo?.min ?? 18, max: crop.umbrales?.temperaturaSuelo?.max ?? 26 },
          { id: 3, codigo: "HUM_AMB", nombre: "Humedad Ambiental", unidad: "%", min: crop.umbrales?.humedadAmbiente?.min ?? 40, max: crop.umbrales?.humedadAmbiente?.max ?? 80 },
          { id: 4, codigo: "TEMP_AMB", nombre: "Temperatura Ambiental", unidad: "°C", min: crop.umbrales?.temperaturaAmbiente?.min ?? 18, max: crop.umbrales?.temperaturaAmbiente?.max ?? 30 },
        ]);
      }
    } catch (err) {
      console.error("Error al cargar umbrales:", err);
      setUmbralesItems([
        { id: 1, codigo: "HUM_SUELO", nombre: "Humedad del Suelo", unidad: "%", min: crop.umbrales?.humedadSuelo?.min ?? 35, max: crop.umbrales?.humedadSuelo?.max ?? 75 },
        { id: 2, codigo: "TEMP_SUELO", nombre: "Temperatura del Suelo", unidad: "°C", min: crop.umbrales?.temperaturaSuelo?.min ?? 18, max: crop.umbrales?.temperaturaSuelo?.max ?? 26 },
        { id: 3, codigo: "HUM_AMB", nombre: "Humedad Ambiental", unidad: "%", min: crop.umbrales?.humedadAmbiente?.min ?? 40, max: crop.umbrales?.humedadAmbiente?.max ?? 80 },
        { id: 4, codigo: "TEMP_AMB", nombre: "Temperatura Ambiental", unidad: "°C", min: crop.umbrales?.temperaturaAmbiente?.min ?? 18, max: crop.umbrales?.temperaturaAmbiente?.max ?? 30 },
      ]);
    } finally {
      setLoadingUmbralesModal(false);
    }
  };

  const handleUmbralChange = (id: number, field: "min" | "max", value: number) => {
    setUmbralesItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const val = isNaN(value) ? 0 : value;
        const updated = { ...item, [field]: val };
        if (field === "min" && updated.min > updated.max) {
          updated.max = updated.min;
        } else if (field === "max" && updated.max < updated.min) {
          updated.min = updated.max;
        }
        return updated;
      })
    );
  };

  const handleSaveUmbralesModal = async () => {
    if (!selectedCropForUmbrales) return;
    setSavingUmbralesModal(true);

    try {
      const updates = umbralesItems.map((u) => ({
        id: u.id,
        min: Number(u.min),
        max: Number(u.max),
      }));

      const res = await guardarUmbrales(userId, selectedCropForUmbrales.idCultivo, updates);
      if (res.success) {
        invalidateCache("dashboard_data");
        setUmbralesSuccessMessage(true);

        // Actualizacion optimista: ya sabemos los nuevos valores (los que
        // acabamos de guardar), no hace falta esperar un round-trip completo
        // (listarTodosCultivos + getDashboardData) para reflejarlos en la
        // tarjeta. La recarga completa sigue corriendo en segundo plano para
        // reconciliar cualquier otro campo derivado del servidor.
        const findMinMax = (codigo: string) => {
          const item = umbralesItems.find((u) => (u.codigo || "").toUpperCase() === codigo);
          return item ? { min: Number(item.min), max: Number(item.max) } : null;
        };
        const nuevosUmbrales: CropThresholds = {
          humedadSuelo: findMinMax("HUM_SUELO") ?? selectedCropForUmbrales.umbrales?.humedadSuelo,
          humedadAmbiente: findMinMax("HUM_AMB") ?? selectedCropForUmbrales.umbrales?.humedadAmbiente,
          temperaturaSuelo: findMinMax("TEMP_SUELO") ?? selectedCropForUmbrales.umbrales?.temperaturaSuelo,
          temperaturaAmbiente: findMinMax("TEMP_AMB") ?? selectedCropForUmbrales.umbrales?.temperaturaAmbiente,
        };
        setCrops((prev) =>
          prev.map((c) =>
            c.idCultivo === selectedCropForUmbrales.idCultivo
              ? { ...c, umbrales: nuevosUmbrales }
              : c
          )
        );
        void loadCropsData();

        setTimeout(() => {
          setIsUmbralesModalOpen(false);
          setUmbralesSuccessMessage(false);
        }, 800);
      } else {
        alert(`Error al guardar: ${res.error || "No se pudo actualizar"}`);
      }
    } catch (err: any) {
      alert(`Error al guardar umbrales: ${err.message || "Error desconocido"}`);
    } finally {
      setSavingUmbralesModal(false);
    }
  };

  useEffect(() => {
    void loadCropsData();
  }, []);

  // Load catalogs on demand when opening modal
  const ensureCatalogs = async () => {
    if (catalogsLoaded || loadingCatalogs) return;
    setLoadingCatalogs(true);
    try {
      const [plants, sources, depts] = await Promise.all([
        listarPlantas().catch(() => []),
        listarFuentesAgua().catch(() => []),
        listarRegiones().catch(() => []),
      ]);
      setPlantCatalog(plants);
      setWaterSources(sources);
      setRegiones(depts);
      setCatalogsLoaded(true);
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    void ensureCatalogs();
  };

  // Dynamic provinces when region changes
  useEffect(() => {
    if (!newIdRegion) {
      setProvincias([]);
      setDistritos([]);
      return;
    }
    const regId = parseInt(newIdRegion, 10);
    if (isNaN(regId)) return;
    listarProvincias(regId)
      .then((data) => setProvincias(data))
      .catch(() => setProvincias([]));
  }, [newIdRegion]);

  // Dynamic districts when province changes
  useEffect(() => {
    if (!newIdProvincia) {
      setDistritos([]);
      return;
    }
    const provId = parseInt(newIdProvincia, 10);
    if (isNaN(provId)) return;
    listarDistritos(provId)
      .then((data) => setDistritos(data))
      .catch(() => setDistritos([]));
  }, [newIdProvincia]);

  const resetForm = () => {
    setNewNombre("");
    setNewIdPlanta("");
    setNewIdFuenteAgua("");
    setNewLugar("");
    setNewEtapa("Crecimiento");
    setNewArea("");
    setNewFechaSiembra(new Date().toISOString().split("T")[0]);
    setNewIdRegion("");
    setNewIdProvincia("");
    setNewIdDistrito("");
  };

  const handleCreateCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      alert("Ingrese el nombre del cultivo.");
      return;
    }
    if (!newIdPlanta) {
      alert("Seleccione una especie botánica del catálogo.");
      return;
    }
    if (!newIdFuenteAgua) {
      alert("Seleccione una fuente de agua.");
      return;
    }
    if (!newIdDistrito) {
      alert("Seleccione el departamento, provincia y distrito de ubicación.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          nombre_planta: newNombre.trim(),
          id_planta: parseInt(newIdPlanta, 10),
          id_fuente_agua: parseInt(newIdFuenteAgua, 10),
          id_distrito: parseInt(newIdDistrito, 10),
          lugar: newLugar.trim() || "Parcela principal",
          etapa_crecimiento: newEtapa,
          area_m2: parseFloat(newArea) || 100,
          fecha_siembra: newFechaSiembra,
        };

        await registrarCultivo(payload);
        invalidateCache("dashboard_data");
        invalidateCache("cultivos_base");

        setRegisteredCropName(newNombre.trim());
        setIsModalOpen(false);
        resetForm();
        setIsSuccessModalOpen(true);
        void loadCropsData();
      } catch (err: any) {
        alert(`Error al registrar cultivo: ${err.message || "Error desconocido"}`);
      }
    });
  };

  const filteredCrops = filter === "all" ? crops : crops.filter((c) => c.etapaCrecimiento === filter);
  const totalAreaM2 = crops.reduce((acc, c) => acc + (c.area || 0), 0);

  const calculateDaysInField = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  };

  return (
    <div className="page-content w-full px-2 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 space-y-4 sm:space-y-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .umbral-range-slider {
              -webkit-appearance: none;
              appearance: none;
              width: 100%;
              height: 28px;
              background: transparent;
              touch-action: none;
            }
            .umbral-range-slider::-webkit-slider-runnable-track {
              height: 6px;
              border-radius: 9999px;
              background: rgba(30, 41, 59, 0.9);
            }
            .umbral-range-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 22px;
              height: 22px;
              margin-top: -8px;
              border-radius: 9999px;
              background: #10b981;
              border: 2px solid #022c22;
            }
            .umbral-range-slider::-moz-range-track {
              height: 6px;
              border-radius: 9999px;
              background: rgba(30, 41, 59, 0.9);
            }
            .umbral-range-slider::-moz-range-thumb {
              width: 22px;
              height: 22px;
              border-radius: 9999px;
              background: #10b981;
              border: 2px solid #022c22;
            }
          `,
        }}
      />
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sprout className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl md:text-2xl font-bold text-white tracking-tight">Mis Cultivos</h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                {crops.length} cultivo{crops.length !== 1 ? "s" : ""} registrado{crops.length !== 1 ? "s" : ""} · {totalAreaM2.toLocaleString("es-PE")} m² totales
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => navigate("/dashboard/agricultor/fuente-agua")}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-medium border border-slate-700/60 flex items-center justify-center gap-2 transition-colors"
          >
            <Droplets size={16} className="text-sky-400" />
            Fuentes de Agua
          </button>

          <button
            onClick={handleOpenModal}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all"
          >
            <Plus size={16} />
            Nuevo Cultivo
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: "all", label: "Todos" },
          { key: "Crecimiento", label: "Crecimiento" },
          { key: "Floración", label: "Floración" },
          { key: "Fructificación", label: "Fructificación" },
          { key: "Maduración", label: "Maduración" },
          { key: "Siembra", label: "Siembra" },
          { key: "Germinación", label: "Germinación" },
        ].map((tab) => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-900/80 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 animate-pulse space-y-4">
              <div className="h-6 bg-slate-800 rounded w-2/3" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-10 bg-slate-800/60 rounded" />
                <div className="h-10 bg-slate-800/60 rounded" />
              </div>
              <div className="h-3 bg-slate-800 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredCrops.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <Sprout size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {filter === "all" ? "No tienes cultivos registrados" : "Sin cultivos en esta etapa"}
          </h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            {filter === "all"
              ? "Registra tu primer cultivo para comenzar a monitorear condiciones de suelo, clima y automatizar su riego inteligente."
              : "Prueba seleccionando otra etapa de crecimiento o registra un nuevo cultivo en este estado."}
          </p>
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium inline-flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all"
          >
            <Plus size={16} />
            Registrar Cultivo
          </button>
        </div>
      ) : (
        /* Crops Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredCrops.map((crop) => {
            const badge = STAGE_COLORS[crop.etapaCrecimiento] || STAGE_COLORS.Crecimiento;
            const daysInField = calculateDaysInField(crop.fechaSiembra);

            return (
              <div
                key={crop.idCultivo}
                className="bg-slate-900/85 border border-slate-800/90 hover:border-slate-700/80 transition-all rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5 sm:mb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm sm:text-base truncate">{crop.nombreCultivo}</h3>
                      <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1 truncate">
                        <Leaf size={12} className="text-emerald-400 shrink-0" />
                        {crop.conceptoPlanta} {crop.lugar ? `· ${crop.lugar}` : ""}
                      </p>
                    </div>
                    <span
                      className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {crop.etapaCrecimiento}
                    </span>
                  </div>

                  {/* 4 Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mb-3 sm:mb-4 text-[11px] sm:text-xs bg-slate-950/40 p-2.5 sm:p-3 rounded-xl border border-slate-800/50">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Superficie</span>
                      <span className="font-semibold text-slate-200 font-mono">
                        {crop.area !== null ? `${crop.area.toLocaleString("es-PE")} m²` : "No registrada"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Fecha Siembra</span>
                      <span className="font-semibold text-slate-200">
                        {crop.fechaSiembra
                          ? new Date(crop.fechaSiembra).toLocaleDateString("es-PE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "No registrada"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Sensores IoT</span>
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        <Activity size={12} className="text-sky-400" />
                        {crop.sensoresCount} vinculado{crop.sensoresCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[10px] text-slate-400">Días en campo</span>
                        <span
                          className="text-[10px] text-slate-500 cursor-help"
                          title="Días transcurridos desde la fecha de siembra registrada (edad del cultivo)"
                        >
                          ⓘ
                        </span>
                      </div>
                      <span className="font-semibold text-slate-200 font-mono">
                        {daysInField !== null ? `${daysInField} días` : "Sin fecha"}
                      </span>
                    </div>
                  </div>

                  {/* Registro de Riegos Ejecutados */}
                  <div className="mb-3 sm:mb-4 bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800/60 space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium text-slate-300">
                        <Droplets size={13} className="text-sky-400" />
                        Riegos hoy:
                      </span>
                      <span className="text-slate-200 font-mono font-semibold">
                        {crop.riegosHoy > 0
                          ? `${crop.riegosHoy} (${crop.litrosHoy.toFixed(1)} L)`
                          : "0 hoy (0.0 L)"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                      <span>Último riego:</span>
                      <span className="text-slate-300">
                        {crop.ultimoRiego
                          ? new Date(crop.ultimoRiego).toLocaleDateString("es-PE", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Ninguno registrado"}
                      </span>
                    </div>
                  </div>

                  {/* Umbrales de Sensores para las 4 Variables */}
                  <div className="mb-3 sm:mb-4 bg-slate-950/50 p-2.5 sm:p-3 rounded-xl border border-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs font-semibold text-slate-300 flex items-center gap-1">
                        🌱 Umbrales
                      </span>
                      <button
                        onClick={() => handleOpenUmbralesModal(crop)}
                        className="text-[10px] sm:text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline font-medium flex items-center gap-1"
                      >
                        <Sliders size={12} />
                        Configurar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                      <div className="bg-slate-900/70 p-1.5 sm:p-2 rounded-lg border border-slate-800/60">
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block mb-0.5">💧 Hum. Suelo</span>
                        <span className="font-mono font-semibold text-emerald-400 text-[11px] sm:text-xs">
                          {crop.umbrales?.humedadSuelo
                            ? `${crop.umbrales.humedadSuelo.min}%–${crop.umbrales.humedadSuelo.max}%`
                            : "35%–75%"}
                        </span>
                      </div>

                      <div className="bg-slate-900/70 p-1.5 sm:p-2 rounded-lg border border-slate-800/60">
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block mb-0.5">🌡️ Temp. Suelo</span>
                        <span className="font-mono font-semibold text-amber-400 text-[11px] sm:text-xs">
                          {crop.umbrales?.temperaturaSuelo
                            ? `${crop.umbrales.temperaturaSuelo.min}°–${crop.umbrales.temperaturaSuelo.max}°`
                            : "18°–26°"}
                        </span>
                      </div>

                      <div className="bg-slate-900/70 p-1.5 sm:p-2 rounded-lg border border-slate-800/60">
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block mb-0.5">🌫️ Hum. Amb.</span>
                        <span className="font-mono font-semibold text-sky-400 text-[11px] sm:text-xs">
                          {crop.umbrales?.humedadAmbiente
                            ? `${crop.umbrales.humedadAmbiente.min}%–${crop.umbrales.humedadAmbiente.max}%`
                            : "40%–80%"}
                        </span>
                      </div>

                      <div className="bg-slate-900/70 p-1.5 sm:p-2 rounded-lg border border-slate-800/60">
                        <span className="text-[9px] sm:text-[10px] text-slate-400 block mb-0.5">☀️ Temp. Amb.</span>
                        <span className="font-mono font-semibold text-orange-400 text-[11px] sm:text-xs">
                          {crop.umbrales?.temperaturaAmbiente
                            ? `${crop.umbrales.temperaturaAmbiente.min}°–${crop.umbrales.temperaturaAmbiente.max}°`
                            : "18°–30°"}
                        </span>
                      </div>
                    </div>
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
                  <button
                    onClick={() => handleOpenUmbralesModal(crop)}
                    className="px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    title="Configurar umbrales de sensores"
                  >
                    <Sliders size={14} />
                    Umbrales
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Registrar Nuevo Cultivo */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 text-white shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sprout size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Registrar Nuevo Cultivo</h3>
                  <p className="text-xs text-slate-400">Configura una nueva parcela para monitoreo y riego IA</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCrop} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre de la Parcela / Cultivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tomates Invernadero Norte"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Especie Botánica *</label>
                  <SearchableSelect
                    value={newIdPlanta}
                    onValueChange={setNewIdPlanta}
                    placeholder={loadingCatalogs ? "Cargando catálogo..." : "Elegir especie..."}
                    searchPlaceholder="Buscar especie..."
                    options={plantCatalog.map((p: any) => ({
                      value: p.id.toString(),
                      label: `${p.nombre} (${p.tipo || "General"})`,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fuente de Agua *</label>
                  {waterSources.length === 0 && !loadingCatalogs ? (
                    <div className="p-2 bg-rose-950/40 border border-rose-800/40 rounded-xl text-[11px] text-rose-300">
                      No tienes fuentes registradas.{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          navigate("/dashboard/agricultor/fuente-agua");
                        }}
                        className="underline font-bold text-sky-400"
                      >
                        Crear fuente primero
                      </button>
                    </div>
                  ) : (
                    <SearchableSelect
                      value={newIdFuenteAgua}
                      onValueChange={setNewIdFuenteAgua}
                      placeholder={loadingCatalogs ? "Cargando fuentes..." : "Elegir fuente..."}
                      searchPlaceholder="Buscar fuente..."
                      options={waterSources.map((f: any) => ({
                        value: f.id.toString(),
                        label: `${f.nombre} (${f.tipo === "tanque" ? "Tanque" : "Red directa"})`,
                      }))}
                    />
                  )}
                </div>
              </div>

              {/* Geographical Cascade */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Departamento *</label>
                  <SearchableSelect
                    value={newIdRegion}
                    onValueChange={(val) => {
                      setNewIdRegion(val);
                      setNewIdProvincia("");
                      setNewIdDistrito("");
                    }}
                    placeholder="Región..."
                    searchPlaceholder="Buscar..."
                    options={regiones.map((r: any) => ({ value: r.id.toString(), label: r.nombre }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Provincia *</label>
                  <SearchableSelect
                    value={newIdProvincia}
                    onValueChange={(val) => {
                      setNewIdProvincia(val);
                      setNewIdDistrito("");
                    }}
                    disabled={!newIdRegion}
                    placeholder="Provincia..."
                    searchPlaceholder="Buscar..."
                    options={provincias.map((p: any) => ({ value: p.id.toString(), label: p.nombre }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Distrito *</label>
                  <SearchableSelect
                    value={newIdDistrito}
                    onValueChange={setNewIdDistrito}
                    disabled={!newIdProvincia}
                    placeholder="Distrito..."
                    searchPlaceholder="Buscar..."
                    options={distritos.map((d: any) => ({ value: d.id.toString(), label: d.nombre }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Lugar / Sector *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Parcela Los Sauces B"
                    value={newLugar}
                    onChange={(e) => setNewLugar(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Superficie (m²) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="Ej: 500"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Etapa de Crecimiento *</label>
                  <SearchableSelect
                    value={newEtapa}
                    onValueChange={setNewEtapa}
                    options={[
                      { value: "Siembra", label: "Siembra" },
                      { value: "Germinación", label: "Germinación" },
                      { value: "Crecimiento", label: "Crecimiento" },
                      { value: "Floración", label: "Floración" },
                      { value: "Fructificación", label: "Fructificación" },
                      { value: "Maduración", label: "Maduración" },
                      { value: "Cosecha", label: "Cosecha" },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fecha de Siembra *</label>
                  <input
                    type="date"
                    required
                    value={newFechaSiembra}
                    onChange={(e) => setNewFechaSiembra(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Info Notice */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300/90">
                <Info size={16} className="shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  Los sensores IoT asignados a esta parcela y los actuadores de la fuente de agua se vincularán
                  automáticamente en tu dashboard de telemetría en tiempo real.
                </span>
              </div>

              {/* Action Buttons */}
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
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
                >
                  {isPending ? "Guardando..." : "Registrar Cultivo"}
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
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">¡Cultivo Registrado con Éxito!</h3>
            <p className="text-slate-400 text-sm mb-6">
              La parcela <span className="text-emerald-400 font-semibold">"{registeredCropName}"</span> ha sido añadida
              correctamente al sistema.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  navigate("/dashboard/agricultor");
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-900/30 transition-all"
              >
                Ir al Dashboard de Telemetría
              </button>
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                Cerrar y Permanecer Aquí
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Modal: Configuración de Umbrales de Sensores */}
      {isUmbralesModalOpen && selectedCropForUmbrales && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setIsUmbralesModalOpen(false)}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 text-white shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Sliders size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-1.5">
                    🌱 Configuración de Umbrales
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    Rangos operativos para <strong className="text-emerald-400">{selectedCropForUmbrales.nombreCultivo}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUmbralesModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Explanation Note */}
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300/90 flex items-start gap-2.5">
              <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <p>
                Los actuadores de riego automático y las alertas del sistema se accionarán cuando los sensores reporten
                valores fuera del rango mínimo y máximo configurado para este cultivo.
              </p>
            </div>

            {umbralesSuccessMessage && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-pulse">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>¡Umbrales actualizados correctamente! Sincronizando datos...</span>
              </div>
            )}

            {/* Form Fields */}
            {loadingUmbralesModal ? (
              <div className="py-8 text-center text-sm text-slate-400 animate-pulse">
                Cargando umbrales del cultivo...
              </div>
            ) : (
              <div className="space-y-3.5">
                {umbralesItems.map((u) => {
                  const isTemp = u.unidad === "°C" || u.codigo?.includes("TEMP");
                  const maxLimit = isTemp ? 60 : 100;
                  const icon =
                    u.codigo === "HUM_SUELO"
                      ? "💧"
                      : u.codigo === "TEMP_SUELO"
                      ? "🌡️"
                      : u.codigo === "HUM_AMB"
                      ? "🌫️"
                      : "☀️";

                  return (
                    <div
                      key={u.id}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{icon}</span>
                          <span className="font-semibold text-white text-xs sm:text-sm truncate">
                            {u.nombre}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 shrink-0 whitespace-nowrap">
                          {u.min} {u.unidad} – {u.max} {u.unidad}
                        </span>
                      </div>

                      {/* Number Inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 mb-1 block">
                            Mínimo ({u.unidad})
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={u.max}
                            value={u.min}
                            onChange={(e) => handleUmbralChange(u.id, "min", Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 mb-1 block">
                            Máximo ({u.unidad})
                          </label>
                          <input
                            type="number"
                            min={u.min}
                            max={maxLimit}
                            value={u.max}
                            onChange={(e) => handleUmbralChange(u.id, "max", Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Sliders */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="w-24 sm:w-auto shrink-0">Ajuste rápido Mín:</span>
                          <input
                            type="range"
                            min={0}
                            max={maxLimit}
                            value={u.min}
                            onChange={(e) => handleUmbralChange(u.id, "min", Number(e.target.value))}
                            className="umbral-range-slider flex-1 cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="w-24 sm:w-auto shrink-0">Ajuste rápido Máx:</span>
                          <input
                            type="range"
                            min={0}
                            max={maxLimit}
                            value={u.max}
                            onChange={(e) => handleUmbralChange(u.id, "max", Number(e.target.value))}
                            className="umbral-range-slider flex-1 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsUmbralesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingUmbralesModal || loadingUmbralesModal}
                onClick={handleSaveUmbralesModal}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-medium flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all"
              >
                {savingUmbralesModal ? "Guardando..." : "Guardar Umbrales"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
