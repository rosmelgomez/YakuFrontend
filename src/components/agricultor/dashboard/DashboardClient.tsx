"use client";

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text, Flex, Grid, Select, Card, Badge, Progress, Switch, Separator, Button, Dialog, TextField, ScrollArea } from '@radix-ui/themes';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, CartesianGrid } from 'recharts';
import { registrarCultivo, registrarFuenteAgua, listarProvincias, listarDistritos } from '@/actions/crops';
import NoCropsEmptyState from '@/components/layout/NoCropsEmptyState';
import SearchableSelect from '@/components/ui/SearchableSelect';

const getCreatedCropId = (res: any): number => {
  return res?.id_cultivo ?? res?.idCultivo ?? res?.id ?? 0;
};


type TanqueData = { idTelemetria: string | null; nombre: string; litrosActuales: number; litrosTotales: number; porcentaje: number; sensorModelo: string; estadoNivel: string; bombaEncendida: boolean; timeoutMinutos: number; dispositivoActivo?: boolean; } | null;
type SensorData = { modelo: string; metrica: string; unidad: string; valor: number; porcentaje: number | null; ema: number | null; fecha: Date; umbral: { min: number | null; max: number | null } | null; } | null;
type DispositivoData = { id: number; nombre: string; estado: string | null; funcionamientoActivo?: boolean; };
type ConsumoData = { label: string; valor: number; };
type ResumenDiaData = { riegosHoy: number; litrosHoy: number; ultimoRiego: Date | null; humedadSueloProm: number | null; humedadAmbiental: number | null; };

type HistoricoPunto = { fecha: string; valor: number; };
type HistorialData = {
  humedadSuelo: HistoricoPunto[];
  humedadAmbiente: HistoricoPunto[];
  temperaturaSuelo: HistoricoPunto[];
  temperaturaAmbiente: HistoricoPunto[];
};

type CultivoData = {
  idCultivo: number;
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
  const [timeLeft, setTimeLeft] = useState(300);
  const timeLeftRef = useRef(300);
  const [isClientMounted, setIsClientMounted] = useState(false);

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
      if (timeLeftRef.current <= 1) {
        timeLeftRef.current = 300;
        setTimeLeft(300);
        router.refresh();
        return;
      }

      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

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
          alert(`Cultivo '${registeredCropName}' registrado correctamente.`);
          setIsOpenRegisterCrop(false);
          resetCropForm();
          router.refresh();
        }
      } catch (err: any) {
        alert(`Error al registrar cultivo: ${err.message}`);
      }
    });
  };

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
                    background: 'var(--greenbg)',
                    color: 'var(--green)',
                    border: '1px solid var(--greenbrd)',
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
                      background: 'var(--green)',
                      animation: 'pulse 2s infinite'
                    }} />
                    En vivo
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
                     {formatTime(timeLeft)}
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

            {/* ROW 1: Cuadrícula de Sensores Principales */}
            <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4">
              <SensorCard sensor={cultivoActivo.sensores.humedadSuelo} type="soil_moisture" />
              <SensorCard sensor={cultivoActivo.sensores.humedadAmbiente} type="env_humidity" />
              <SensorCard sensor={cultivoActivo.sensores.temperaturaAmbiente} type="env_temp" />
              <SensorCard sensor={cultivoActivo.sensores.temperaturaSuelo} type="soil_temp" />
            </Grid>

            {/* ROW 2: Gráfico Histórico (2/3) + Estado y Tanque (1/3) */}
            <Flex direction={{ initial: 'column', lg: 'row' }} gap="4">
              <Box style={{ flex: 2, minWidth: 0 }}>
                <HistoricoSensoresCard historial={cultivoActivo.historialSensores} sensores={cultivoActivo.sensores} isClientMounted={isClientMounted} />
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
                  <ConsumoChartCard data={cultivoActivo.consumoSemanal} limite={cultivoActivo.limiteConsumo} isClientMounted={isClientMounted} />
                )}
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <ResumenDiaCard resumen={cultivoActivo.resumenDia} sensores={cultivoActivo.sensores} isClientMounted={isClientMounted} />
              </Box>
            </Flex>
          </Flex>
        )
      )}

      {/* DIALOGO DE REGISTRO DE CULTIVO Y FUENTE DE AGUA */}
      {renderRegisterCropDialog()}
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
const HistoricoSensoresCard = ({ historial, sensores, isClientMounted }: { historial: HistorialData, sensores: any, isClientMounted: boolean }) => {
  const [timeRange, setTimeRange] = useState<'6h' | '24h' | '7d'>('6h');
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

  const filterDataByTime = (data: HistoricoPunto[], range: string) => {
    if (data.length === 0) return [];
    const now = new Date().getTime();
    const limits = { '6h': 6 * 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000 };
    const cutoff = now - limits[range as keyof typeof limits];
    
    return data.filter(d => new Date(d.fecha).getTime() >= cutoff).map(d => {
      const dateObj = new Date(d.fecha);
      const xLabel = range === '7d' 
        ? dateObj.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })
        : dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      return { ...d, xLabel, valorReal: d.valor };
    });
  };

  const chartData = filterDataByTime(rawData, timeRange);
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
          <Text size="3" color="gray">— últimas {timeRange}</Text>
        </Flex>

        <Flex gap="2">
          {['6h', '24h', '7d'].map((range) => (
            <Button key={range} variant={timeRange === range ? "soft" : "outline"} color={timeRange === range ? "green" : "gray"} onClick={() => setTimeRange(range as any)} style={{ cursor: 'pointer' }}>
              {range}
            </Button>
          ))}
        </Flex>
      </Flex>

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
const ConsumoChartCard = ({ data, limite, isClientMounted }: { data: ConsumoData[], limite: number | null, isClientMounted: boolean }) => {
  return (
    <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', height: '100%' }}>
      <Text size="3" weight="bold" color="indigo" mb="3" as="div">Consumo de agua — últimos 7 días</Text>
      
      <Box style={{ width: '100%', minWidth: 0, height: '300px', marginTop: '10px' }}>
        {!isClientMounted ? (
          <Flex align="center" justify="center" style={{ width: '100%', height: '100%' }}>
            <Text color="gray">Cargando gráfico...</Text>
          </Flex>
        ) : (
          <ResponsiveContainer width="100%" height={250} minWidth={0}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorConsumoNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="colorConsumoExcedido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#991b1b" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="label" stroke="#4b5563" fontSize={11} tickLine={false} />
            <YAxis stroke="#4b5563" fontSize={11} tickFormatter={(val) => `${val}L`} tickLine={false} />
            <Tooltip 
              cursor={false}
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '2px', fontSize: '11px' }}
              itemStyle={{ fontSize: '12px' }}
              formatter={(value: any) => [`${value} Litros`, 'Consumo']} 
            />
            {limite !== null && (
              <ReferenceLine 
                y={limite} 
                stroke="#ef4444" 
                strokeDasharray="3 3" 
                label={{ position: 'insideTopRight', value: `Límite: ${limite}L`, fill: '#ef4444', fontSize: 11, dy: -10 }}
              />
            )}
            <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                const sobrepaso = limite !== null && entry.valor > limite;
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={sobrepaso ? 'url(#colorConsumoExcedido)' : 'url(#colorConsumoNormal)'}
                    stroke={sobrepaso ? '#ef4444' : '#38bdf8'}
                    strokeWidth={sobrepaso ? 1 : 0.5}
                  />
                );
              })}
            </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
};
// --- SUB-COMPONENTE: RESUMEN DEL DÍA ---
const ResumenDiaCard = ({ resumen, sensores, isClientMounted }: { resumen: ResumenDiaData, sensores: any, isClientMounted: boolean }) => {
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
        <Row label="Riegos hoy" value={`${resumen.riegosHoy} evento${resumen.riegosHoy !== 1 ? 's' : ''}`} />
        <Row label="Litros consumidos" value={`${resumen.litrosHoy} L`} />
        <Row label="Último riego" value={getTimeAgo(resumen.ultimoRiego)} />
        <Row label="Hum. suelo prom." value={resumen.humedadSueloProm !== null ? `${resumen.humedadSueloProm.toFixed(1)}%` : '--'} color="#4ade80" />
        <Row label="Hum. ambiental" value={resumen.humedadAmbiental !== null ? `${resumen.humedadAmbiental.toFixed(1)}%` : '--'} color="#4ade80" isLast />
      </Box>
    </Card>
  );
};
