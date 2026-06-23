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
  Select,
  Button
} from '@radix-ui/themes';
import { 
  Users, 
  Cpu, 
  Leaf, 
  AlertTriangle, 
  Activity, 
  Brain, 
  Search, 
  Clock, 
  Database,
  Filter
} from 'lucide-react';
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
  Cell 
} from 'recharts';

interface AdminDashboardClientProps {
  data: {
    metricas: {
      total_usuarios: number;
      total_dispositivos: number;
      total_dispositivos_activos: number;
      total_cultivos_activos: number;
      alertas_pendientes: number;
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
  };
}

export default function AdminDashboardClient({ data }: AdminDashboardClientProps) {
  const { 
    metricas, 
    logs, 
    predicciones, 
    modelos, 
    consumo_semanal, 
    usuarios_filtro = [], 
    cultivos_filtro = [] 
  } = data;

  // Selected filters for User & Crop
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterCropId, setFilterCropId] = useState<string>('all');

  // Search states
  const [logSearch, setLogSearch] = useState('');
  const [predSearch, setPredSearch] = useState('');

  // Pagination states
  const [currentPageLogs, setCurrentPageLogs] = useState(1);
  const pageSizeLogs = 10;
  const [currentPagePreds, setCurrentPagePreds] = useState(1);
  const pageSizePreds = 10;
  const [currentPageModels, setCurrentPageModels] = useState(1);
  const pageSizeModels = 5;

  // Handle user change (resets crop choice and resets page counters)
  const handleUserFilterChange = (val: string) => {
    setFilterUserId(val);
    setFilterCropId('all');
    setCurrentPageLogs(1);
    setCurrentPagePreds(1);
  };

  // Filter crops dropdown list based on chosen user
  const availableCropsForSelect = cultivos_filtro.filter(
    c => c.id_usuario.toString() === filterUserId
  );

  // Apply filters on Logs
  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      (l.usuario_nombre || '').toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.accion || '').toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.descripcion || '').toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.modulo || '').toLowerCase().includes(logSearch.toLowerCase());
    
    const matchesUserFilter = filterUserId === 'all' || l.id_usuario?.toString() === filterUserId;
    
    return matchesSearch && matchesUserFilter;
  });

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
      return date.toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER */}
      <Flex direction="column" gap="1">
        <Text size="6" weight="bold" color="indigo" as="div">
          Resumen General del Sistema
        </Text>
        <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
          Métricas consolidadas de infraestructura, auditoría y análisis predictivo global.
        </Text>
      </Flex>

      {/* FILTER BAR */}
      <Card size="2" style={{ background: '#111827', borderColor: '#1f2937' }}>
        <Flex direction={{ initial: 'column', sm: 'row' }} gap="4" align={{ sm: 'center' }}>
          <Flex align="center" gap="2" style={{ color: '#818cf8' }}>
            <Filter size={16} />
            <Text size="2" weight="bold">Filtros Globales:</Text>
          </Flex>

          {/* User select filter */}
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray" mb="1">Filtrar por Agricultor</Text>
            <Select.Root value={filterUserId} onValueChange={handleUserFilterChange}>
              <Select.Trigger style={{ background: '#1e293b', color: 'white' }} placeholder="Seleccionar agricultor..." />
              <Select.Content>
                <Select.Item value="all">Todos los agricultores</Select.Item>
                {usuarios_filtro.map(u => (
                  <Select.Item key={u.id} value={u.id.toString()}>
                    {u.nombre} {u.apellido || ''} ({u.correo})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          {/* Crop select filter */}
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray" mb="1">Filtrar por Cultivo</Text>
            <Select.Root 
              value={filterCropId} 
              onValueChange={(val) => { setFilterCropId(val); setCurrentPagePreds(1); }} 
              disabled={filterUserId === 'all'}
            >
              <Select.Trigger 
                style={{ background: '#1e293b', color: 'white' }} 
                placeholder={filterUserId === 'all' ? "Primero elija agricultor..." : "Seleccionar cultivo..."} 
              />
              <Select.Content>
                <Select.Item value="all">Todos los cultivos</Select.Item>
                {availableCropsForSelect.map(c => (
                  <Select.Item key={c.id} value={c.id.toString()}>
                    {c.nombre_planta}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
      </Card>

      {/* METRIC CARDS */}
      <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="4">
        {/* Usuarios */}
        <Card size="2" style={{ background: '#111827', borderColor: '#1f2937' }}>
          <Flex align="center" gap="3">
            <Box style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px' }}>
              <Users size={24} color="#3b82f6" />
            </Box>
            <Box>
              <Text size="1" color="gray" weight="medium">Usuarios del Sistema</Text>
              <Text size="5" weight="bold" style={{ color: 'white', display: 'block' }}>{metricas.total_usuarios}</Text>
            </Box>
          </Flex>
        </Card>

        {/* Dispositivos */}
        <Card size="2" style={{ background: '#111827', borderColor: '#1f2937' }}>
          <Flex align="center" gap="3">
            <Box style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '10px', borderRadius: '12px' }}>
              <Cpu size={24} color="#a855f7" />
            </Box>
            <Box>
              <Text size="1" color="gray" weight="medium">Dispositivos en Red</Text>
              <Flex gap="2" align="baseline">
                <Text size="5" weight="bold" style={{ color: 'white' }}>{metricas.total_dispositivos}</Text>
                <Text size="1" color="gray">({metricas.total_dispositivos_activos} activos)</Text>
              </Flex>
            </Box>
          </Flex>
        </Card>

        {/* Cultivos */}
        <Card size="2" style={{ background: '#111827', borderColor: '#1f2937' }}>
          <Flex align="center" gap="3">
            <Box style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px' }}>
              <Leaf size={24} color="#10b981" />
            </Box>
            <Box>
              <Text size="1" color="gray" weight="medium">Cultivos en Campo</Text>
              <Text size="5" weight="bold" style={{ color: 'white', display: 'block' }}>{metricas.total_cultivos_activos}</Text>
            </Box>
          </Flex>
        </Card>

        {/* Alertas */}
        <Card size="2" style={{ background: '#111827', borderColor: '#1f2937' }}>
          <Flex align="center" gap="3">
            <Box style={{ 
              background: metricas.alertas_pendientes > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)', 
              padding: '10px', 
              borderRadius: '12px' 
            }}>
              <AlertTriangle size={24} color={metricas.alertas_pendientes > 0 ? "#ef4444" : "#94a3b8"} />
            </Box>
            <Box>
              <Text size="1" color="gray" weight="medium">Alertas Activas</Text>
              <Badge color={metricas.alertas_pendientes > 0 ? "red" : "gray"} variant="soft" mt="1">
                {metricas.alertas_pendientes} pendientes
              </Badge>
            </Box>
          </Flex>
        </Card>
      </Grid>

      {/* CHARTS CONTAINER */}
      <Grid columns={{ initial: '1', lg: '3' }} gap="4">
        {/* Consumo Semanal */}
        <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', gridColumn: 'span 2' }}>
          <Flex direction="column" gap="2" mb="4">
            <Flex align="center" gap="2">
              <Activity size={18} color="#3b82f6" />
              <Text size="3" weight="bold" style={{ color: 'white' }}>Monitoreo Semanal de Riego (Global)</Text>
            </Flex>
            <Text size="1" color="gray">Consumo total de agua en litros y número de riegos automáticos ejecutados.</Text>
          </Flex>

          <Box style={{ width: '100%', minWidth: 0, height: '300px' }}>
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <BarChart data={consumo_semanal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} />
                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={11} label={{ value: 'Litros', angle: -90, position: 'insideLeft', fill: '#3b82f6', style: {fontSize: 11} }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} label={{ value: 'Riegos', angle: 90, position: 'insideRight', fill: '#10b981', style: {fontSize: 11} }} />
                <Tooltip 
                  contentStyle={{ background: '#1f2937', borderColor: '#374151', color: 'white' }}
                  labelStyle={{ fontWeight: 'bold', color: '#818cf8' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar yAxisId="left" dataKey="litros" name="Agua Consumida (L)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="riegos" name="Acciones de Riego" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>

        {/* ML Summary stats */}
        <Card size="3" style={{ background: '#111827', borderColor: '#1f2937' }}>
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
                    <Tooltip contentStyle={{ background: '#1f2937', borderColor: '#374151', color: 'white', fontSize: 11 }} />
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

      {/* TABS FOR DETAILS */}
      <Tabs.Root defaultValue="auditoria">
        <Tabs.List style={{ 
          marginBottom: '1.5rem', 
          background: '#111827', 
          borderRadius: '12px', 
          padding: '6px', 
          border: '1px solid #1f2937' 
        }}>
          <Tabs.Trigger value="auditoria" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '0.85rem' }}>
            📜 Bitácora de Auditoría
          </Tabs.Trigger>
          <Tabs.Trigger value="ml_preds" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '0.85rem' }}>
            🤖 Historial de Predicciones ML
          </Tabs.Trigger>
          <Tabs.Trigger value="ml_models" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '0.85rem' }}>
            ⚙️ Modelos Entrenados
          </Tabs.Trigger>
        </Tabs.List>

        <Box pt="1">
          {/* TAB 1: AUDITORÍA */}
          <Tabs.Content value="auditoria">
            <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
              <Flex justify="between" align="center" mb="4" gap="4">
                <Text size="3" weight="bold" color="indigo">Logs de Auditoría del Sistema</Text>
                <TextField.Root 
                  placeholder="Buscar por usuario o acción..." 
                  value={logSearch}
                  onChange={(e) => { setLogSearch(e.target.value); setCurrentPageLogs(1); }}
                  style={{ background: '#1e293b', width: '280px', color: 'white' }}
                >
                  <TextField.Slot>
                    <Search size={14} color="#94a3b8" />
                  </TextField.Slot>
                </TextField.Root>
              </Flex>

              <ScrollArea style={{ height: '350px' }}>
                <Table.Root variant="surface" style={{ background: 'transparent' }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Fecha / Hora</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Usuario</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Acción</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Módulo</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Descripción</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>IP Acceso</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>

                  <Table.Body>
                    {filteredLogs.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>
                          No se encontraron registros de auditoría.
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      filteredLogs.slice((currentPageLogs - 1) * pageSizeLogs, currentPageLogs * pageSizeLogs).map((l) => (
                        <Table.Row key={l.id}>
                          <Table.Cell style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                            <Flex align="center" gap="1">
                              <Clock size={12} color="#94a3b8" />
                              <Text>{formatFecha(l.fecha)}</Text>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>
                            <Text weight="bold" style={{ color: 'white' }}>{l.usuario_nombre || 'Sistema'}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={l.accion.toLowerCase().includes('error') ? 'red' : 'indigo'} variant="soft">
                              {l.accion.toUpperCase()}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell style={{ fontFamily: 'monospace', fontSize: '11px' }}>{l.modulo || '--'}</Table.Cell>
                          <Table.Cell style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.descripcion || ''}>
                            {l.descripcion || ''}
                          </Table.Cell>
                          <Table.Cell style={{ fontFamily: 'monospace', fontSize: '11px' }}>{l.ip_acceso || '--'}</Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table.Root>
              </ScrollArea>

              {/* Controles de Paginación para Logs */}
              {filteredLogs.length > pageSizeLogs && (
                <Flex justify="between" align="center" mt="4" px="2">
                  <Text size="2" color="gray">
                    Mostrando {Math.min((currentPageLogs - 1) * pageSizeLogs + 1, filteredLogs.length)} a {Math.min(currentPageLogs * pageSizeLogs, filteredLogs.length)} de {filteredLogs.length} registros
                  </Text>
                  <Flex gap="1">
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageLogs(1)} 
                      disabled={currentPageLogs === 1}
                      style={{ cursor: 'pointer' }}
                    >
                      «
                    </Button>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageLogs(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPageLogs === 1}
                      style={{ cursor: 'pointer' }}
                    >
                      ‹
                    </Button>
                    <Flex align="center" px="2" style={{ background: '#1e293b', borderRadius: '4px', height: '24px' }}>
                      <Text size="1" weight="bold" style={{ color: 'white' }}>
                        {currentPageLogs} / {Math.ceil(filteredLogs.length / pageSizeLogs)}
                      </Text>
                    </Flex>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageLogs(prev => Math.min(prev + 1, Math.ceil(filteredLogs.length / pageSizeLogs)))} 
                      disabled={currentPageLogs === Math.ceil(filteredLogs.length / pageSizeLogs)}
                      style={{ cursor: 'pointer' }}
                    >
                      ›
                    </Button>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageLogs(Math.ceil(filteredLogs.length / pageSizeLogs))} 
                      disabled={currentPageLogs === Math.ceil(filteredLogs.length / pageSizeLogs)}
                      style={{ cursor: 'pointer' }}
                    >
                      »
                    </Button>
                  </Flex>
                </Flex>
              )}
            </Card>
          </Tabs.Content>

          {/* TAB 2: PREDICCIONES */}
          <Tabs.Content value="ml_preds">
            <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
              <Flex justify="between" align="center" mb="4" gap="4">
                <Text size="3" weight="bold" color="indigo">Predicciones de Riego Recientes</Text>
                <TextField.Root 
                  placeholder="Buscar por usuario o cultivo..." 
                  value={predSearch}
                  onChange={(e) => { setPredSearch(e.target.value); setCurrentPagePreds(1); }}
                  style={{ background: '#1e293b', width: '280px', color: 'white' }}
                >
                  <TextField.Slot>
                    <Search size={14} color="#94a3b8" />
                  </TextField.Slot>
                </TextField.Root>
              </Flex>

              <ScrollArea style={{ height: '350px' }}>
                <Table.Root variant="surface" style={{ background: 'transparent' }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Fecha / Hora</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Usuario</Table.ColumnHeaderCell>
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

          {/* TAB 3: MODELOS */}
          <Tabs.Content value="ml_models">
            <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
              <Text size="3" weight="bold" color="indigo" mb="4" as="div">Modelos de Aprendizaje Automático Disponibles</Text>

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
