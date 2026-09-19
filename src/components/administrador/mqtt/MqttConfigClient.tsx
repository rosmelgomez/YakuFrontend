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

      {/* Ayuda memoria: cómo configurar el broker MQTT */}
      <Card
        size="2"
        mb="4"
        style={{
          background: "rgba(59, 130, 246, 0.06)",
          borderColor: "rgba(59, 130, 246, 0.25)",
          borderRadius: "12px",
          padding: "16px",
        }}
      >
        <Flex gap="3" align="start">
          <Text size="5" style={{ marginTop: "-2px" }}>
            ℹ️
          </Text>
          <Box>
            <Text size="2" weight="bold" style={{ color: "#93c5fd" }} as="div">
              Ayuda memoria: ¿cómo configuro el broker MQTT?
            </Text>
            <Text size="1" color="gray" style={{ display: "block", marginTop: "4px", lineHeight: "1.5" }}>
              Estos son los datos de conexión del servidor MQTT (por ejemplo HiveMQ Cloud) al
              que se conectan todos los nodos ESP32 para enviar telemetría y recibir órdenes.
              Complete cada campo con los datos que le entregó su proveedor del broker:
            </Text>
            <Text size="1" color="gray" style={{ display: "block", marginTop: "8px", lineHeight: "1.5" }}>
              <strong style={{ color: "#c7d2fe" }}>Host:</strong> la dirección del servidor, sin
              "https://" (ej: <span style={{ fontFamily: "monospace" }}>xxxxxx.s1.eu.hivemq.cloud</span>).
            </Text>
            <Text size="1" color="gray" style={{ display: "block", marginTop: "4px", lineHeight: "1.5" }}>
              <strong style={{ color: "#c7d2fe" }}>Puerto:</strong> normalmente <span style={{ fontFamily: "monospace" }}>8883</span> si usa TLS (recomendado), o <span style={{ fontFamily: "monospace" }}>1883</span> sin cifrado.
            </Text>
            <Text size="1" color="gray" style={{ display: "block", marginTop: "4px", lineHeight: "1.5" }}>
              <strong style={{ color: "#c7d2fe" }}>Usuario / Contraseña:</strong> las credenciales
              del broker. Si deja la contraseña vacía al guardar, se conserva la que ya estaba
              guardada (no se borra).
            </Text>
            <Text size="1" color="gray" style={{ display: "block", marginTop: "4px", lineHeight: "1.5" }}>
              <strong style={{ color: "#c7d2fe" }}>TLS:</strong> manténgalo activado salvo que su
              broker sea local/de pruebas sin cifrado.
            </Text>
            <Text
              size="1"
              color="gray"
              style={{ display: "block", marginTop: "8px", lineHeight: "1.5", fontStyle: "italic" }}
            >
              Al presionar "Guardar y reconectar", el backend se desconecta del broker actual y
              se vuelve a conectar de inmediato con los nuevos datos — los nodos ESP32 que usen
              credenciales distintas dejarán de comunicarse hasta que también se actualicen.
              Verifique los datos antes de guardar: un valor incorrecto puede dejar a todos los
              dispositivos sin conexión hasta que se corrija.
            </Text>
          </Box>
        </Flex>
      </Card>

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
