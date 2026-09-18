"use client";

import React, { useEffect, useState } from "react";
import { Box, Card, Flex, Text, Button, TextField, Switch } from "@radix-ui/themes";
import { Radio } from "lucide-react";
import { obtenerMqttConfig, actualizarMqttConfig } from "@/actions/mqttConfig";

export default function MqttConfigClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8883");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usarTls, setUsarTls] = useState(true);
  const [fechaActualizacion, setFechaActualizacion] = useState<string | null>(null);

  useEffect(() => {
    obtenerMqttConfig().then((res) => {
      setLoading(false);
      if (res.success) {
        setHost(res.data.host || "");
        setPort(String(res.data.port ?? 8883));
        setUsername(res.data.username || "");
        setUsarTls(!!res.data.usar_tls);
        setFechaActualizacion(res.data.fecha_actualizacion || null);
      } else {
        setError(res.error);
      }
    });
  }, []);

  const handleGuardar = async () => {
    const portNum = parseInt(port, 10);
    if (!host.trim() || isNaN(portNum)) {
      alert("Ingrese un host y puerto válidos.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await actualizarMqttConfig({
      host: host.trim(),
      port: portNum,
      username: username.trim(),
      password: password.trim(),
      usarTls,
    });
    setSaving(false);
    if (res.success) {
      setPassword("");
      setFechaActualizacion(res.data.fecha_actualizacion || null);
      alert("✅ Configuración MQTT guardada. La conexión se reinició con los nuevos parámetros.");
    } else {
      setError(res.error);
    }
  };

  return (
    <Box>
      <Flex direction="column" gap="4" mb="5">
        <Box>
          <Text size={{ initial: "5", sm: "6" }} weight="bold" color="indigo" as="div">Configuración MQTT</Text>
          <Text size={{ initial: "1", sm: "2" }} color="gray">
            Broker al que se conectan los nodos ESP32. Al guardar, la conexión del backend se reinicia en caliente.
          </Text>
        </Box>
      </Flex>

      <Card size={{ initial: "2", sm: "3" }} style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
        {loading ? (
          <Text color="gray" size="2">Cargando configuración...</Text>
        ) : (
          <Flex direction="column" gap="4">
            <Flex align="center" gap="3" mb="1">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                <Radio className="w-5 h-5 text-indigo-400" />
              </div>
              <Box>
                <Text weight="bold" style={{ color: "white" }} as="div">Broker MQTT</Text>
                {fechaActualizacion && (
                  <Text size="1" color="gray">Última actualización: {new Date(fechaActualizacion).toLocaleString()}</Text>
                )}
              </Box>
            </Flex>

            <Flex gap="3" wrap="wrap">
              <Box style={{ flex: "2 1 220px" }}>
                <Text size="1" color="gray" as="div" mb="1">Host</Text>
                <TextField.Root
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="broker.hivemq.cloud"
                  style={{ background: "var(--surface2-mockup)", border: "1px solid var(--border-mockup)" }}
                />
              </Box>
              <Box style={{ flex: "1 1 100px" }}>
                <Text size="1" color="gray" as="div" mb="1">Puerto</Text>
                <TextField.Root
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  style={{ background: "var(--surface2-mockup)", border: "1px solid var(--border-mockup)" }}
                />
              </Box>
            </Flex>

            <Flex gap="3" wrap="wrap">
              <Box style={{ flex: "1 1 220px" }}>
                <Text size="1" color="gray" as="div" mb="1">Usuario</Text>
                <TextField.Root
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ background: "var(--surface2-mockup)", border: "1px solid var(--border-mockup)" }}
                />
              </Box>
              <Box style={{ flex: "1 1 220px" }}>
                <Text size="1" color="gray" as="div" mb="1">Contraseña (dejar vacío para no cambiarla)</Text>
                <TextField.Root
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ background: "var(--surface2-mockup)", border: "1px solid var(--border-mockup)" }}
                />
              </Box>
            </Flex>

            <Flex align="center" gap="2">
              <Switch checked={usarTls} onCheckedChange={setUsarTls} style={{ cursor: "pointer" }} />
              <Text size="2" color="gray">Usar TLS</Text>
            </Flex>

            {error && (
              <Box p="2" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px" }}>
                <Text color="red" size="1">{error}</Text>
              </Box>
            )}

            <Flex justify="end">
              <Button color="indigo" onClick={handleGuardar} disabled={saving} style={{ cursor: "pointer" }}>
                {saving ? "Guardando..." : "Guardar y reconectar"}
              </Button>
            </Flex>
          </Flex>
        )}
      </Card>
    </Box>
  );
}
