"use client";

import React, { useEffect, useState } from "react";
import { Box, Card, Flex, Text, Badge, TextField, Button, ScrollArea } from "@radix-ui/themes";
import { Wrench, Search } from "lucide-react";
import { listarLogsSistema } from "@/actions/logs";

export default function MaintenanceHistoryClient() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modulo, setModulo] = useState("");
  const [search, setSearch] = useState("");

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

  return (
    <Box>
      <Flex direction="column" gap="4" mb="5">
        <Box>
          <Text size={{ initial: "5", sm: "6" }} weight="bold" color="indigo" as="div">Historial de mantenimiento</Text>
          <Text size={{ initial: "1", sm: "2" }} color="gray">
            Bitácora técnica del sistema: calibraciones, desconexiones y desactivaciones de dispositivos.
          </Text>
        </Box>
      </Flex>

      <Card size={{ initial: "2", sm: "3" }} mb="4" style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
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
            <Text color="gray" size="2">No hay registros de mantenimiento.</Text>
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
                {filtrados.map((log) => (
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
      </Card>
    </Box>
  );
}
