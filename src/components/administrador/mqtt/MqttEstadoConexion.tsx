"use client";

import React from "react";
import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { RefreshCw } from "lucide-react";
import { StatusDot, tone, type Tone } from "@/components/ui/yaku-ui";
import type { EstadoMqtt } from "@/actions/mqttConfig";

const PRESENTACION: Record<EstadoMqtt["estado"], { t: Tone; titulo: string }> = {
  conectado: { t: "green", titulo: "Backend conectado al broker" },
  conectando: { t: "amber", titulo: "Conectando con el broker..." },
  error: { t: "red", titulo: "El backend no puede conectarse al broker" },
  desconectado: { t: "amber", titulo: "Backend desconectado del broker" },
};

// El backend envía fechas UTC sin zona ("2026-09-27T06:05:12"): se marcan como UTC.
export function fechaUtc(valor: string | null): Date | null {
  if (!valor) return null;
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(valor) ? valor : `${valor}Z`);
}

function hace(fecha: Date | null): string {
  if (!fecha) return "";
  const seg = Math.max(0, Math.round((Date.now() - fecha.getTime()) / 1000));
  if (seg < 60) return "hace unos segundos";
  if (seg < 3600) return `hace ${Math.round(seg / 60)} min`;
  return `desde ${fecha.toLocaleString()}`;
}

export default function MqttEstadoConexion({
  estado,
  error,
  consultando,
  onActualizar,
}: {
  estado: EstadoMqtt | null;
  error: string | null;
  consultando: boolean;
  onActualizar: () => void;
}) {
  const p = estado ? PRESENTACION[estado.estado] : { t: "gray" as Tone, titulo: "Consultando estado..." };
  const c = tone(error ? "gray" : p.t);
  const esError = estado?.estado === "error";

  return (
    <Box
      role="status"
      aria-live="polite"
      p="3"
      style={{ background: c.bg, border: `1px solid ${c.brd}`, borderRadius: "10px" }}
    >
      <Flex align="start" justify="between" gap="3" wrap="wrap">
        <Flex align="start" gap="2" style={{ flex: "1 1 260px", minWidth: 0 }}>
          <Box pt="1"><StatusDot t={error ? "gray" : p.t} pulse={estado?.estado === "conectando"} /></Box>
          <Box style={{ minWidth: 0 }}>
            <Text size="2" weight="bold" as="div" style={{ color: c.fg }}>
              {error ? "No se pudo consultar el estado" : p.titulo}
            </Text>
            {error ? (
              <Text size="1" color="gray" as="div">{error}</Text>
            ) : estado && (
              <>
                {estado.estado !== "conectado" && estado.mensaje && (
                  <Text size="1" as="div" style={{ color: "var(--foreground)", marginTop: 2 }}>{estado.mensaje}</Text>
                )}
                <Text size="1" color="gray" as="div" style={{ marginTop: 2 }}>
                  {estado.host}:{estado.port}
                  {estado.username && <> · usuario <span style={{ fontFamily: "var(--font-mono)" }}>{estado.username}</span></>}
                  {estado.tls ? " · TLS" : " · sin TLS"}
                  {estado.desde && <> · {hace(fechaUtc(estado.desde))}</>}
                </Text>
                {esError && (
                  <Text size="1" as="div" style={{ color: c.fg, marginTop: 6 }}>
                    Verifique en el broker (HiveMQ &gt; Gestión de acceso) que el usuario exista con permiso
                    "Publicar y suscribirse", corrija abajo el usuario o la contraseña y pulse "Guardar y reconectar".
                    El backend sigue reintentando solo mientras tanto.
                  </Text>
                )}
              </>
            )}
          </Box>
        </Flex>
        <Button size="1" variant="soft" color="gray" onClick={onActualizar} disabled={consultando} style={{ cursor: "pointer" }}>
          <RefreshCw size={13} /> Actualizar
        </Button>
      </Flex>
    </Box>
  );
}
