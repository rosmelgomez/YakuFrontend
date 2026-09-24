// src/components/administrador/dashboard/AdminDashboardClient.tsx
"use client";

import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  Grid, 
  Flex, 
  Text, 
  Table, 
  Badge, 
  Tabs, 
  TextField, 
  ScrollArea,
  Button
} from '@radix-ui/themes';
import { 
  Users, 
  Cpu, 
  Leaf,
  Droplets,
  Activity,
  Wifi,
  Trophy,
  Sprout,
  UserPlus,
  Layers,
  Brain,
  Search,
  Database,
  Filter
} from 'lucide-react';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const CARD_STYLE = { background: '#111827', borderColor: '#1f2937' };
const TOOLTIP_STYLE = { background: '#1f2937', borderColor: '#374151', color: 'white', fontSize: 11, borderRadius: 8 };
// Resaltado sutil al pasar el cursor sobre las barras (reemplaza el fondo blanco por defecto de Recharts)
const BAR_CURSOR = { fill: 'rgba(148, 163, 184, 0.08)' };

const DEVICE_STATE_COLORS: Record<string, string> = {
  asignado: '#10b981',
  disponible: '#3b82f6',
  reparacion: '#f59e0b',
  retirado: '#64748b',
};

const DEVICE_STATE_LABELS: Record<string, string> = {
  asignado: 'Asignados',
  disponible: 'En stock',
  reparacion: 'En reparación',
  retirado: 'Retirados',
};

const PLANT_COLORS = ['#10b981', '#22c55e', '#84cc16', '#14b8a6', '#06b6d4', '#0ea5e9', '#6366f1'];

function ChartHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Flex direction="column" gap="1" mb="3">
      <Flex align="center" gap="2">
        {icon}
        <Text size={{ initial: "2", sm: "3" }} weight="bold" style={{ color: 'white' }}>{title}</Text>
      </Flex>
      <Text size="1" color="gray">{subtitle}</Text>
    </Flex>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <Flex align="center" justify="center" style={{ height: '100%', minHeight: 160 }}>
      <Text size="1" color="gray">{message}</Text>
    </Flex>
  );
}

interface AdminDashboardClientProps {
  data: {
    metricas: {
      total_usuarios: number;
      total_dispositivos: number;
      total_dispositivos_activos: number;
      total_cultivos_activos: number;
    };
    logs: Array<{
      id: number;
      id_usuario: number | null;
      usuario_nombre: string | null;
      accion: string;
      modulo: string | null;
      descripcion: string | null;
      ip_acceso: string | null;
      fecha: string;
    }>;
    predicciones: Array<{
      id: number;
      id_usuario: number;
      id_cultivo: number | null;
      usuario_nombre: string;
      cultivo_nombre: string;
      modelo_nombre: string;
      recomendacion: string;
      probabilidad: number;
      accion_ejecutada: boolean;
      fecha: string;
    }>;
    modelos: Array<{
      id: number;
      nombre_modelo: string;
      algoritmo: string;
      precision_modelo: number | null;
      precision_score: number | null;
      recall_score: number | null;
      f1_score: number | null;
      es_default: boolean;
      predicciones_totales: number;
    }>;
    consumo_semanal: Array<{
      fecha: string;
      litros: number;
      riegos: number;
      automatico?: number;
      manual?: number;
      programado?: number;
    }>;
    usuarios_filtro: Array<{
      id: number;
      nombre: string;
      apellido: string | null;
      correo: string;
    }>;
    cultivos_filtro: Array<{
      id: number;
      nombre_planta: string;
      id_usuario: number;
    }>;
    top_consumo?: Array<{
      id_usuario: number;
      nombre: string;
      litros: number;
      riegos: number;
    }>;
    registros_mensuales?: Array<{
      mes: string;
      agricultores: number;
    }>;
    dispositivos_estado?: Array<{
      estado: string;
      total: number;
    }>;
    dispositivos_conectados?: number;
    cultivos_por_planta?: Array<{
      planta: string;
      total: number;
    }>;
    zona_horaria?: string;
  };
}

export default function AdminDashboardClient({ data }: AdminDashboardClientProps) {
  const {
    metricas,
    predicciones,
    modelos, 
    consumo_semanal, 
    usuarios_filtro = [], 
    cultivos_filtro = [],
    top_consumo = [],
    registros_mensuales = [],
    dispositivos_estado = [],
    dispositivos_conectados = 0,
    cultivos_por_planta = [],
    zona_horaria = 'America/Lima',
  } = data;

  const litrosSemana = consumo_semanal.reduce((acc, d) => acc + (d.litros || 0), 0);
  const riegosSemana = consumo_semanal.reduce((acc, d) => acc + (d.riegos || 0), 0);
  const nuevosEsteMes = registros_mensuales.length > 0 ? registros_mensuales[registros_mensuales.length - 1].agricultores : 0;
  const conexionPct = metricas.total_dispositivos > 0
    ? Math.round((dispositivos_conectados / metricas.total_dispositivos) * 100)
    : 0;

  const deviceStateData = dispositivos_estado.map(d => ({
    name: DEVICE_STATE_LABELS[d.estado] || d.estado.charAt(0).toUpperCase() + d.estado.slice(1),
    value: d.total,
    color: DEVICE_STATE_COLORS[d.estado] || '#a855f7',
  }));
  const plantData = cultivos_por_planta.slice(0, 7);

  // Selected filters for User & Crop
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterCropId, setFilterCropId] = useState<string>('all');

  // Search states
  const [predSearch, setPredSearch] = useState('');

  // Pagination states
  const [currentPagePreds, setCurrentPagePreds] = useState(1);
  const pageSizePreds = 10;
  const [currentPageModels, setCurrentPageModels] = useState(1);
  const pageSizeModels = 10;

  // Handle user change (resets crop choice and resets page counters)
  const handleUserFilterChange = (val: string) => {
    setFilterUserId(val);
    setFilterCropId('all');
    setCurrentPagePreds(1);
  };

  // Filter crops dropdown list based on chosen user
  const availableCropsForSelect = cultivos_filtro.filter(
    c => c.id_usuario.toString() === filterUserId
  );

  // Apply filters on ML predictions
  const filteredPreds = predicciones.filter(p => {
    const matchesSearch = 
      p.usuario_nombre.toLowerCase().includes(predSearch.toLowerCase()) ||
      p.cultivo_nombre.toLowerCase().includes(predSearch.toLowerCase()) ||
      p.recomendacion.toLowerCase().includes(predSearch.toLowerCase()) ||
      p.modelo_nombre.toLowerCase().includes(predSearch.toLowerCase());
    
    const matchesUserFilter = filterUserId === 'all' || p.id_usuario.toString() === filterUserId;
    const matchesCropFilter = filterCropId === 'all' || p.id_cultivo?.toString() === filterCropId;

    return matchesSearch && matchesUserFilter && matchesCropFilter;
  });

  // Dynamic ML statistics based on filtered predictions
  const totalPreds = filteredPreds.length;
  const riegoPredsCount = filteredPreds.filter(p => p.recomendacion.toLowerCase() === 'riego').length;
  const noRiegoPredsCount = totalPreds - riegoPredsCount;
  
  const executionRate = totalPreds > 0 
    ? Math.round((filteredPreds.filter(p => p.accion_ejecutada).length / totalPreds) * 100) 
    : 0;

  const avgConfidence = totalPreds > 0
    ? Math.round(filteredPreds.reduce((acc, curr) => acc + curr.probabilidad, 0) / totalPreds * 100)
    : 0;

  // Pie chart data
  const pieData = [
    { name: 'Recomienda Riego', value: riegoPredsCount, color: '#3b82f6' },
    { name: 'Recomienda No Riego', value: noRiegoPredsCount, color: '#64748b' }
  ].filter(d => d.value > 0);

  const formatFecha = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', timeZone: zona_horaria });
    } catch {
      return isoString;
    }
  };

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER */}
      <Flex direction="column" gap="1">
        <Text size={{ initial: "5", sm: "6" }} weight="bold" color="indigo" as="div">
          Resumen General del Sistema
        </Text>
        <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
          Métricas consolidadas de infraestructura, auditoría y análisis predictivo global.
        </Text>
      </Flex>

      {/* FILTER BAR */}
      <Card size={{ initial: "1", sm: "2" }} style={{ background: '#111827', borderColor: '#1f2937' }}>
        <Flex direction={{ initial: 'column', sm: 'row' }} gap="3" align={{ sm: 'center' }}>
          <Flex align="center" gap="2" style={{ color: '#818cf8' }}>
            <Filter size={15} />
            <Text size="2" weight="bold">Filtros Globales:</Text>
          </Flex>

          {/* User select filter */}
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray" mb="1">Filtrar por Agricultor</Text>
            <SearchableSelect
              value={filterUserId}
              onValueChange={handleUserFilterChange}
              placeholder="Seleccionar agricultor..."
              searchPlaceholder="Buscar agricultor..."
              style={{ background: '#1e293b' }}
              options={[
                { value: 'all', label: 'Todos los agricultores' },
                ...usuarios_filtro.map(u => ({ value: u.id.toString(), label: `${u.nombre} ${u.apellido || ''} (${u.correo})` })),
              ]}
            />
          </Flex>

          {/* Crop select filter */}
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray" mb="1">Filtrar por Cultivo</Text>
            <SearchableSelect
              value={filterCropId}
              onValueChange={(val) => { setFilterCropId(val); setCurrentPagePreds(1); }}
              disabled={filterUserId === 'all'}
              placeholder={filterUserId === 'all' ? "Primero elija agricultor..." : "Seleccionar cultivo..."}
              searchPlaceholder="Buscar cultivo..."
              style={{ background: '#1e293b' }}
              options={[
                { value: 'all', label: 'Todos los cultivos' },
                ...availableCropsForSelect.map(c => ({ value: c.id.toString(), label: c.nombre_planta })),
              ]}
            />
          </Flex>
        </Flex>
      </Card>

      {/* METRIC CARDS */}
      <Grid columns={{ initial: '2', sm: '2', md: '4' }} gap={{ initial: "2", sm: "3" }}>
        {/* Usuarios */}
        <Card size="1" style={{ background: '#111827', borderColor: '#1f2937' }}>
          <Flex align="center" gap="2.5">
            <Box style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '10px' }}>
              <Users size={20} color="#3b82f6" />
            </Box>
            <Box>
              <Text size="1" color="gray" weight="medium">Agricultores</Text>
              <Flex gap="1.5" align="baseline">
                <Text size={{ initial: "4", sm: "5" }} weight="bold" style={{ color: 'white' }}>{metricas.total_usuarios}</Text>
                {nuevosEsteMes > 0 && <Text size="1" color="green">+{nuevosEsteMes} este mes</Text>}
              </Flex>
            </Box>
          </Flex>
        </Card>

        {/* Dispositivos */}
        <Card size="1" style={{ background: '#111827', borderColor: '#1f2937' }}>
          <Flex align="center" gap="2.5">
            <Box style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '8px', borderRadius: '10px' }}>
              <Cpu size={20} color="#a855f7" />
            </Box>
            <Box>
              <Text size="1" color="gray" weight="medium">Dispositivos</Text>
              <Flex gap="1.5" align="baseline">
                <Text size={{ initial: "4", sm: "5" }} weight="bold" style={{ color: 'white' }}>{metricas.total_dispositivos}</Text>
                <Text size="1" color="gray">({metricas.total_dispositivos_activos} act.)</Text>
              </Flex>
            </Box>
          </Flex>
        </Card>

        {/* Cultivos */}
        <Card size="1" style={{ background: '#111827', borderColor: '#1f2937' }}>
          <Flex align="center" gap="2.5">
            <Box style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '10px' }}>
              <Leaf size={20} color="#10b981" />
            </Box>
            <Box>
              <Text size="1" color="gray" weight="medium">Cultivos</Text>
              <Text size={{ initial: "4", sm: "5" }} weight="bold" style={{ color: 'white', display: 'block' }}>{metricas.total_cultivos_activos}</Text>
            </Box>
          </Flex>
        </Card>

        {/* Agua 7 días */}
        <Card size="1" style={CARD_STYLE}>
          <Flex align="center" gap="2.5">
            <Box style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '8px', borderRadius: '10px' }}>
              <Droplets size={20} color="#0ea5e9" />
            </Box>
            <Box>
              <Text size="1" color="gray" weight="medium">Agua (7 días)</Text>
              <Flex gap="1.5" align="baseline">
                <Text size={{ initial: "4", sm: "5" }} weight="bold" style={{ color: 'white' }}>
                  {litrosSemana.toLocaleString('es-PE', { maximumFractionDigits: 1 })} L
                </Text>
                <Text size="1" color="gray">({riegosSemana} riegos)</Text>
              </Flex>
            </Box>
          </Flex>
        </Card>
      </Grid>

      {/* CHARTS CONTAINER */}
      <Grid columns={{ initial: '1', lg: '3' }} gap={{ initial: "3", sm: "4" }}>
        {/* Consumo Semanal */}
        <Card size={{ initial: "2", sm: "3" }} className="col-span-1 lg:col-span-2" style={{ background: '#111827', borderColor: '#1f2937' }}>
          <Flex direction="column" gap="2" mb="3">
            <Flex align="center" gap="2">
              <Activity size={18} color="#3b82f6" />
              <Text size={{ initial: "2", sm: "3" }} weight="bold" style={{ color: 'white' }}>Monitoreo Semanal de Riego (Global)</Text>
            </Flex>
            <Text size="1" color="gray">Consumo total de agua en litros y número de riegos ejecutados por los agricultores.</Text>
          </Flex>

          <Box style={{ width: '100%', minWidth: 0, height: '260px' }}>
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <BarChart data={consumo_semanal} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={10} />
                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} label={{ value: 'Litros', angle: -90, position: 'insideLeft', fill: '#3b82f6', style: {fontSize: 10} }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} allowDecimals={false} label={{ value: 'Riegos', angle: 90, position: 'insideRight', fill: '#10b981', style: {fontSize: 10} }} />
                <Tooltip
                  cursor={BAR_CURSOR}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ fontWeight: 'bold', color: '#818cf8' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar yAxisId="left" dataKey="litros" name="Agua Consumida (L)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="riegos" name="Acciones de Riego" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>

        {/* ML Summary stats */}
        <Card size={{ initial: "2", sm: "3" }} style={{ background: '#111827', borderColor: '#1f2937' }}>
          <Flex direction="column" gap="2" mb="3">
            <Flex align="center" gap="2">
              <Brain size={18} color="#a855f7" />
              <Text size="3" weight="bold" style={{ color: 'white' }}>Eficiencia Machine Learning</Text>
            </Flex>
            <Text size="1" color="gray">Indicadores clave del rendimiento de ML para el filtro actual.</Text>
          </Flex>

          <Flex direction="column" gap="4">
            <Flex justify="between" style={{ borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
              <Text size="2" color="gray">Confianza Promedio de Predicción</Text>
              <Text size="2" weight="bold" color="purple">{avgConfidence}%</Text>
            </Flex>
            <Flex justify="between" style={{ borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
              <Text size="2" color="gray">Tasa de Adopción / Ejecución</Text>
              <Text size="2" weight="bold" color="green">{executionRate}%</Text>
            </Flex>
            <Flex justify="between" style={{ borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
              <Text size="2" color="gray">Predicciones Totales Filtradas</Text>
              <Text size="2" weight="bold" style={{ color: 'white' }}>{totalPreds}</Text>
            </Flex>

            {pieData.length > 0 ? (
              <Box style={{ height: '140px', width: '100%', minWidth: 0, position: 'relative' }}>
                <ResponsiveContainer width="100%" height={140} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'white' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <Text size="1" color="gray" style={{ display: 'block', lineHeight: 1 }}>Riego</Text>
                  <Text size="4" weight="bold" style={{ color: 'white' }}>
                    {totalPreds > 0 ? Math.round((riegoPredsCount / totalPreds) * 100) : 0}%
                  </Text>
                </div>
              </Box>
            ) : (
              <Text size="1" color="gray" style={{ textAlign: 'center', padding: '20px' }}>Sin registros de predicciones.</Text>
            )}
          </Flex>
        </Card>
      </Grid>

      {/* CHARTS ROW 2: Dispositivos, Top consumo, Cultivos por especie */}
      <Grid columns={{ initial: '1', md: '2', lg: '3' }} gap={{ initial: "3", sm: "4" }}>
        {/* Estado de dispositivos */}
        <Card size={{ initial: "2", sm: "3" }} style={CARD_STYLE}>
          <ChartHeader
            icon={<Wifi size={18} color="#a855f7" />}
            title="Parque de Dispositivos"
            subtitle="Distribución por estado y conectividad reciente."
          />
          {deviceStateData.length > 0 ? (
            <>
              <Box style={{ height: '170px', width: '100%', minWidth: 0, position: 'relative' }}>
                <ResponsiveContainer width="100%" height={170} minWidth={0}>
                  <PieChart>
                    <Pie data={deviceStateData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
                      {deviceStateData.map((entry, index) => (
                        <Cell key={`dev-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: 'white' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <Text size="1" color="gray" style={{ display: 'block', lineHeight: 1 }}>En línea</Text>
                  <Text size="4" weight="bold" style={{ color: 'white' }}>{conexionPct}%</Text>
                </div>
              </Box>
              <Flex wrap="wrap" gap="3" justify="center" mt="2">
                {deviceStateData.map(d => (
                  <Flex key={d.name} align="center" gap="1">
                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                    <Text size="1" color="gray">{d.name}: <Text weight="bold" style={{ color: 'white' }}>{d.value}</Text></Text>
                  </Flex>
                ))}
              </Flex>
              <Text size="1" color="gray" align="center" as="div" mt="2">
                {dispositivos_conectados} de {metricas.total_dispositivos} reportando actividad reciente
              </Text>
            </>
          ) : (
            <EmptyChart message="No hay dispositivos registrados." />
          )}
        </Card>

        {/* Top agricultores por consumo */}
        <Card size={{ initial: "2", sm: "3" }} style={CARD_STYLE}>
          <ChartHeader
            icon={<Trophy size={18} color="#f59e0b" />}
            title="Mayor Consumo de Agua"
            subtitle="Agricultores con más litros utilizados en los últimos 7 días."
          />
          <Box style={{ height: '230px', width: '100%', minWidth: 0 }}>
            {top_consumo.length > 0 ? (
              <ResponsiveContainer width="100%" height={230} minWidth={0}>
                <BarChart data={top_consumo} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                  <YAxis type="category" dataKey="nombre" stroke="#94a3b8" fontSize={10} width={90} tickFormatter={(v: string) => v.length > 13 ? `${v.slice(0, 12)}…` : v} />
                  <Tooltip
                    cursor={BAR_CURSOR}
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ fontWeight: 'bold', color: '#fbbf24' }}
                    formatter={(value: any) => [`${value} L`, 'Agua']}
                  />
                  <Bar dataKey="litros" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Sin consumo registrado esta semana." />
            )}
          </Box>
        </Card>

        {/* Cultivos por especie */}
        <Card size={{ initial: "2", sm: "3" }} className="md:col-span-2 lg:col-span-1" style={CARD_STYLE}>
          <ChartHeader
            icon={<Sprout size={18} color="#10b981" />}
            title="Cultivos por Especie"
            subtitle="Cultivos activos agrupados por tipo de planta."
          />
          <Box style={{ height: '230px', width: '100%', minWidth: 0 }}>
            {plantData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230} minWidth={0}>
                <BarChart data={plantData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                  <YAxis type="category" dataKey="planta" stroke="#94a3b8" fontSize={10} width={90} tickFormatter={(v: string) => v.length > 13 ? `${v.slice(0, 12)}…` : v} />
                  <Tooltip
                    cursor={BAR_CURSOR}
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ fontWeight: 'bold', color: '#34d399' }}
                    formatter={(value: any) => [value, 'Cultivos']}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={16}>
                    {plantData.map((_, index) => (
                      <Cell key={`plant-${index}`} fill={PLANT_COLORS[index % PLANT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No hay cultivos activos." />
            )}
          </Box>
        </Card>
      </Grid>

      {/* CHARTS ROW 3: Origen de riegos + Nuevos agricultores */}
      <Grid columns={{ initial: '1', lg: '2' }} gap={{ initial: "3", sm: "4" }}>
        {/* Riegos por tipo */}
        <Card size={{ initial: "2", sm: "3" }} style={CARD_STYLE}>
          <ChartHeader
            icon={<Layers size={18} color="#818cf8" />}
            title="Origen de los Riegos"
            subtitle="Riegos diarios según su origen: automático (ML), programado o manual."
          />
          <Box style={{ height: '240px', width: '100%', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <BarChart data={consumo_semanal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                <Tooltip cursor={BAR_CURSOR} contentStyle={TOOLTIP_STYLE} labelStyle={{ fontWeight: 'bold', color: '#818cf8' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar dataKey="automatico" name="Automático (ML)" stackId="tipo" fill="#6366f1" />
                <Bar dataKey="programado" name="Programado" stackId="tipo" fill="#06b6d4" />
                <Bar dataKey="manual" name="Manual" stackId="tipo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>

        {/* Nuevos agricultores */}
        <Card size={{ initial: "2", sm: "3" }} style={CARD_STYLE}>
          <ChartHeader
            icon={<UserPlus size={18} color="#3b82f6" />}
            title="Nuevos Agricultores"
            subtitle="Agricultores registrados por mes durante el último semestre."
          />
          <Box style={{ height: '240px', width: '100%', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <AreaChart data={registros_mensuales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminRegistrosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ fontWeight: 'bold', color: '#60a5fa' }} formatter={(value: any) => [value, 'Nuevos agricultores']} />
                <Area type="monotone" dataKey="agricultores" stroke="#3b82f6" strokeWidth={2} fill="url(#adminRegistrosGradient)" dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      </Grid>

      {/* TABS FOR DETAILS */}
      <Tabs.Root defaultValue="ml_preds">
        <Tabs.List style={{
          marginBottom: '1.25rem',
          background: '#111827',
          borderRadius: '12px',
          padding: '4px',
          border: '1px solid #1f2937',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          maxWidth: '100%'
        }}>
          <Tabs.Trigger value="ml_preds" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }}>
            🤖 Predicciones ML
          </Tabs.Trigger>
          <Tabs.Trigger value="ml_models" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem' }}>
            ⚙️ Modelos ML
          </Tabs.Trigger>
        </Tabs.List>

        <Box pt="1">
          {/* TAB 1: PREDICCIONES */}
          <Tabs.Content value="ml_preds">
            <Card size={{ initial: "2", sm: "3" }} style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
              <Flex justify="between" align={{ initial: 'stretch', sm: 'center' }} direction={{ initial: 'column', sm: 'row' }} mb="4" gap="3">
                <Text size={{ initial: "2", sm: "3" }} weight="bold" color="indigo">Predicciones de Riego Recientes</Text>
                <TextField.Root 
                  placeholder="Buscar por agricultor o cultivo..." 
                  value={predSearch}
                  onChange={(e) => { setPredSearch(e.target.value); setCurrentPagePreds(1); }}
                  style={{ background: '#1e293b', width: '100%', maxWidth: '300px', color: 'white' }}
                >
                  <TextField.Slot>
                    <Search size={14} color="#94a3b8" />
                  </TextField.Slot>
                </TextField.Root>
              </Flex>

              <ScrollArea style={{ height: '500px' }}>
                <Table.Root variant="surface" style={{ background: 'transparent' }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Fecha / Hora</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Agricultor</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Cultivo</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Modelo</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Recomendación</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Confianza</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Estado de Ejecución</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>

                  <Table.Body>
                    {filteredPreds.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>
                          No hay predicciones disponibles para el filtro actual.
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      filteredPreds.slice((currentPagePreds - 1) * pageSizePreds, currentPagePreds * pageSizePreds).map((p) => (
                        <Table.Row key={p.id}>
                          <Table.Cell style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{formatFecha(p.fecha)}</Table.Cell>
                          <Table.Cell>
                            <Text weight="bold" style={{ color: 'white' }}>{p.usuario_nombre}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text style={{ color: '#38bdf8' }} weight="medium">{p.cultivo_nombre}</Text>
                          </Table.Cell>
                          <Table.Cell style={{ fontSize: '12px' }}>{p.modelo_nombre}</Table.Cell>
                          <Table.Cell>
                            <Badge color={p.recomendacion.toLowerCase() === 'riego' ? 'blue' : 'gray'} variant="solid">
                              {p.recomendacion.toUpperCase()}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Text weight="bold" style={{ color: 'white' }}>{Math.round(p.probabilidad * 100)}%</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={p.accion_ejecutada ? 'green' : 'red'} variant="soft">
                              {p.accion_ejecutada ? 'EJECUTADO' : 'OMITIDO / EVALUANDO'}
                            </Badge>
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table.Root>
              </ScrollArea>

              {/* Controles de Paginación para Predicciones */}
              {filteredPreds.length > pageSizePreds && (
                <Flex justify="between" align="center" mt="4" px="2">
                  <Text size="2" color="gray">
                    Mostrando {Math.min((currentPagePreds - 1) * pageSizePreds + 1, filteredPreds.length)} a {Math.min(currentPagePreds * pageSizePreds, filteredPreds.length)} de {filteredPreds.length} predicciones
                  </Text>
                  <Flex gap="1">
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPagePreds(1)} 
                      disabled={currentPagePreds === 1}
                      style={{ cursor: 'pointer' }}
                    >
                      «
                    </Button>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPagePreds(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPagePreds === 1}
                      style={{ cursor: 'pointer' }}
                    >
                      ‹
                    </Button>
                    <Flex align="center" px="2" style={{ background: '#1e293b', borderRadius: '4px', height: '24px' }}>
                      <Text size="1" weight="bold" style={{ color: 'white' }}>
                        {currentPagePreds} / {Math.ceil(filteredPreds.length / pageSizePreds)}
                      </Text>
                    </Flex>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPagePreds(prev => Math.min(prev + 1, Math.ceil(filteredPreds.length / pageSizePreds)))} 
                      disabled={currentPagePreds === Math.ceil(filteredPreds.length / pageSizePreds)}
                      style={{ cursor: 'pointer' }}
                    >
                      ›
                    </Button>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPagePreds(Math.ceil(filteredPreds.length / pageSizePreds))} 
                      disabled={currentPagePreds === Math.ceil(filteredPreds.length / pageSizePreds)}
                      style={{ cursor: 'pointer' }}
                    >
                      »
                    </Button>
                  </Flex>
                </Flex>
              )}
            </Card>
          </Tabs.Content>

          {/* TAB 2: MODELOS */}
          <Tabs.Content value="ml_models">
            <Card size={{ initial: "2", sm: "3" }} style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
              <Text size={{ initial: "2", sm: "3" }} weight="bold" color="indigo" mb="4" as="div">Modelos de Aprendizaje Automático Disponibles</Text>

              <ScrollArea style={{ height: '500px' }}>
                <Table.Root variant="surface" style={{ background: 'transparent' }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Nombre del Modelo</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Algoritmo</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>MAE (Error)</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Precision Score</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>F1 Score</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Recall</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Por Defecto</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Total Predicciones</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>

                  <Table.Body>
                    {modelos.slice((currentPageModels - 1) * pageSizeModels, currentPageModels * pageSizeModels).map((m) => (
                      <Table.Row key={m.id}>
                        <Table.RowHeaderCell>
                          <Flex align="center" gap="2">
                            <Database size={14} color="#a855f7" />
                            <Text size="2" weight="bold" style={{ color: 'white' }}>{m.nombre_modelo}</Text>
                          </Flex>
                        </Table.RowHeaderCell>
                        <Table.Cell style={{ fontFamily: 'monospace', fontSize: '11px' }}>{m.algoritmo}</Table.Cell>
                        <Table.Cell>
                          <Text style={{ color: '#f43f5e' }} weight="bold">
                            {m.precision_modelo !== null ? `${m.precision_modelo.toFixed(2)} %` : '--'}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text style={{ color: '#38bdf8' }} weight="medium">
                            {m.precision_score !== null ? m.precision_score.toFixed(4) : '--'}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          {m.f1_score !== null ? m.f1_score.toFixed(4) : '--'}
                        </Table.Cell>
                        <Table.Cell>
                          {m.recall_score !== null ? m.recall_score.toFixed(4) : '--'}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge color={m.es_default ? 'green' : 'gray'} variant="soft">
                            {m.es_default ? 'SÍ' : 'NO'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text weight="bold" style={{ color: 'white' }}>{m.predicciones_totales}</Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </ScrollArea>

              {/* Controles de Paginación para Modelos */}
              {modelos.length > pageSizeModels && (
                <Flex justify="between" align="center" mt="4" px="2">
                  <Text size="2" color="gray">
                    Mostrando {Math.min((currentPageModels - 1) * pageSizeModels + 1, modelos.length)} a {Math.min(currentPageModels * pageSizeModels, modelos.length)} de {modelos.length} modelos
                  </Text>
                  <Flex gap="1">
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageModels(1)} 
                      disabled={currentPageModels === 1}
                      style={{ cursor: 'pointer' }}
                    >
                      «
                    </Button>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageModels(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPageModels === 1}
                      style={{ cursor: 'pointer' }}
                    >
                      ‹
                    </Button>
                    <Flex align="center" px="2" style={{ background: '#1e293b', borderRadius: '4px', height: '24px' }}>
                      <Text size="1" weight="bold" style={{ color: 'white' }}>
                        {currentPageModels} / {Math.ceil(modelos.length / pageSizeModels)}
                      </Text>
                    </Flex>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageModels(prev => Math.min(prev + 1, Math.ceil(modelos.length / pageSizeModels)))} 
                      disabled={currentPageModels === Math.ceil(modelos.length / pageSizeModels)}
                      style={{ cursor: 'pointer' }}
                    >
                      ›
                    </Button>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageModels(Math.ceil(modelos.length / pageSizeModels))} 
                      disabled={currentPageModels === Math.ceil(modelos.length / pageSizeModels)}
                      style={{ cursor: 'pointer' }}
                    >
                      »
                    </Button>
                  </Flex>
                </Flex>
              )}
            </Card>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Box>
  );
}
