"use client";

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text, Flex, Grid, Select, Card, Badge, Progress, Switch, Separator, Button, Dialog, TextField, ScrollArea } from '@radix-ui/themes';
import { LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, CartesianGrid } from 'recharts';
import { registrarCultivo, registrarFuenteAgua, listarProvincias, listarDistritos } from '@/actions/crops';
import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';
import SearchableSelect from '@/components/ui/SearchableSelect';

const getCreatedCropId = (res: any): number => {
  return res?.id_cultivo ?? res?.idCultivo ?? res?.id ?? 0;
};

const DASHBOARD_REFRESH_SECONDS = 60;
const DEFAULT_DASHBOARD_TIME_ZONE = 'America/Lima';

type TanqueData = { idTelemetria: string | null; nombre: string; litrosActuales: number; litrosTotales: number; porcentaje: number; sensorModelo: string; estadoNivel: string; bombaEncendida: boolean; timeoutMinutos: number; dispositivoActivo?: boolean; } | null;
type SensorData = { modelo: string; metrica: string; unidad: string; valor: number; porcentaje: number | null; ema: number | null; fecha: Date; umbral: { min: number | null; max: number | null } | null; } | null;
type DispositivoData = { id: number; nombre: string; estado: string | null; funcionamientoActivo?: boolean; tipoId?: number; tipoNombre?: string; };
type ConsumoData = { fecha?: string; label: string; valor: number; };
type ResumenDiaData = { riegosHoy: number; litrosHoy: number; ultimoRiego: Date | null; humedadSueloProm: number | null; humedadAmbiental: number | null; };

type HistoricoPunto = { fecha: string; valor: number; };
type HistorialData = {
  humedadSuelo: HistoricoPunto[];
  humedadAmbiente: HistoricoPunto[];
  temperaturaSuelo: HistoricoPunto[];
  temperaturaAmbiente: HistoricoPunto[];
};

type HistoryRange = '6h' | '24h' | '7d';
type CalendarFilter = 'all' | string;
type CalendarFilters = { weekday: CalendarFilter; month: CalendarFilter; year: CalendarFilter; startDate?: string; endDate?: string };
type FilterMode = 'relative' | 'calendar';

const WEEKDAY_OPTIONS = [
  { value: 'all', label: 'Todos los dias' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miercoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sabado' },
  { value: '0', label: 'Domingo' },
];

const MONTH_OPTIONS = [
  { value: 'all', label: 'Todos los meses' },
  { value: '0', label: 'Enero' },
  { value: '1', label: 'Febrero' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Mayo' },
  { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' },
  { value: '10', label: 'Noviembre' },
  { value: '11', label: 'Diciembre' },
];

type CultivoData = {
  idCultivo: number;
  zonaHoraria?: string;
  nombreCultivo: string;
  conceptoPlanta: string;
  etapaCrecimiento: string | null;
  sensores: { humedadSuelo: SensorData; humedadAmbiente: SensorData; temperaturaSuelo: SensorData; temperaturaAmbiente: SensorData; };
  historialSensores: HistorialData;
  dispositivos: DispositivoData[];
  tanque: TanqueData;
  consumoSemanal: ConsumoData[];
  limiteConsumo: number | null;
  resumenDia: ResumenDiaData;
};

const isCollectorDevice = (device: DispositivoData) => {
  const typeName = `${device.tipoNombre || ''} ${device.nombre || ''}`.toLowerCase();
  return device.tipoId === 1 || ['sensor', 'sensores', 'captura', 'colector', 'suelo', 'clima'].some((word) => typeName.includes(word));
};

const hasActiveCollector = (cultivo: CultivoData | null) => {
  return Boolean(cultivo?.dispositivos?.some((device) => isCollectorDevice(device) && device.funcionamientoActivo));
};

const dateMatchesCalendarFilters = (date: Date, filters: CalendarFilters) => {
  if (Number.isNaN(date.getTime())) return false;
  if (filters.weekday !== 'all' && date.getDay().toString() !== filters.weekday) return false;
  if (filters.month !== 'all' && date.getMonth().toString() !== filters.month) return false;
  if (filters.year !== 'all' && date.getFullYear().toString() !== filters.year) return false;
  if (filters.startDate && date < new Date(`${filters.startDate}T00:00:00`)) return false;
  if (filters.endDate && date > new Date(`${filters.endDate}T23:59:59`)) return false;
  return true;
};

const getDashboardYears = (cultivo: CultivoData | null) => {
  if (!cultivo) return [new Date().getFullYear().toString()];
  const dates = [
    ...Object.values(cultivo.historialSensores).flat().map((item) => item.fecha),
    ...cultivo.consumoSemanal.map((item) => item.fecha || ''),
  ];
  const years = Array.from(new Set(
    dates
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => date.getFullYear().toString())
  )).sort((a, b) => Number(b) - Number(a));
  return years.length > 0 ? years : [new Date().getFullYear().toString()];
};

export default function DashboardClient({ 
  cultivos,
  catalogPlantas = [],
  fuentesAgua = [],
  regiones = []
}: { 
  cultivos: CultivoData[];
  catalogPlantas?: any[];
  fuentesAgua?: any[];
  regiones?: any[];
}) {
  const router = useRouter();
  const [localCultivos, setLocalCultivos] = useState<CultivoData[]>(cultivos);
  const [selectedId, setSelectedId] = useState<string>(cultivos.length > 0 ? cultivos[0].idCultivo.toString() : "");
  const [isPending, startTransition] = useTransition();
  const [timeLeft, setTimeLeft] = useState(DASHBOARD_REFRESH_SECONDS);
  const timeLeftRef = useRef(DASHBOARD_REFRESH_SECONDS);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [weekdayFilter, setWeekdayFilter] = useState<CalendarFilter>('all');
  const [monthFilter, setMonthFilter] = useState<CalendarFilter>('all');
  const [yearFilter, setYearFilter] = useState<CalendarFilter>('all');
  const [filterMode, setFilterMode] = useState<FilterMode>('relative');
  const [dashboardRange, setDashboardRange] = useState<HistoryRange>('6h');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  useEffect(() => {
    setLocalCultivos(cultivos);
    setSelectedId((current) => {
      if (cultivos.length > 0 && !cultivos.some((cultivo) => cultivo.idCultivo.toString() === current)) {
        return cultivos[0].idCultivo.toString();
      }
      return current;
    });
  }, [cultivos]);

  useEffect(() => {
    setIsClientMounted(true);

    const interval = setInterval(() => {
      const activeCrop = localCultivos.find((c) => c.idCultivo.toString() === selectedId) || localCultivos[0] || null;
      if (!hasActiveCollector(activeCrop)) {
        if (timeLeftRef.current !== DASHBOARD_REFRESH_SECONDS) {
          timeLeftRef.current = DASHBOARD_REFRESH_SECONDS;
          setTimeLeft(DASHBOARD_REFRESH_SECONDS);
        }
        return;
      }

      if (timeLeftRef.current <= 1) {
        timeLeftRef.current = DASHBOARD_REFRESH_SECONDS;
        setTimeLeft(DASHBOARD_REFRESH_SECONDS);
        router.refresh();
        return;
      }

      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, [localCultivos, router, selectedId]);

  useEffect(() => {
    if (filterMode === 'calendar') return;
    if (dashboardRange !== '7d') {
      setWeekdayFilter('all');
    }
    setMonthFilter('all');
    setYearFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
  }, [dashboardRange, filterMode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Local state for water sources to update dropdown dynamically without full reload
  const [localFuentesAgua, setLocalFuentesAgua] = useState<any[]>(fuentesAgua);

  // Water source creation states
  const [isOpenRegisterWaterSource, setIsOpenRegisterWaterSource] = useState(false);
  const [newWaterSourceName, setNewWaterSourceName] = useState("");
  const [newWaterSourceTipo, setNewWaterSourceTipo] = useState("tanque"); // 'tanque' or 'manguera'
  const [newWaterSourceCapacidad, setNewWaterSourceCapacidad] = useState("");
  const [newWaterSourceAltura, setNewWaterSourceAltura] = useState("");
  const [newWaterSourceAlturaSeguridad, setNewWaterSourceAlturaSeguridad] = useState("10"); // default 10 cm

  // Crop creation states
  const [isOpenRegisterCrop, setIsOpenRegisterCrop] = useState(false);
  const [newCropNombrePlanta, setNewCropNombrePlanta] = useState("");
  const [newCropIdPlanta, setNewCropIdPlanta] = useState("");
  const [newCropIdFuenteAgua, setNewCropIdFuenteAgua] = useState("");
  const [newCropLugar, setNewCropLugar] = useState("");
  const [newCropEtapaCrecimiento, setNewCropEtapaCrecimiento] = useState("Crecimiento");
  const [newCropArea, setNewCropArea] = useState("");
  const [newCropFechaSiembra, setNewCropFechaSiembra] = useState("");
  const [newCropIdRegion, setNewCropIdRegion] = useState("");
  const [newCropIdProvincia, setNewCropIdProvincia] = useState("");
  const [newCropIdDistrito, setNewCropIdDistrito] = useState("");
  const [isOpenSuccessCrop, setIsOpenSuccessCrop] = useState(false);
  const [successCropName, setSuccessCropName] = useState("");

  const [localProvincias, setLocalProvincias] = useState<any[]>([]);
  const [localDistritos, setLocalDistritos] = useState<any[]>([]);

  // Load provinces dynamically when region changes
  useEffect(() => {
    if (!newCropIdRegion) {
      setLocalProvincias([]);
      return;
    }
    const regionId = parseInt(newCropIdRegion, 10);
    if (isNaN(regionId)) return;

    startTransition(async () => {
      try {
        const data = await listarProvincias(regionId);
        setLocalProvincias(data);
      } catch (err) {
        console.error("Error al cargar provincias:", err);
      }
    });
  }, [newCropIdRegion]);

  // Load distritos dynamically when provincia changes
  useEffect(() => {
    if (!newCropIdProvincia) {
      setLocalDistritos([]);
      return;
    }
    const provinciaId = parseInt(newCropIdProvincia, 10);
    if (isNaN(provinciaId)) return;

    startTransition(async () => {
      try {
        const data = await listarDistritos(provinciaId);
        setLocalDistritos(data);
      } catch (err) {
        console.error("Error al cargar distritos:", err);
      }
    });
  }, [newCropIdProvincia]);

  const filteredProvincias = localProvincias;
  const filteredDistritos = localDistritos;

  const resetCropForm = () => {
    setNewCropNombrePlanta("");
    setNewCropIdPlanta("");
    setNewCropIdFuenteAgua("");
    setNewCropLugar("");
    setNewCropEtapaCrecimiento("Crecimiento");
    setNewCropArea("");
    setNewCropFechaSiembra("");
    setNewCropIdRegion("");
    setNewCropIdProvincia("");
    setNewCropIdDistrito("");
  };

  const getCropValidationErrors = () => {
    const errors: string[] = [];
    const area = Number(newCropArea);

    if (!newCropNombrePlanta.trim()) errors.push("nombre del cultivo");
    if (!newCropIdPlanta) errors.push("especie botánica");
    if (!newCropIdFuenteAgua) errors.push("fuente de agua");
    if (!newCropIdRegion) errors.push("departamento");
    if (!newCropIdProvincia) errors.push("provincia");
    if (!newCropIdDistrito) errors.push("distrito");
    if (!newCropLugar.trim()) errors.push("lugar o parcela");
    if (!newCropEtapaCrecimiento) errors.push("etapa de crecimiento");
    if (!newCropArea || Number.isNaN(area) || area <= 0) errors.push("área válida");
    if (!newCropFechaSiembra) errors.push("fecha de siembra");

    return errors;
  };

  const buildLocalCultivo = (res: any, payload: { nombre_planta: string; etapa_crecimiento?: string }) => {
    const selectedPlant = catalogPlantas.find((planta: any) => planta.id?.toString() === newCropIdPlanta);
    const idCultivo = getCreatedCropId(res);

    return {
      idCultivo,
      nombreCultivo: res.nombreCultivo ?? res.nombre_planta ?? payload.nombre_planta,
      conceptoPlanta: res.conceptoPlanta ?? res.planta?.nombre ?? selectedPlant?.nombre ?? "Cultivo",
      etapaCrecimiento: res.etapaCrecimiento ?? res.etapa_crecimiento ?? payload.etapa_crecimiento ?? null,
      sensores: {
        humedadSuelo: null,
        humedadAmbiente: null,
        temperaturaSuelo: null,
        temperaturaAmbiente: null,
      },
      historialSensores: {
        humedadSuelo: [],
        humedadAmbiente: [],
        temperaturaSuelo: [],
        temperaturaAmbiente: [],
      },
      dispositivos: [],
      tanque: null,
      consumoSemanal: [],
      limiteConsumo: null,
      resumenDia: {
        riegosHoy: 0,
        litrosHoy: 0,
        ultimoRiego: null,
        humedadSueloProm: null,
        humedadAmbiental: null,
      },
    } satisfies CultivoData;
  };

  const handleRegisterWaterSourceSubmit = async () => {
    if (!newWaterSourceName) {
      alert("Por favor ingrese un nombre para la fuente de agua.");
      return;
    }
    if (newWaterSourceTipo === 'tanque') {
      if (!newWaterSourceCapacidad || !newWaterSourceAltura) {
        alert("Para un tanque, la capacidad y la altura total son obligatorias.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const payload = {
          nombre: newWaterSourceName,
          tipo: newWaterSourceTipo,
          capacidad_litros: newWaterSourceTipo === 'tanque' ? parseFloat(newWaterSourceCapacidad) : undefined,
          altura_tanque_cm: newWaterSourceTipo === 'tanque' ? parseFloat(newWaterSourceAltura) : undefined,
          altura_seguridad_cm: newWaterSourceAlturaSeguridad ? parseFloat(newWaterSourceAlturaSeguridad) : undefined
        };

        const res = await registrarFuenteAgua(payload);
        if (res.id) {
          alert(`Fuente de agua '${newWaterSourceName}' registrada correctamente.`);
          
          // Add to local state
          const newSource = {
            id: res.id,
            nombre: res.nombre,
            tipo: res.tipo,
            capacidad_litros: res.capacidad_litros,
            altura_tanque_cm: res.altura_tanque_cm,
            altura_seguridad_cm: res.altura_seguridad_cm
          };
          setLocalFuentesAgua(prev => [...prev, newSource]);
          
          // Auto select the new water source in crop registration modal if it is open
          setNewCropIdFuenteAgua(res.id.toString());

          // Reset fields and close
          setIsOpenRegisterWaterSource(false);
          setNewWaterSourceName("");
          setNewWaterSourceTipo("tanque");
          setNewWaterSourceCapacidad("");
          setNewWaterSourceAltura("");
          setNewWaterSourceAlturaSeguridad("10");
        }
      } catch (err: any) {
        alert(`Error al registrar la fuente de agua: ${err.message}`);
      }
    });
  };

  const handleRegisterCropSubmit = async () => {
    const validationErrors = getCropValidationErrors();
    if (validationErrors.length > 0) {
      alert(`Complete los datos obligatorios: ${validationErrors.join(", ")}.`);
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          nombre_planta: newCropNombrePlanta.trim(),
          id_planta: parseInt(newCropIdPlanta, 10),
          id_fuente_agua: parseInt(newCropIdFuenteAgua, 10),
          id_distrito: parseInt(newCropIdDistrito, 10),
          lugar: newCropLugar.trim(),
          etapa_crecimiento: newCropEtapaCrecimiento,
          area_m2: parseFloat(newCropArea),
          fecha_siembra: newCropFechaSiembra
        };
        const res = await registrarCultivo(payload);
        const createdCropId = getCreatedCropId(res);
        if (createdCropId) {
          const registeredCropName = newCropNombrePlanta.trim();
          const localCultivo = buildLocalCultivo(res, payload);
          setLocalCultivos((prev) => [...prev.filter((cultivo) => cultivo.idCultivo !== localCultivo.idCultivo), localCultivo]);
          setSelectedId(localCultivo.idCultivo.toString());
          setSuccessCropName(registeredCropName);
          setIsOpenSuccessCrop(true);
          setIsOpenRegisterCrop(false);
          resetCropForm();
          router.refresh();
        }
      } catch (err: any) {
        alert(`Error al registrar cultivo: ${err.message}`);
      }
    });
  };

  const renderSuccessCropDialog = () => (
    <Dialog.Root
      open={isOpenSuccessCrop}
      onOpenChange={setIsOpenSuccessCrop}
    >
      <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 400, background: '#1f2937', border: '1px solid #2d3748', textAlign: 'center' }}>
        <Dialog.Title style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          🌱 ¡Cultivo Registrado!
        </Dialog.Title>
        <Text size="2" color="gray" mb="4" style={{ display: 'block', marginTop: '8px' }}>
          El cultivo "{successCropName}" se ha registrado correctamente en la plataforma.
        </Text>
        <Flex gap="3" justify="center" mt="5">
          <Button color="blue" style={{ cursor: 'pointer' }} onClick={() => {
            setIsOpenSuccessCrop(false);
            router.push('/dashboard/agricultor/control');
          }}>
            Configurar Umbrales
          </Button>
          <Dialog.Close>
            <Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>
              Cerrar
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );

  const renderRegisterCropDialog = () => (
    <Dialog.Root
      open={isOpenRegisterCrop}
      onOpenChange={(open) => {
        setIsOpenRegisterCrop(open);
        if (!open) resetCropForm();
      }}
    >
      <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 480, background: '#1f2937', border: '1px solid #2d3748' }}>
        <Dialog.Title style={{ color: 'white' }}>Registrar Nuevo Cultivo</Dialog.Title>
        <Text size="2" color="gray" mb="4">
          Ingrese los detalles del nuevo cultivo para comenzar el monitoreo y control inteligente.
        </Text>

        <Flex direction="column" gap="3" mt="3">
          <label><Text color="gray" size="2">Nombre del Cultivo *</Text></label>
          <TextField.Root 
            placeholder="Ej: Tomates de Parcela Norte" 
            value={newCropNombrePlanta}
            onChange={(e) => setNewCropNombrePlanta(e.target.value)}
            style={{ background: '#111827', color: 'white' }}
          />

          <label><Text color="gray" size="2">Especie Botánica *</Text></label>
          <SearchableSelect
            value={newCropIdPlanta}
            onValueChange={setNewCropIdPlanta}
            placeholder="Elegir especie..."
            searchPlaceholder="Buscar especie..."
            options={catalogPlantas.map((p: any) => ({ value: p.id.toString(), label: `${p.nombre} (${p.tipo || 'Sin tipo'})` }))}
          />

          <label><Text color="gray" size="2">Fuente de Agua *</Text></label>
          {localFuentesAgua.length === 0 ? (
            <Flex direction="column" gap="2" p="3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
              <Text size="1" color="red">No tienes fuentes de agua registradas. Necesitas al menos una para registrar tu cultivo.</Text>
              <Button size="2" color="blue" variant="soft" style={{ cursor: 'pointer' }} onClick={() => setIsOpenRegisterWaterSource(true)}>
                + Registrar Fuente de Agua
              </Button>
            </Flex>
          ) : (
            <Flex gap="2" align="center">
              <Box style={{ flexGrow: 1 }}>
                <SearchableSelect
                  value={newCropIdFuenteAgua}
                  onValueChange={setNewCropIdFuenteAgua}
                  placeholder="Elegir fuente de agua..."
                  searchPlaceholder="Buscar fuente..."
                  options={localFuentesAgua.map((f: any) => ({ value: f.id.toString(), label: `${f.nombre} (${f.tipo === 'tanque' ? 'Tanque' : 'Manguera'})` }))}
                />
              </Box>
              <Button size="2" color="blue" variant="soft" style={{ cursor: 'pointer' }} onClick={() => setIsOpenRegisterWaterSource(true)} title="Registrar nueva fuente de agua">
                +
              </Button>
            </Flex>
          )}

          {/* GEOGRAFÍA JERÁRQUICA */}
          <Grid columns="2" gap="3">
            <Box>
              <label><Text color="gray" size="2">Departamento *</Text></label>
              <SearchableSelect
                value={newCropIdRegion}
                onValueChange={(val) => { setNewCropIdRegion(val); setNewCropIdProvincia(""); setNewCropIdDistrito(""); }}
                placeholder="Región..."
                searchPlaceholder="Buscar región..."
                options={regiones.map((r: any) => ({ value: r.id.toString(), label: r.nombre }))}
              />
            </Box>

            <Box>
              <label><Text color="gray" size="2">Provincia *</Text></label>
              <SearchableSelect
                value={newCropIdProvincia}
                onValueChange={(val) => { setNewCropIdProvincia(val); setNewCropIdDistrito(""); }}
                disabled={!newCropIdRegion}
                placeholder="Provincia..."
                searchPlaceholder="Buscar provincia..."
                options={filteredProvincias.map((p: any) => ({ value: p.id.toString(), label: p.nombre }))}
              />
            </Box>
          </Grid>

          <Grid columns="2" gap="3">
            <Box>
              <label><Text color="gray" size="2">Distrito *</Text></label>
              <SearchableSelect
                value={newCropIdDistrito}
                onValueChange={setNewCropIdDistrito}
                disabled={!newCropIdProvincia}
                placeholder="Distrito..."
                searchPlaceholder="Buscar distrito..."
                options={filteredDistritos.map((d: any) => ({ value: d.id.toString(), label: d.nombre }))}
              />
            </Box>

            <Box>
              <label><Text color="gray" size="2">Lugar / Parcela *</Text></label>
              <TextField.Root 
                placeholder="Ej: Invernadero A" 
                value={newCropLugar}
                onChange={(e) => setNewCropLugar(e.target.value)}
                style={{ background: '#111827', color: 'white' }}
              />
            </Box>
          </Grid>

          <Grid columns="2" gap="3">
            <Box>
              <label><Text color="gray" size="2">Etapa de Crecimiento *</Text></label>
              <SearchableSelect
                value={newCropEtapaCrecimiento}
                onValueChange={setNewCropEtapaCrecimiento}
                options={[
                  { value: "Germinación", label: "Germinación" },
                  { value: "Crecimiento", label: "Crecimiento" },
                  { value: "Floración", label: "Floración" },
                  { value: "Fructificación", label: "Fructificación" },
                  { value: "Cosecha", label: "Cosecha" },
                ]}
              />
            </Box>

            <Box>
              <label><Text color="gray" size="2">Área (m²) *</Text></label>
              <TextField.Root 
                type="number" 
                placeholder="Ej: 120" 
                value={newCropArea}
                onChange={(e) => setNewCropArea(e.target.value)}
                style={{ background: '#111827', color: 'white' }}
              />
            </Box>
          </Grid>

          <Box>
            <label><Text color="gray" size="2">Fecha de Siembra *</Text></label>
            <TextField.Root 
              type="date" 
              value={newCropFechaSiembra}
              onChange={(e) => setNewCropFechaSiembra(e.target.value)}
              style={{ background: '#111827', color: 'white' }}
            />
          </Box>
        </Flex>

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cancelar</Button></Dialog.Close>
          <Button color="green" onClick={handleRegisterCropSubmit} style={{ cursor: 'pointer' }} disabled={isPending}>Registrar Cultivo
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );

  const renderRegisterWaterSourceDialog = () => (
    <Dialog.Root open={isOpenRegisterWaterSource} onOpenChange={setIsOpenRegisterWaterSource}>
      <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: '#1f2937', border: '1px solid #2d3748' }}>
        <Dialog.Title style={{ color: 'white' }}>Registrar Fuente de Agua</Dialog.Title>
        <Text size="2" color="gray" mb="4">
          Configure un nuevo suministro o depósito para el riego de sus cultivos.
        </Text>

        <Flex direction="column" gap="3" mt="3">
          <label><Text color="gray" size="2">Nombre de la Fuente *</Text></label>
          <TextField.Root 
            placeholder="Ej: Tanque Principal de Parcela" 
            value={newWaterSourceName}
            onChange={(e) => setNewWaterSourceName(e.target.value)}
            style={{ background: '#111827', color: 'white' }}
          />

          <label><Text color="gray" size="2">Tipo de Suministro *</Text></label>
          <Select.Root value={newWaterSourceTipo} onValueChange={setNewWaterSourceTipo}>
            <Select.Trigger style={{ background: '#111827', color: 'white' }} />
            <Select.Content>
              <Select.Item value="tanque">Tanque / Reservorio</Select.Item>
              <Select.Item value="manguera">Manguera / Conexión directa (Sin telemetría de volumen)</Select.Item>
            </Select.Content>
          </Select.Root>

          {newWaterSourceTipo === 'tanque' && (
            <>
              <Grid columns="2" gap="3">
                <Box>
                  <label><Text color="gray" size="2">Capacidad (Litros) *</Text></label>
                  <TextField.Root 
                    type="number" 
                    placeholder="Ej: 1000" 
                    value={newWaterSourceCapacidad}
                    onChange={(e) => setNewWaterSourceCapacidad(e.target.value)}
                    style={{ background: '#111827', color: 'white' }}
                  />
                </Box>
                <Box>
                  <label><Text color="gray" size="2">Altura Total (cm) *</Text></label>
                  <TextField.Root 
                    type="number" 
                    placeholder="Ej: 150" 
                    value={newWaterSourceAltura}
                    onChange={(e) => setNewWaterSourceAltura(e.target.value)}
                    style={{ background: '#111827', color: 'white' }}
                  />
                </Box>
              </Grid>
              <label><Text color="gray" size="2">Distancia Sensor a Techo / Seguridad (cm)</Text></label>
              <TextField.Root 
                type="number" 
                placeholder="Ej: 10" 
                value={newWaterSourceAlturaSeguridad}
                onChange={(e) => setNewWaterSourceAlturaSeguridad(e.target.value)}
                style={{ background: '#111827', color: 'white' }}
              />
            </>
          )}
        </Flex>

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cancelar</Button></Dialog.Close>
          <Button color="green" onClick={handleRegisterWaterSourceSubmit} style={{ cursor: 'pointer' }} disabled={!newWaterSourceName}>
            Guardar Fuente
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );

  const hasCrops = localCultivos.length > 0;
  const cultivoActivo = hasCrops ? (localCultivos.find((c) => c.idCultivo.toString() === selectedId) || localCultivos[0]) : null;
  const recolectorActivo = hasActiveCollector(cultivoActivo);
  const isRelativeMode = filterMode === 'relative';
  const canUseWeekday = !isRelativeMode || dashboardRange === '7d';
  const canUseMonthYear = !isRelativeMode;
  const calendarFilters: CalendarFilters = {
    weekday: canUseWeekday ? weekdayFilter : 'all',
    month: canUseMonthYear ? monthFilter : 'all',
    year: canUseMonthYear ? yearFilter : 'all',
    startDate: canUseMonthYear ? startDateFilter : '',
    endDate: canUseMonthYear ? endDateFilter : '',
  };
  const availableYears = getDashboardYears(cultivoActivo);

  // Helper for filtering sensors based on calendar filters
  const getFilteredSensor = (
    sensor: SensorData,
    history: HistoricoPunto[],
    type: 'soil_moisture' | 'env_humidity' | 'env_temp' | 'soil_temp'
  ): SensorData => {
    if (!sensor) return null;
    const hasFilter = calendarFilters.weekday !== 'all' || calendarFilters.month !== 'all' || calendarFilters.year !== 'all';
    if (!hasFilter) return sensor;

    const filteredPoints = history.filter((p) => {
      const date = new Date(p.fecha);
      return dateMatchesCalendarFilters(date, calendarFilters);
    });

    if (filteredPoints.length === 0) {
      return {
        ...sensor,
        valor: 0,
        porcentaje: sensor.porcentaje !== null ? 0 : null,
        ema: null
      };
    }

    const sum = filteredPoints.reduce((acc, p) => acc + p.valor, 0);
    const avgVal = sum / filteredPoints.length;

    let newPorcentaje = sensor.porcentaje;
    if (sensor.porcentaje !== null) {
      if (type === 'soil_moisture' || type === 'env_humidity') {
        newPorcentaje = avgVal;
      } else {
        newPorcentaje = (sensor.porcentaje / (sensor.valor || 1)) * avgVal;
      }
    }

    return {
      ...sensor,
      valor: avgVal,
      porcentaje: newPorcentaje,
      ema: null
    };
  };

  // Helper for filtering resume data based on calendar filters
  const getFilteredResumen = (): ResumenDiaData => {
    if (!cultivoActivo) return { riegosHoy: 0, litrosHoy: 0, ultimoRiego: null, humedadSueloProm: null, humedadAmbiental: null };
    const resumen = cultivoActivo.resumenDia;
    const hasFilter = calendarFilters.weekday !== 'all' || calendarFilters.month !== 'all' || calendarFilters.year !== 'all';
    if (!hasFilter) return resumen;

    const hsFiltered = cultivoActivo.historialSensores.humedadSuelo.filter((p) =>
      dateMatchesCalendarFilters(new Date(p.fecha), calendarFilters)
    );
    const avgHS = hsFiltered.length > 0 ? hsFiltered.reduce((acc, p) => acc + p.valor, 0) / hsFiltered.length : null;

    const haFiltered = cultivoActivo.historialSensores.humedadAmbiente.filter((p) =>
      dateMatchesCalendarFilters(new Date(p.fecha), calendarFilters)
    );
    const avgHA = haFiltered.length > 0 ? haFiltered.reduce((acc, p) => acc + p.valor, 0) / haFiltered.length : null;

    const consumoFiltered = cultivoActivo.consumoSemanal.filter((c) =>
      c.fecha && dateMatchesCalendarFilters(new Date(c.fecha), calendarFilters)
    );
    const avgLitros = consumoFiltered.length > 0 ? consumoFiltered.reduce((acc, c) => acc + c.valor, 0) / consumoFiltered.length : 0;

    const ultimoRiegoMatches = resumen.ultimoRiego && dateMatchesCalendarFilters(new Date(resumen.ultimoRiego), calendarFilters);

    return {
      riegosHoy: 0,
      litrosHoy: Math.round(avgLitros * 10) / 10,
      ultimoRiego: ultimoRiegoMatches ? resumen.ultimoRiego : null,
      humedadSueloProm: avgHS,
      humedadAmbiental: avgHA
    };
  };

  const filteredResumen = getFilteredResumen();
  const hasActiveFilter = calendarFilters.weekday !== 'all' || calendarFilters.month !== 'all' || calendarFilters.year !== 'all' || Boolean(calendarFilters.startDate || calendarFilters.endDate);

  // --- RENDER PRINCIPAL ---
  return (
    <Box style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s', width: '100%' }}>
      {!hasCrops ? (
        <Flex direction="column" align="center" justify="center" p="6" style={{ minHeight: '60vh', width: '100%' }}>
          <NoCropsEmptyState 
            title="No tienes cultivos registrados"
            description="Comienza registrando tu primer cultivo para monitorear sus condiciones de humedad, temperatura, y automatizar su riego inteligente."
            onAction={() => setIsOpenRegisterCrop(true)}
          />
        </Flex>
      ) : (
        cultivoActivo && (
          <Flex direction="column" gap="5">
            {/* HEADER: Título y Selector alineado a la estética del Dashboard */}
            <Flex justify="between" align="center" mb="6" wrap="wrap" gap="3">
              <Box>
                <Text size="6" weight="bold" color="indigo" as="div" mb="1">Dashboard</Text>
                <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
                  {cultivoActivo.nombreCultivo} · {cultivoActivo.conceptoPlanta} {cultivoActivo.etapaCrecimiento ? `· Fase ${cultivoActivo.etapaCrecimiento.toLowerCase()}` : ''}
                </Text>
              </Box>
              <Flex direction="column" gap="2" align="end">
                <Flex gap="3" align="center" wrap="wrap">
                  {/* Live indicator badge */}
                  <Flex align="center" gap="2" style={{
                    background: recolectorActivo ? 'var(--greenbg)' : 'rgba(107, 114, 128, 0.12)',
                    color: recolectorActivo ? 'var(--green)' : '#9ca3af',
                    border: `1px solid ${recolectorActivo ? 'var(--greenbrd)' : 'rgba(156, 163, 175, 0.25)'}`,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 500,
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: recolectorActivo ? 'var(--green)' : '#6b7280',
                      animation: recolectorActivo ? 'pulse 2s infinite' : 'none'
                    }} />
                    {recolectorActivo ? 'En vivo' : 'Recolector inactivo'}
                  </Flex>
                  <div style={{
                    background: 'rgba(56,189,248,0.1)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56,189,248,0.25)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 500,
                  }}>
                     {recolectorActivo ? formatTime(timeLeft) : 'Pausado'}
                  </div>

                  <Button color="blue" onClick={() => setIsOpenRegisterWaterSource(true)} style={{ cursor: 'pointer' }}>
                    Y Registrar Fuente
                  </Button>
                  <Button color="green" onClick={() => setIsOpenRegisterCrop(true)} style={{ cursor: 'pointer' }}>Registrar Cultivo
                  </Button>
                </Flex>
                <SearchableSelect
                  value={selectedId}
                  onValueChange={setSelectedId}
                  placeholder="Seleccionar cultivo"
                  searchPlaceholder="Buscar cultivo..."
                  style={{ width: '100%', height: '32px', background: '#111827', borderColor: '#1f2937' }}
                  options={localCultivos.map((c) => ({ value: c.idCultivo.toString(), label: c.nombreCultivo }))}
                />
              </Flex>
            </Flex>

            {/* FILTROS GLOBALES DE CALENDARIO */}
            <Flex gap="3" wrap="wrap" mb="2" style={{ background: '#111827', padding: '12px 16px', borderRadius: '12px', border: '1px solid #1f2937' }} align="center">
              <Text size="2" color="gray" weight="medium">Modo de tiempo:</Text>

              <Flex gap="2" style={{ background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                <Button size="1" variant={filterMode === 'relative' ? 'solid' : 'ghost'} color="green" onClick={() => setFilterMode('relative')} style={{ cursor: 'pointer' }}>
                  Reciente
                </Button>
                <Button size="1" variant={filterMode === 'calendar' ? 'solid' : 'ghost'} color="blue" onClick={() => setFilterMode('calendar')} style={{ cursor: 'pointer' }}>
                  Calendario
                </Button>
              </Flex>

              <Flex gap="2" style={{ background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                {(['6h', '24h', '7d'] as HistoryRange[]).map((range) => (
                  <Button
                    key={range}
                    size="1"
                    variant={dashboardRange === range ? 'solid' : 'ghost'}
                    color="green"
                    disabled={!isRelativeMode}
                    onClick={() => setDashboardRange(range)}
                    style={{ cursor: isRelativeMode ? 'pointer' : 'default', opacity: isRelativeMode ? 1 : 0.45 }}
                  >
                    {range}
                  </Button>
                ))}
              </Flex>
              
              {false && <Select.Root value={weekdayFilter} onValueChange={setWeekdayFilter} disabled={!canUseWeekday}>
                <Select.Trigger style={{ background: '#0f172a', color: canUseWeekday ? 'white' : '#6b7280', opacity: canUseWeekday ? 1 : 0.55, borderColor: '#1f2937', minWidth: 145 }} />
                <Select.Content>
                  {WEEKDAY_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>}

              {false && <Select.Root value={monthFilter} onValueChange={setMonthFilter} disabled={!canUseMonthYear}>
                <Select.Trigger style={{ background: '#0f172a', color: canUseMonthYear ? 'white' : '#6b7280', opacity: canUseMonthYear ? 1 : 0.55, borderColor: '#1f2937', minWidth: 155 }} />
                <Select.Content>
                  {MONTH_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>}

              {false && <Select.Root value={yearFilter} onValueChange={setYearFilter} disabled={!canUseMonthYear}>
                <Select.Trigger style={{ background: '#0f172a', color: canUseMonthYear ? 'white' : '#6b7280', opacity: canUseMonthYear ? 1 : 0.55, borderColor: '#1f2937', minWidth: 110 }} />
                <Select.Content>
                  <Select.Item value="all">Todos los años</Select.Item>
                  {(availableYears.length > 0 ? availableYears : [new Date().getFullYear().toString()]).map((year) => (
                    <Select.Item key={year} value={year}>{year}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>}
              
              <TextField.Root type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} disabled={!canUseMonthYear} style={{ background: '#0f172a', color: canUseMonthYear ? 'white' : '#6b7280', opacity: canUseMonthYear ? 1 : 0.55, borderColor: '#1f2937' }} />
              <TextField.Root type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} disabled={!canUseMonthYear} style={{ background: '#0f172a', color: canUseMonthYear ? 'white' : '#6b7280', opacity: canUseMonthYear ? 1 : 0.55, borderColor: '#1f2937' }} />

              {hasActiveFilter && (
                <Button size="1" color="red" variant="soft" onClick={() => { setWeekdayFilter('all'); setMonthFilter('all'); setYearFilter('all'); setStartDateFilter(''); setEndDateFilter(''); }} style={{ cursor: 'pointer', marginLeft: 'auto' }}>
                  Limpiar filtros
                </Button>
              )}
              <Text size="1" color="gray" style={{ fontFamily: 'monospace', marginLeft: 'auto' }}>
                {filterMode === 'relative'
                  ? (dashboardRange === '7d' ? 'En 7d solo se habilita dia de semana.' : 'Calendario deshabilitado en rangos cortos.')
                  : 'Mes, anio y dia habilitados para historico.'}
              </Text>
            </Flex>

            {/* ROW 1: Cuadrícula de Sensores Principales */}
            <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4">
              <SensorCard sensor={getFilteredSensor(cultivoActivo.sensores.humedadSuelo, cultivoActivo.historialSensores.humedadSuelo, 'soil_moisture')} type="soil_moisture" />
              <SensorCard sensor={getFilteredSensor(cultivoActivo.sensores.humedadAmbiente, cultivoActivo.historialSensores.humedadAmbiente, 'env_humidity')} type="env_humidity" />
              <SensorCard sensor={getFilteredSensor(cultivoActivo.sensores.temperaturaAmbiente, cultivoActivo.historialSensores.temperaturaAmbiente, 'env_temp')} type="env_temp" />
              <SensorCard sensor={getFilteredSensor(cultivoActivo.sensores.temperaturaSuelo, cultivoActivo.historialSensores.temperaturaSuelo, 'soil_temp')} type="soil_temp" />
            </Grid>

            {/* ROW 2: Gráfico Histórico (2/3) + Estado y Tanque (1/3) */}
            <Flex direction={{ initial: 'column', lg: 'row' }} gap="4">
              <Box style={{ flex: 2, minWidth: 0 }}>
                <HistoricoSensoresCard 
                  historial={cultivoActivo.historialSensores} 
                  sensores={cultivoActivo.sensores} 
                  isClientMounted={isClientMounted} 
                  timeRange={dashboardRange}
                  calendarFilters={calendarFilters}
                  cultivoTimezone={cultivoActivo.zonaHoraria}
                />
              </Box>
              <Flex direction="column" gap="4" style={{ flex: 1, minWidth: 0 }}>
                <EstadoSistemaCard dispositivos={cultivoActivo.dispositivos} />
                {cultivoActivo.tanque && <TanqueCard tanque={cultivoActivo.tanque} />}
              </Flex>
            </Flex>

            {/* ROW 3: Gráfico Consumo Semanal (2/3) + Resumen Diario (1/3) */}
            <Flex direction={{ initial: 'column', lg: 'row' }} gap="4">
              <Box style={{ flex: 2, minWidth: 0 }}>
                {cultivoActivo.consumoSemanal && (
                  <ConsumoChartCard 
                    data={cultivoActivo.consumoSemanal} 
                    limite={cultivoActivo.limiteConsumo} 
                    isClientMounted={isClientMounted} 
                    timeRange={dashboardRange}
                    calendarFilters={calendarFilters}
                    cultivoTimezone={cultivoActivo.zonaHoraria}
                  />
                )}
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <ResumenDiaCard 
                  resumen={filteredResumen} 
                  sensores={{
                    humedadSuelo: getFilteredSensor(cultivoActivo.sensores.humedadSuelo, cultivoActivo.historialSensores.humedadSuelo, 'soil_moisture'),
                    humedadAmbiente: getFilteredSensor(cultivoActivo.sensores.humedadAmbiente, cultivoActivo.historialSensores.humedadAmbiente, 'env_humidity'),
                    temperaturaAmbiente: getFilteredSensor(cultivoActivo.sensores.temperaturaAmbiente, cultivoActivo.historialSensores.temperaturaAmbiente, 'env_temp'),
                    temperaturaSuelo: getFilteredSensor(cultivoActivo.sensores.temperaturaSuelo, cultivoActivo.historialSensores.temperaturaSuelo, 'soil_temp')
                  }} 
                  isClientMounted={isClientMounted} 
                  hasFilter={hasActiveFilter}
                />
              </Box>
            </Flex>
          </Flex>
        )
      )}

      {/* DIALOGO DE REGISTRO DE CULTIVO Y FUENTE DE AGUA */}
      {renderRegisterCropDialog()}
      {renderSuccessCropDialog()}
      {renderRegisterWaterSourceDialog()}
    </Box>
  );

}

// ==========================================
// SUB-COMPONENTES EXTRAÍDOS AL ÁMBITO GLOBAL
// ==========================================

// --- HELPER: TIEMPO TRANSCURRIDO ---
const getTimeAgo = (date: Date | null) => {
  if (!date) return 'Sin datos';
  const diffMins = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
  if (diffMins < 1) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h ${diffMins % 60 > 0 ? `${diffMins % 60}min` : ''}`;
  return `hace ${Math.floor(diffHours / 24)} día(s)`;
};

// --- SUB-COMPONENTE: TARJETA DE SENSOR ---
const SensorCard = ({ sensor, type }: { sensor: SensorData; type: 'soil_moisture' | 'env_humidity' | 'env_temp' | 'soil_temp' }) => {
  if (!sensor) return <Card size="2" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)', borderRadius: '16px' }}><Text size="3" color="gray">Sensor sin datos</Text></Card>;

  const metricNameMap = {
    soil_moisture: 'Humedad de Suelo',
    env_humidity: 'Humedad del Ambiente',
    env_temp: 'Temperatura del Ambiente',
    soil_temp: 'Temperatura de Suelo'
  };

  const metricUnitMap = {
    soil_moisture: '%',
    env_humidity: '%',
    env_temp: '°C',
    soil_temp: '°C'
  };

  const metricaNombre = metricNameMap[type];
  const metricaUnidad = metricUnitMap[type];

  const formatObjetivo = () => {
    if (!sensor.umbral || (sensor.umbral.min === null && sensor.umbral.max === null)) return 'No definido';
    if (sensor.umbral.min !== null && sensor.umbral.max !== null) return `${sensor.umbral.min} - ${sensor.umbral.max}${metricaUnidad}`;
    if (sensor.umbral.min !== null) return `Mín. ${sensor.umbral.min}${metricaUnidad}`;
    return `Máx. ${sensor.umbral.max}${metricaUnidad}`;
  };

  const fuera = sensor.umbral && (
    (sensor.umbral.min !== null && sensor.valor < sensor.umbral.min) ||
    (sensor.umbral.max !== null && sensor.valor > sensor.umbral.max)
  );

  const themeMap = {
    soil_moisture: { border: 'var(--greenbrd)', color: 'var(--green)', bg: 'var(--greenbg)' },
    env_humidity: { border: 'var(--tealbrd)', color: 'var(--teal)', bg: 'var(--tealbg)' },
    env_temp: { border: 'var(--amberbrd)', color: 'var(--amber)', bg: 'var(--amberbg)' },
    soil_temp: { border: 'var(--bluebrd)', color: 'var(--blue)', bg: 'var(--bluebg)' }
  };

  const theme = themeMap[type];
  const cardBorder = fuera ? 'var(--redbrd)' : theme.border;
  const valueColor = fuera ? 'var(--red)' : theme.color;

  return (
    <Card size="2" style={{ background: '#131a1f', border: `1px solid ${cardBorder}`, borderRadius: '16px' }}>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>{sensor.modelo}</Text>
          <Badge color={fuera ? "red" : "green"} variant="soft">{fuera ? "Fuera de rango" : "Óptimo"}</Badge>
        </Flex>
        
        <Box>
          <Text size="2" color="gray" mb="1" as="div" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{metricaNombre}</Text>
          <Flex align="baseline" gap="1">
            <Text size="8" weight="bold" style={{ color: valueColor }}>{sensor.valor.toFixed(1)}</Text>
            <Text size="4" style={{ color: valueColor }} weight="medium">{metricaUnidad}</Text>
          </Flex>
        </Box>

        <Box mt="2">
          <Text size="1" color="gray" mb="2" as="div" style={{ fontFamily: 'monospace' }}>
            Objetivo: {formatObjetivo()}
          </Text>
          {sensor.porcentaje !== null && (
            <div style={{ height: '4px', background: 'var(--dim-mockup)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(Math.max(sensor.porcentaje, 0), 100)}%`, background: valueColor, borderRadius: '2px' }} />
            </div>
          )}
        </Box>
      </Flex>
    </Card>
  );
};

// --- SUB-COMPONENTE: GRÁFICO HISTÓRICO ---
const HistoricoSensoresCard = ({ 
  historial, 
  sensores, 
  isClientMounted, 
  timeRange,
  calendarFilters,
  cultivoTimezone,
}: { 
  historial: HistorialData; 
  sensores: any; 
  isClientMounted: boolean; 
  timeRange: HistoryRange;
  calendarFilters: CalendarFilters;
  cultivoTimezone?: string;
}) => {
  const [activeMetric, setActiveMetric] = useState<'humedadSuelo' | 'humedadAmbiente' | 'temperaturaSuelo' | 'temperaturaAmbiente'>('humedadSuelo');

  const metricConfig = {
    humedadSuelo: { title: 'Humedad del suelo', color: '#22c55e', key: 'humedadSuelo', isPercentage: true, umbralRef: 'min' },
    humedadAmbiente: { title: 'Humedad ambiente', color: '#3b82f6', key: 'humedadAmbiente', isPercentage: true, umbralRef: 'max' },
    temperaturaSuelo: { title: 'Temperatura suelo', color: '#f97316', key: 'temperaturaSuelo', isPercentage: false, umbralRef: 'max' },
    temperaturaAmbiente: { title: 'Temperatura ambiente', color: '#ef4444', key: 'temperaturaAmbiente', isPercentage: false, umbralRef: 'max' }
  };
  
  const config = metricConfig[activeMetric];
  const rawData = historial[activeMetric as keyof HistorialData];
  const sensorInfo = sensores[activeMetric as keyof typeof sensores];
  const chartTimeZone = cultivoTimezone || DEFAULT_DASHBOARD_TIME_ZONE;

  const calendarFilteredData = rawData.filter((item) => {
    const date = new Date(item.fecha);
    return dateMatchesCalendarFilters(date, calendarFilters);
  });

  const filterDataByTime = (data: HistoricoPunto[], range: HistoryRange) => {
    if (data.length === 0) return [];
    const now = new Date().getTime();
    const limits = { '6h': 6 * 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000 };
    const cutoff = now - limits[range];
    
    return data.filter(d => new Date(d.fecha).getTime() >= cutoff).map(d => {
      const dateObj = new Date(d.fecha);
      const xLabel = range === '7d' 
        ? dateObj.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', timeZone: chartTimeZone })
        : dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: chartTimeZone });
      return { ...d, xLabel, valorReal: d.valor };
    });
  };

  const resolveRange = () => {
    const ranges: HistoryRange[] = timeRange === '6h' ? ['6h', '24h', '7d'] : timeRange === '24h' ? ['24h', '7d'] : ['7d'];
    return ranges.find((range) => filterDataByTime(calendarFilteredData, range).length > 0) || timeRange;
  };

  const effectiveRange = resolveRange();
  const chartData = filterDataByTime(calendarFilteredData, effectiveRange);
  const umbralVisual = sensorInfo?.umbral ? sensorInfo.umbral[config.umbralRef] : null;

  return (
    <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', height: '100%' }}>
      <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
        <Flex gap="3" align="center">
          <Select.Root value={activeMetric} onValueChange={(val: any) => setActiveMetric(val)}>
            <Select.Trigger style={{ background: 'transparent', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', border: 'none', padding: 0 }} />
            <Select.Content>
              <Select.Item value="humedadSuelo">Humedad del suelo</Select.Item>
              <Select.Item value="humedadAmbiente">Humedad ambiente</Select.Item>
              <Select.Item value="temperaturaSuelo">Temperatura suelo</Select.Item>
              <Select.Item value="temperaturaAmbiente">Temperatura ambiente</Select.Item>
            </Select.Content>
          </Select.Root>
          <Text size="3" color="gray">— últimas {effectiveRange}</Text>
        </Flex>
      </Flex>

      {/* Filtros movidos al nivel de página principal */}

      {effectiveRange !== timeRange && (
        <Text size="1" color="gray" mb="3" as="div" style={{ fontFamily: 'monospace' }}>
          Sin datos en {timeRange}; mostrando {effectiveRange}.
        </Text>
      )}

      {chartData.length === 0 ? (
        <Flex align="center" justify="center" style={{ height: '250px' }}>
          <Text color="gray">No hay datos históricos en este rango de tiempo.</Text>
        </Flex>
      ) : !isClientMounted ? (
        <Flex align="center" justify="center" style={{ height: '250px' }}>
          <Text color="gray">Cargando gráfico...</Text>
        </Flex>
      ) : (
        <Box style={{ width: '100%', minWidth: 0, height: '250px' }}>
          <ResponsiveContainer width="100%" height={250} minWidth={0}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="xLabel" stroke="#4b5563" fontSize={12} tickMargin={10} minTickGap={20} />
              <YAxis stroke="#4b5563" fontSize={12} domain={config.isPercentage ? [0, 100] : ['auto', 'auto']} tickFormatter={(val) => `${val}${config.isPercentage ? '%' : '°'}`} />
              <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} labelStyle={{ color: '#9ca3af', marginBottom: '4px' }} formatter={(value: any) => [`${value}${config.isPercentage ? '%' : '°C'}`, config.title]} />
              {umbralVisual !== null && (
                <ReferenceLine y={umbralVisual} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: `${config.umbralRef === 'min' ? 'mín' : 'máx'} ${umbralVisual}${config.isPercentage ? '%' : '°'}`, fill: '#ef4444', fontSize: 12 }} />
              )}
              <Line type="monotone" dataKey="valorReal" stroke={config.color} strokeWidth={3} dot={false} activeDot={{ r: 6, fill: config.color, stroke: '#111827', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Card>
  );
};

// --- SUB-COMPONENTE: ESTADO DEL SISTEMA ---
const EstadoSistemaCard = ({ dispositivos }: { dispositivos: DispositivoData[] }) => {
  return (
    <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
      <Flex justify="between" align="center" mb="3">
        <Text size="3" weight="bold" color="indigo">
          Estado del sistema
        </Text>
        <Badge color="indigo" variant="soft" style={{ borderRadius: '6px' }}>
          {dispositivos.length} {dispositivos.length === 1 ? 'dispositivo' : 'dispositivos'}
        </Badge>
      </Flex>
      {dispositivos.length === 0 ? (
        <Text color="gray" size="2">No hay dispositivos asignados.</Text>
      ) : (
        <ScrollArea type="auto" style={{ maxHeight: '110px', paddingRight: '4px' }}>
          <Flex direction="column" gap="2.5">
            {dispositivos.map((disp, index) => {
              const isOnline = disp.estado === 'activo' || disp.funcionamientoActivo === true;
              return (
                <Flex key={disp.id} justify="between" align="center" style={{ borderBottom: index !== dispositivos.length - 1 ? '1px solid #1f2937' : 'none', paddingBottom: index !== dispositivos.length - 1 ? '10px' : '0' }}>
                  <Flex align="center" gap="3">
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444', boxShadow: isOnline ? '0 0 8px #22c55e' : '0 0 8px #ef4444' }} />
                    <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>{disp.nombre}</Text>
                  </Flex>
                  <Text size="2" style={{ color: isOnline ? '#22c55e' : '#ef4444', fontFamily: 'monospace' }}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        </ScrollArea>
      )}
    </Card>
  );
};

// --- SUB-COMPONENTE: TARJETA DEL TANQUE ---
const TanqueCard = ({ tanque }: { tanque: TanqueData }) => {
  const [bombaActiva, setBombaActiva] = useState(tanque?.bombaEncendida || false);
  
  useEffect(() => {
    if (tanque) {
      setBombaActiva(tanque.bombaEncendida);
    }
  }, [tanque?.bombaEncendida]);

  if (!tanque) return null;

  if (tanque.dispositivoActivo === false) {
    return (
      <Card size="3" style={{ background: '#111827', borderColor: 'rgba(245, 158, 11, 0.25)', borderRadius: '16px' }}>
        <Flex direction="column" gap="3" align="center" style={{ textAlign: 'center', padding: '12px' }}>
          <Text size="7" style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.25))' }}></Text>
          <Box>
            <Text size="3" weight="bold" color="amber" as="div" mb="2">
              Dispositivo del Tanque Inactivo
            </Text>
            <Text size="2" color="gray" as="div" mb="3">
              Para visualizar el nivel de agua ({tanque.nombre}), los litros disponibles y el porcentaje en vivo, debes activar la captura de datos de este dispositivo.
            </Text>
            <Text size="1" color="indigo" weight="medium" style={{ fontFamily: 'monospace' }}>Actívalo en la sección de Control.
            </Text>
          </Box>
        </Flex>
      </Card>
    );
  }

  const handleToggleBomba = async (checked: boolean) => {
    setBombaActiva(checked);
    if (!tanque.idTelemetria) { setBombaActiva(!checked); return; }
    try {
      const res = await fetch('/api/iot/bomba', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idTelemetria: tanque.idTelemetria, estado: checked }) });
      if (!res.ok) throw new Error();
    } catch (e) { setBombaActiva(!checked); alert("Error en conexión."); }
  };
  return (
    <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
      <Flex direction="column" gap="2">
        <Box>
          <Text size="3" weight="bold" color="indigo" as="div">{tanque.nombre}</Text>
          <Flex align="baseline" gap="2" mt="1">
            <Text size="8" weight="bold" color="sky" style={{ letterSpacing: '-1px' }}>{tanque.litrosActuales}</Text>
            <Text size="3" color="gray" weight="medium">/ {tanque.litrosTotales} L</Text>
          </Flex>
          <Box mt="1">
            <Progress value={tanque.porcentaje} size="2" color={tanque.porcentaje < 20 ? 'red' : 'blue'} style={{ background: '#1f2937' }} />
            <Text size="1" color="gray" mt="2" as="div" style={{ fontFamily: 'monospace' }}>{tanque.porcentaje}% · {tanque.sensorModelo.replace('Sensor Ultrasónico ', '')} · Nivel {tanque.estadoNivel}</Text>
          </Box>
        </Box>
      </Flex>
    </Card>
  );
};

// --- SUB-COMPONENTE: GRÁFICO DE CONSUMO ---
const ConsumoChartCard = ({ 
  data, 
  limite, 
  isClientMounted,
  timeRange,
  calendarFilters,
  cultivoTimezone,
}: { 
  data: ConsumoData[]; 
  limite: number | null; 
  isClientMounted: boolean;
  timeRange: HistoryRange;
  calendarFilters: CalendarFilters;
  cultivoTimezone?: string;
}) => {
  const chartTimeZone = cultivoTimezone || DEFAULT_DASHBOARD_TIME_ZONE;
  const calendarFilteredData = data.filter((item) => {
    if (!item.fecha) return false;
    const date = new Date(item.fecha);
    return dateMatchesCalendarFilters(date, calendarFilters);
  }).filter((item) => {
    if (calendarFilters.month !== 'all' || calendarFilters.year !== 'all') return true;
    if (!item.fecha) return false;
    const date = new Date(item.fecha).getTime();
    const now = new Date().getTime();
    const limits = { '6h': 6 * 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000 };
    return date >= now - limits[timeRange];
  });

  const chartData = calendarFilteredData.map(d => {
    const dateObj = d.fecha ? new Date(d.fecha) : new Date();
    const xLabel = d.label === 'Hoy' ? 'Hoy' : dateObj.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', timeZone: chartTimeZone });
    return { ...d, xLabel, valorReal: d.valor };
  });

  const config = {
    title: 'Consumo de agua',
    color: '#38bdf8', // sky-400
  };

  return (
    <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', height: '100%' }}>
      <Text size="3" weight="bold" color="indigo" mb="3" as="div">Consumo de agua — últimos 7 días</Text>
      
      {chartData.length === 0 ? (
        <Flex align="center" justify="center" style={{ height: '250px' }}>
          <Text color="gray">No hay datos de consumo en este rango de tiempo.</Text>
        </Flex>
      ) : !isClientMounted ? (
        <Flex align="center" justify="center" style={{ height: '250px' }}>
          <Text color="gray">Cargando gráfico...</Text>
        </Flex>
      ) : (
        <Box style={{ width: '100%', minWidth: 0, height: '250px' }}>
          <ResponsiveContainer width="100%" height={250} minWidth={0}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="xLabel" stroke="#4b5563" fontSize={12} tickMargin={10} minTickGap={20} />
              <YAxis stroke="#4b5563" fontSize={12} tickFormatter={(val) => `${val}L`} />
              <Tooltip 
                contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} 
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }} 
                formatter={(value: any) => [`${value} L`, config.title]} 
              />
              {limite !== null && (
                <ReferenceLine 
                  y={limite} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3" 
                  label={{ position: 'insideBottomLeft', value: `Límite ${limite}L`, fill: '#ef4444', fontSize: 12 }} 
                />
              )}
              <Line 
                type="monotone" 
                dataKey="valorReal" 
                stroke={config.color} 
                strokeWidth={3} 
                dot={false} 
                activeDot={{ r: 6, fill: config.color, stroke: '#111827', strokeWidth: 2 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Card>
  );
};
// --- SUB-COMPONENTE: RESUMEN DEL DÍA ---
const ResumenDiaCard = ({ 
  resumen, 
  sensores, 
  isClientMounted,
  hasFilter 
}: { 
  resumen: ResumenDiaData; 
  sensores: any; 
  isClientMounted: boolean;
  hasFilter: boolean;
}) => {
  let salud = 100;
  const sensoresEvaluados = [
    sensores.humedadSuelo,
    sensores.humedadAmbiente,
    sensores.temperaturaAmbiente,
    sensores.temperaturaSuelo
  ];
  
  sensoresEvaluados.forEach(s => {
    if (s && s.umbral) {
      if (s.valor < s.umbral.min || s.valor > s.umbral.max) {
        salud -= 25;
      }
    }
  });

  const saludData = [
    { name: 'Salud', value: salud },
    { name: 'Faltante', value: 100 - salud }
  ];

  const getSaludColor = (val: number) => {
    if (val >= 100) return '#22c55e';
    if (val >= 75) return '#2dd4bf';
    if (val >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getSaludTexto = (val: number) => {
    if (val >= 100) return 'Excelente';
    if (val >= 75) return 'Estable';
    if (val >= 50) return 'Advertencia';
    return 'Crítico';
  };

  const colorSalud = getSaludColor(salud);
  const textoSalud = getSaludTexto(salud);

  const Row = ({ label, value, color = '#38bdf8', isLast = false }: { label: string, value: string, color?: string, isLast?: boolean }) => (
    <Flex justify="between" align="center" py="3" style={{ borderBottom: isLast ? 'none' : '1px solid #1f2937' }}>
      <Text size="2" style={{ color: '#9ca3af', fontFamily: 'monospace' }}>{label}</Text>
      <Text size="2" weight="bold" style={{ color, fontFamily: 'monospace' }}>{value}</Text>
    </Flex>
  );

  return (
    <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', height: '100%' }}>
      <Text size="3" weight="bold" color="indigo" mb="3" as="div">Resumen del día</Text>

      <Flex direction="column" align="center" mb="2" style={{ position: 'relative', minWidth: 0, height: '110px' }}>
        {!isClientMounted ? (
          <Flex align="center" justify="center" style={{ width: '100%', height: '110px' }}>
            <Text color="gray">Cargando gráfico...</Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height={110} minWidth={0}>
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Pie
              data={saludData}
              cx="50%"
              cy="80%"
              startAngle={180}
              endAngle={0}
              innerRadius={46}
              outerRadius={58}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={colorSalud} />
              <Cell fill="#1e293b" />
            </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
        <div style={{
          position: 'absolute',
          bottom: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          width: '100%'
        }}>
          <Text size="5" weight="bold" style={{ color: 'white', display: 'block', fontFamily: 'monospace', lineHeight: 1 }}>
            {salud}%
          </Text>
          <Text size="1" weight="medium" style={{ color: colorSalud, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px', display: 'inline-block' }}>
            Salud: {textoSalud}
          </Text>
        </div>
      </Flex>

      <Box>
        <Row label={hasFilter ? "Riegos prom. diario" : "Riegos hoy"} value={hasFilter ? "--" : `${resumen.riegosHoy} evento${resumen.riegosHoy !== 1 ? 's' : ''}`} />
        <Row label={hasFilter ? "Consumo prom. diario" : "Litros consumidos"} value={`${resumen.litrosHoy} L`} />
        <Row label="Último riego" value={getTimeAgo(resumen.ultimoRiego)} />
        <Row label="Hum. suelo prom." value={resumen.humedadSueloProm !== null ? `${resumen.humedadSueloProm.toFixed(1)}%` : '--'} color="#4ade80" />
        <Row label="Hum. ambiental" value={resumen.humedadAmbiental !== null ? `${resumen.humedadAmbiental.toFixed(1)}%` : '--'} color="#4ade80" isLast />
      </Box>
    </Card>
  );
};
