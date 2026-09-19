"use client";

import React, { useEffect, useState } from "react";
import { Box, Card, Flex, Text, Badge, Button, TextField, Switch } from "@radix-ui/themes";
import {
  listarHorariosRiego,
  crearHorarioRiego,
  actualizarHorarioRiego,
  eliminarHorarioRiego,
} from "@/actions/control";

interface HorarioRiegoPanelProps {
  idAsignacion: number | null | undefined;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Duración en minutos del rango horaInicio->horaFin, admitiendo cruce de
// medianoche (ej. 23:50 -> 00:10 dura 20 min). Retorna null si las horas
// son iguales (rango inválido/ambiguo).
function duracionMinutos(horaInicio: string, horaFin: string): number | null {
  const inicio = toMinutes(horaInicio);
  const fin = toMinutes(horaFin);
  if (inicio === fin) return null;
  return fin > inicio ? fin - inicio : 24 * 60 - inicio + fin;
}

const DIAS = [
  { value: 0, label: "Lun" },
  { value: 1, label: "Mar" },
  { value: 2, label: "Mié" },
  { value: 3, label: "Jue" },
  { value: 4, label: "Vie" },
  { value: 5, label: "Sáb" },
  { value: 6, label: "Dom" },
];

export function HorarioRiegoPanel({ idAsignacion }: HorarioRiegoPanelProps) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [siempreActivo, setSiempreActivo] = useState(false);
  const [horaInicio, setHoraInicio] = useState("06:00");
  const [horaFin, setHoraFin] = useState("06:10");
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [saving, setSaving] = useState(false);

  const cargarHorarios = async () => {
    if (!idAsignacion) return;
    setLoading(true);
    const res = await listarHorariosRiego(idAsignacion);
    setLoading(false);
    if (res.success) setHorarios(res.data || []);
  };

  useEffect(() => {
    cargarHorarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idAsignacion]);

  const toggleDia = (dia: number) => {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    );
  };

  const handleCrear = async () => {
    if (!idAsignacion) return;

    if (!siempreActivo) {
      const duracion = duracionMinutos(horaInicio, horaFin);
      if (duracion === null) {
        alert("La hora de fin no puede ser igual a la hora de inicio.");
        return;
      }
      if (duracion > 60) {
        alert("El rango de riego no puede superar 60 minutos.");
        return;
      }
    }

    setSaving(true);
    const res = await crearHorarioRiego({
      idAsignacion,
      siempreActivo,
      horaInicio: siempreActivo ? undefined : `${horaInicio}:00`,
      horaFin: siempreActivo ? undefined : `${horaFin}:00`,
      diasSemana: diasSeleccionados,
    });
    setSaving(false);
    if (res.success) {
      await cargarHorarios();
    } else {
      alert(`❌ Error al crear el horario: ${res.error}`);
    }
  };

  const handleToggleActivo = async (horario: any) => {
    const res = await actualizarHorarioRiego(horario.id, { activo: !horario.activo });
    if (res.success) {
      await cargarHorarios();
    } else {
      alert(`❌ Error al actualizar: ${res.error}`);
    }
  };

  const handleEliminar = async (idHorario: number) => {
    if (!confirm("¿Eliminar este horario fijo de riego?")) return;
    const res = await eliminarHorarioRiego(idHorario);
    if (res.success) {
      await cargarHorarios();
    } else {
      alert(`❌ Error al eliminar: ${res.error}`);
    }
  };

  if (!idAsignacion) {
    return (
      <Card size="2" style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
        <Text color="gray" size="2">No hay un actuador de riego asignado a este cultivo.</Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="5">
      <Card size={{ initial: "2", sm: "3" }} style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
        <Text size="3" weight="bold" color="indigo" mb="3" as="div">
          ⏰ Nuevo horario fijo de riego
        </Text>
        <Flex direction="column" gap="3">
          <Flex align="center" gap="2" p="2" style={{ background: "rgba(99, 102, 241, 0.08)", borderRadius: "10px" }}>
            <Switch checked={siempreActivo} onCheckedChange={setSiempreActivo} style={{ cursor: "pointer" }} />
            <Box>
              <Text size="2" weight="bold" style={{ color: "white" }} as="div">🔄 Siempre activo</Text>
              <Text size="1" color="gray">Sin franja horaria fija: deja que la IA decida regar en cualquier momento del día.</Text>
            </Box>
          </Flex>

          {!siempreActivo && (
            <>
              <Flex gap="3" wrap="wrap" align="end">
                <Box>
                  <Text size="1" color="gray" as="div" mb="1">Hora de inicio</Text>
                  <TextField.Root
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    style={{ background: "var(--surface2-mockup)", border: "1px solid var(--border-mockup)", width: "140px" }}
                  />
                </Box>
                <Box>
                  <Text size="1" color="gray" as="div" mb="1">Hora de fin</Text>
                  <TextField.Root
                    type="time"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    style={{ background: "var(--surface2-mockup)", border: "1px solid var(--border-mockup)", width: "140px" }}
                  />
                </Box>
              </Flex>
              <Text size="1" color="gray">
                El riego se ejecutará automáticamente de {horaInicio} a {horaFin}
                {(() => {
                  const d = duracionMinutos(horaInicio, horaFin);
                  if (d === null) return ".";
                  const cruzaMedianoche = horaFin <= horaInicio;
                  return ` (${d} min${cruzaMedianoche ? ", cruza la medianoche" : ""}).`;
                })()}
              </Text>
            </>
          )}
          {!siempreActivo && (
            <Box>
              <Text size="1" color="gray" as="div" mb="1">Días de la semana</Text>
              <Flex gap="1.5" wrap="wrap">
                {DIAS.map((d) => (
                  <Button
                    key={d.value}
                    size="1"
                    variant={diasSeleccionados.includes(d.value) ? "solid" : "soft"}
                    color={diasSeleccionados.includes(d.value) ? "indigo" : "gray"}
                    onClick={() => toggleDia(d.value)}
                    style={{ cursor: "pointer" }}
                  >
                    {d.label}
                  </Button>
                ))}
              </Flex>
            </Box>
          )}
          <Flex justify="end">
            <Button color="green" onClick={handleCrear} disabled={saving} style={{ cursor: "pointer" }}>
              {saving ? "Guardando..." : "+ Agregar horario"}
            </Button>
          </Flex>
        </Flex>
      </Card>

      <Card size={{ initial: "2", sm: "3" }} style={{ background: "var(--surface-mockup)", borderColor: "var(--border-mockup)", borderRadius: "16px" }}>
        <Text size="3" weight="bold" color="indigo" mb="3" as="div">
          📅 Horarios configurados
        </Text>
        {loading ? (
          <Text color="gray" size="2">Cargando...</Text>
        ) : horarios.length === 0 ? (
          <Text color="gray" size="2">No hay horarios fijos configurados para este cultivo.</Text>
        ) : (
          <Flex direction="column" gap="2">
            {horarios.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 flex-wrap"
              >
                <div>
                  <Flex align="center" gap="2">
                    {h.siempre_activo ? (
                      <Text weight="bold" style={{ color: "white" }}>🔄 Siempre activo</Text>
                    ) : (
                      <>
                        <Text weight="bold" style={{ color: "white" }}>
                          {String(h.hora_inicio).slice(0, 5)} – {String(h.hora_fin).slice(0, 5)}
                        </Text>
                        <Badge color="indigo" variant="soft" size="1">{Math.round(h.duracion_segundos / 60)} min</Badge>
                      </>
                    )}
                    <Badge color={h.activo ? "green" : "gray"} variant="soft" size="1">
                      {h.activo ? "Activo" : "Pausado"}
                    </Badge>
                  </Flex>
                  <Text size="1" color="gray" style={{ display: "block", marginTop: "4px" }}>
                    {h.siempre_activo
                      ? "La IA evalúa continuamente si conviene regar, en cualquier momento."
                      : (h.dias_semana || []).map((d: number) => DIAS.find((x) => x.value === d)?.label).join(", ") || "Todos los días"}
                  </Text>
                </div>
                <Flex align="center" gap="2">
                  <Switch checked={h.activo} onCheckedChange={() => handleToggleActivo(h)} style={{ cursor: "pointer" }} />
                  <Button size="1" variant="soft" color="red" onClick={() => handleEliminar(h.id)} style={{ cursor: "pointer" }}>
                    Eliminar
                  </Button>
                </Flex>
              </div>
            ))}
          </Flex>
        )}
      </Card>
    </Flex>
  );
}
