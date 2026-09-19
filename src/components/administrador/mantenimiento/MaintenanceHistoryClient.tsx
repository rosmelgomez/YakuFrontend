"use client";

import React, { useEffect, useState } from "react";
import { Box, Card, Flex, Text, Badge, TextField, Button, ScrollArea } from "@radix-ui/themes";
import { Wrench, Search } from "lucide-react";
import { listarLogsSistema } from "@/actions/logs";
import { useAuth } from "@/context/AuthContext";

const MODULOS_RAPIDOS = [
  { label: "Todos", value: "" },
  { label: "Hardware", value: "hardware" },
  { label: "Autenticación", value: "Autenticación" },
  { label: "Permisos", value: "Permisos" },
  { label: "Usuarios", value: "Usuarios" },
  { label: "Red MQTT", value: "Red MQTT" },
];

export default function MaintenanceHistoryClient() {
  const { user } = useAuth();
  const esAdminReal = user?.rol === "administrador";
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modulo, setModulo] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const cargar = async (moduloFiltro?: string) => {
    setLoading(true);
    const res = await listarLogsSistema({ modulo: moduloFiltro || undefined });
    setLoading(false);
    if (res.success) {
      setLogs(res.data || []);
    } else {
      setError(res.error);
    }
  };

  const handleFiltroRapido = (valor: string) => {
    setModulo(valor);
    cargar(valor);
  };

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = logs.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (l.accion || "").toLowerCase().includes(term) ||
      (l.descripcion || "").toLowerCase().includes(term) ||
      (l.modulo || "").toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, modulo]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const paginados = filtrados.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Box>
      <Flex direction="column" gap="4" mb="5">
        <Box>
          <Text size={{ initial: "5", sm: "6" }} weight="bold" color="indigo" as="div">Auditoría y mantenimiento</Text>
          <Text size={{ initial: "1", sm: "2" }} color="gray">
            {esAdminReal
              ? "Bitácora completa del sistema: mantenimiento técnico (calibraciones, desconexiones), inicios de sesión, cambios de rol/permisos y errores de red del broker MQTT."
              : "Bitácora de tu propia actividad: acciones, inicios de sesión y eventos relacionados con tu cuenta (no incluye actividad de otros usuarios)."}
          </Text>
        </Box>
      </Flex>

      <Card size={{ initial: "2", sm: "3" }} mb="4" style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
        <Flex gap="1.5" wrap="wrap" mb="3">
          {MODULOS_RAPIDOS.map((m) => (
            <Button
              key={m.value}
              size="1"
              variant={modulo === m.value ? "solid" : "soft"}
              color={modulo === m.value ? "indigo" : "gray"}
              onClick={() => handleFiltroRapido(m.value)}
              style={{ cursor: "pointer" }}
            >
              {m.label}
            </Button>
          ))}
        </Flex>
        <Flex gap="3" wrap="wrap" align="end">
          <Box style={{ flex: "1 1 220px" }}>
            <Text size="1" color="gray" as="div" mb="1">Buscar</Text>
            <TextField.Root
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Acción, descripción o módulo..."
              style={{ background: "var(--surface2-mockup)", border: "1px solid var(--border-mockup)" }}
            >
              <TextField.Slot><Search size={14} /></TextField.Slot>
            </TextField.Root>
          </Box>
          <Box style={{ flex: "1 1 180px" }}>
            <Text size="1" color="gray" as="div" mb="1">Módulo</Text>
            <TextField.Root
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
              placeholder="Ej: hardware, Monitoreo IoT"
              style={{ background: "var(--surface2-mockup)", border: "1px solid var(--border-mockup)" }}
            />
          </Box>
          <Button variant="soft" color="indigo" onClick={() => cargar(modulo)} style={{ cursor: "pointer" }}>
            Filtrar
          </Button>
        </Flex>
      </Card>

      <Card size={{ initial: "2", sm: "3" }} style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
        {loading ? (
          <Text color="gray" size="2">Cargando historial...</Text>
        ) : error ? (
          <Text color="red" size="2">{error}</Text>
        ) : filtrados.length === 0 ? (
          <Flex direction="column" align="center" gap="2" py="6">
            <Wrench className="w-10 h-10 text-slate-500" />
            <Text color="gray" size="2">No hay registros de auditoría para este filtro.</Text>
          </Flex>
        ) : (
          <ScrollArea scrollbars="horizontal" style={{ width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-mockup)" }}>
                  <th style={{ padding: "8px 10px", color: "#9ca3af", fontSize: "0.75rem" }}>Fecha</th>
                  <th style={{ padding: "8px 10px", color: "#9ca3af", fontSize: "0.75rem" }}>Acción</th>
                  <th style={{ padding: "8px 10px", color: "#9ca3af", fontSize: "0.75rem" }}>Módulo</th>
                  <th style={{ padding: "8px 10px", color: "#9ca3af", fontSize: "0.75rem" }}>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-mockup)" }}>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>
                        {log.fecha ? new Date(log.fecha).toLocaleString() : "—"}
                      </Text>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <Text size="1" weight="bold" style={{ color: "white" }}>{log.accion}</Text>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {log.modulo && <Badge color="indigo" variant="soft" size="1">{log.modulo}</Badge>}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <Text size="1" color="gray">{log.descripcion}</Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}

        {filtrados.length > pageSize && (
          <Flex justify="between" align="center" mt="4" px="2">
            <Text size="2" color="gray">
              Mostrando {Math.min((currentPage - 1) * pageSize + 1, filtrados.length)} a {Math.min(currentPage * pageSize, filtrados.length)} de {filtrados.length}
            </Text>
            <Flex gap="1">
              <Button size="1" variant="soft" color="gray" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
              <Button size="1" variant="soft" color="gray" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente</Button>
            </Flex>
          </Flex>
        )}
      </Card>
    </Box>
  );
}
