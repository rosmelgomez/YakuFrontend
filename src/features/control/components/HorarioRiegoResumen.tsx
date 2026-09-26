"use client";

import React, { useEffect, useState } from "react";
import { Box, Flex, Grid, Text, Badge } from "@radix-ui/themes";
import { CalendarClock, Repeat } from "lucide-react";
import { Inset, Panel, SectionHeader, StatusDot, tone, type Tone } from "./ui";
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

  const estadoTone: Tone = permite ? "green" : activos.length ? "amber" : "gray";

  return (
    <Panel>
      <Flex direction="column" gap="4">
        <SectionHeader
          icon={CalendarClock}
          t="green"
          title="Programación de riego"
          description="Franjas horarias en las que la IA puede evaluar y regar automáticamente."
          aside={
            !loading && (
              <Badge color={permite ? "green" : activos.length ? "amber" : "gray"} variant="soft">
                <StatusDot t={estadoTone} pulse={permite} />
                {permite ? "Dentro de horario" : activos.length ? "Fuera de horario" : "Sin programación"}
              </Badge>
            )
          }
        />

        {loading ? (
          <Flex direction="column" gap="2" aria-busy="true" aria-label="Cargando horarios">
            {[0, 1].map((i) => (
              <Box
                key={i}
                style={{
                  height: 40,
                  borderRadius: 10,
                  background: "var(--surface2-mockup)",
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          </Flex>
        ) : activos.length === 0 ? (
          <Inset>
            <Text color="gray" size="2">
              No hay horarios activos: el riego automático por IA no se ejecutará. Configúralos o actívalos en la
              pestaña &quot;Horarios de Riego&quot;.
            </Text>
          </Inset>
        ) : (
          <>
            <Text size="2" style={{ color: permite ? tone("green").fg : "var(--muted-foreground)" }}>
              {permite
                ? "Ahora mismo la IA tiene permitido evaluar y regar si los sensores lo requieren."
                : proxima
                ? `La IA no evaluará hasta la próxima ventana, ${formatearProxima(proxima, ahora)}.`
                : "La IA no evaluará riegos en este momento."}
            </Text>
            <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="2">
              {activos.map((h) => (
                <Inset key={h.id} style={{ padding: "10px 12px" }}>
                  {h.siempre_activo ? (
                    <Flex align="center" gap="2">
                      <Repeat size={14} aria-hidden style={{ color: tone("green").fg }} />
                      <Text size="3" weight="bold" style={{ color: "var(--foreground)" }}>
                        Siempre activo
                      </Text>
                    </Flex>
                  ) : (
                    <>
                      <Text
                        size="3"
                        weight="bold"
                        as="div"
                        className="control-num"
                        style={{ color: "var(--foreground)" }}
                      >
                        {String(h.hora_inicio).slice(0, 5)} – {String(h.hora_fin).slice(0, 5)}
                      </Text>
                      <Text size="1" color="gray" as="div" mt="1">
                        {(h.dias_semana || []).length === 0 || h.dias_semana.length === 7
                          ? "Todos los días"
                          : h.dias_semana.map((d: number) => DIAS[d]).join(", ")}
                      </Text>
                    </>
                  )}
                </Inset>
              ))}
            </Grid>
          </>
        )}
      </Flex>
    </Panel>
  );
}
