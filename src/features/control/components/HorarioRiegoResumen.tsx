"use client";

import React, { useEffect, useState } from "react";
import { Box, Card, Flex, Text, Badge } from "@radix-ui/themes";
import { listarHorariosRiego } from "@/actions/control";

interface HorarioRiegoResumenProps {
  idAsignacion: number | null | undefined;
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function toSegundos(hora: string): number {
  const [h, m, s] = String(hora).split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

// JS: 0=domingo..6=sábado -> backend: 0=lunes..6=domingo
function diaBackend(fecha: Date): number {
  return (fecha.getDay() + 6) % 7;
}

// Misma regla que _hora_en_ventana del backend: admite cruce de medianoche
// y hora_inicio == hora_fin significa "todo el dia".
function horaEnVentana(actual: number, inicio: number, fin: number): boolean {
  if (inicio === fin) return true;
  if (inicio < fin) return actual >= inicio && actual < fin;
  return actual >= inicio || actual < fin;
}

// Replica horario_permite_ahora del backend: sin horarios activos la IA no
// evalua; "siempre activo" permite siempre; una franja solo si el dia y la
// hora local actuales caen dentro de la ventana.
function horarioPermite(horarios: any[], ahora: Date): boolean {
  const activos = horarios.filter((h) => h.activo);
  const diaActual = diaBackend(ahora);
  const actualSeg = ahora.getHours() * 3600 + ahora.getMinutes() * 60 + ahora.getSeconds();
  return activos.some((h) => {
    if (h.siempre_activo) return true;
    const dias: number[] = h.dias_semana || [];
    if (dias.length && !dias.includes(diaActual)) return false;
    if (!h.hora_inicio || !h.hora_fin) return false;
    return horaEnVentana(actualSeg, toSegundos(h.hora_inicio), toSegundos(h.hora_fin));
  });
}

// Proxima apertura de ventana (hora_inicio) de cualquier horario activo con franja.
function proximaApertura(horarios: any[], ahora: Date): Date | null {
  let proxima: Date | null = null;
  for (const h of horarios) {
    if (!h.activo || h.siempre_activo || !h.hora_inicio) continue;
    const dias: number[] = h.dias_semana || [];
    const [hh, mm] = String(h.hora_inicio).split(":").map(Number);
    for (let offset = 0; offset <= 7; offset++) {
      const candidata = new Date(ahora);
      candidata.setDate(ahora.getDate() + offset);
      candidata.setHours(hh, mm, 0, 0);
      if (candidata <= ahora) continue;
      if (dias.length && !dias.includes(diaBackend(candidata))) continue;
      if (!proxima || candidata < proxima) proxima = candidata;
      break;
    }
  }
  return proxima;
}

function formatearProxima(fecha: Date, ahora: Date): string {
  const hora = fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const manana = new Date(ahora);
  manana.setDate(ahora.getDate() + 1);
  if (fecha.toDateString() === ahora.toDateString()) return `hoy a las ${hora}`;
  if (fecha.toDateString() === manana.toDateString()) return `mañana a las ${hora}`;
  return `el ${DIAS[diaBackend(fecha)]} a las ${hora}`;
}

export function HorarioRiegoResumen({ idAsignacion }: HorarioRiegoResumenProps) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    if (!idAsignacion) return;
    let cancelado = false;
    setLoading(true);
    listarHorariosRiego(idAsignacion).then((res) => {
      if (cancelado) return;
      setLoading(false);
      if (res.success) setHorarios(res.data || []);
    });
    return () => {
      cancelado = true;
    };
  }, [idAsignacion]);

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!idAsignacion) return null;

  const activos = horarios.filter((h) => h.activo);
  const permite = horarioPermite(horarios, ahora);
  const proxima = permite ? null : proximaApertura(horarios, ahora);

  return (
    <Card
      size="3"
      style={{
        background: "var(--surface-mockup)",
        borderColor: "var(--border-mockup)",
        borderRadius: "16px",
      }}
    >
      <Flex direction="column" gap="4">
        <Flex justify="between" align="start" wrap="wrap" gap="2">
          <Box>
            <Text size="3" weight="bold" color="indigo" as="div">
              ⏰ Programación de Riego
            </Text>
            <Text size="2" color="gray" mt="1" as="div">
              Franjas horarias en las que la IA puede evaluar y regar automáticamente.
            </Text>
          </Box>
          {!loading && (
            <Badge color={permite ? "green" : activos.length ? "amber" : "gray"} variant="soft">
              {permite ? "Dentro de horario" : activos.length ? "Fuera de horario" : "Sin programación"}
            </Badge>
          )}
        </Flex>

        {loading ? (
          <Text color="gray" size="2">Cargando...</Text>
        ) : horarios.length === 0 ? (
          <Text color="gray" size="2">
            No hay horarios configurados: el riego automático por IA no se ejecutará. Configúralos en la pestaña
            &quot;Horarios de Riego&quot;.
          </Text>
        ) : (
          <>
            <Text size="2" color="gray">
              {permite
                ? "Ahora mismo la IA tiene permitido evaluar y regar si los sensores lo requieren."
                : activos.length === 0
                ? "Todos los horarios están pausados: el riego automático por IA no se ejecutará."
                : proxima
                ? `La IA no evaluará hasta la próxima ventana, ${formatearProxima(proxima, ahora)}.`
                : "La IA no evaluará riegos en este momento."}
            </Text>
            <Flex direction="column" gap="2">
              {horarios.map((h) => (
                <Flex
                  key={h.id}
                  align="center"
                  justify="between"
                  gap="2"
                  wrap="wrap"
                  p="2"
                  style={{
                    background: "var(--surface2-mockup)",
                    border: "1px solid var(--border-mockup)",
                    borderRadius: "10px",
                    opacity: h.activo ? 1 : 0.6,
                  }}
                >
                  <Flex align="center" gap="2" wrap="wrap">
                    <Text weight="bold" style={{ color: "white", fontFamily: "monospace" }}>
                      {h.siempre_activo
                        ? "🔄 Siempre activo"
                        : `${String(h.hora_inicio).slice(0, 5)} – ${String(h.hora_fin).slice(0, 5)}`}
                    </Text>
                    {!h.siempre_activo && (
                      <Text size="1" color="gray">
                        {(h.dias_semana || []).length === 0 || h.dias_semana.length === 7
                          ? "Todos los días"
                          : h.dias_semana.map((d: number) => DIAS[d]).join(", ")}
                      </Text>
                    )}
                  </Flex>
                  <Badge color={h.activo ? "green" : "gray"} variant="soft" size="1">
                    {h.activo ? "Activo" : "Pausado"}
                  </Badge>
                </Flex>
              ))}
            </Flex>
          </>
        )}
      </Flex>
    </Card>
  );
}
