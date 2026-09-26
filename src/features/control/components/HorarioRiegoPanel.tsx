"use client";

import React, { useEffect, useState } from "react";
import { Box, Flex, Text, Badge, Button, TextField, Switch } from "@radix-ui/themes";
import { CalendarClock, CalendarPlus, Check, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { Inset, Panel, SectionHeader, tone } from "./ui";
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

// Ancho en minutos de la ventana horaInicio->horaFin durante la cual se
// permite regar (no es un evento unico: dentro de ella la IA sigue
// respetando el tiempo de riego por ciclo y el cooldown configurados
// aparte). Admite cruce de medianoche (ej. 23:50 -> 00:10 dura 20 min).
// Si ambas horas son iguales, se interpreta como "todo el dia" (24h).
function duracionMinutos(horaInicio: string, horaFin: string): number {
  const inicio = toMinutes(horaInicio);
  const fin = toMinutes(horaFin);
  if (inicio === fin) return 24 * 60;
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
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editHoraInicio, setEditHoraInicio] = useState("06:00");
  const [editHoraFin, setEditHoraFin] = useState("06:10");
  const [editDias, setEditDias] = useState<number[]>([]);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

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

  const iniciarEdicion = (horario: any) => {
    setEditandoId(horario.id);
    setEditHoraInicio(String(horario.hora_inicio).slice(0, 5));
    setEditHoraFin(String(horario.hora_fin).slice(0, 5));
    setEditDias(horario.dias_semana || []);
  };

  const toggleEditDia = (dia: number) => {
    setEditDias((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    );
  };

  const handleGuardarEdicion = async () => {
    if (editandoId === null) return;
    setGuardandoEdicion(true);
    const res = await actualizarHorarioRiego(editandoId, {
      horaInicio: `${editHoraInicio}:00`,
      horaFin: `${editHoraFin}:00`,
      diasSemana: editDias,
    });
    setGuardandoEdicion(false);
    if (res.success) {
      setEditandoId(null);
      await cargarHorarios();
    } else {
      alert(`❌ Error al actualizar el horario: ${res.error}`);
    }
  };

  const handleEliminar = async (idHorario: number) => {
    if (!confirm("¿Eliminar este horario de riego?")) return;
    const res = await eliminarHorarioRiego(idHorario);
    if (res.success) {
      await cargarHorarios();
    } else {
      alert(`❌ Error al eliminar: ${res.error}`);
    }
  };

  if (!idAsignacion) {
    return (
      <Panel>
        <SectionHeader
          icon={CalendarClock}
          t="gray"
          title="Horarios de riego"
          description="No hay un actuador de riego asignado a este cultivo."
        />
      </Panel>
    );
  }

  const timeFieldStyle: React.CSSProperties = { background: "var(--bg-mockup)", width: "140px" };

  const renderDias = (seleccion: number[], onToggle: (dia: number) => void) => (
    <Flex gap="1" wrap="wrap" role="group" aria-label="Días de la semana">
      {DIAS.map((d) => {
        const activo = seleccion.includes(d.value);
        return (
          <Button
            key={d.value}
            size="1"
            variant={activo ? "solid" : "soft"}
            color={activo ? undefined : "gray"}
            aria-pressed={activo}
            onClick={() => onToggle(d.value)}
            style={{ cursor: "pointer", minWidth: 44 }}
          >
            {d.label}
          </Button>
        );
      })}
    </Flex>
  );

  return (
    <Flex direction="column" gap="4">
      <Panel>
        <Flex direction="column" gap="4">
          <SectionHeader
            icon={CalendarPlus}
            t="green"
            title="Nuevo horario de riego"
            description="Define la ventana en la que la IA puede evaluar y regar automáticamente."
          />

          <Inset style={{ padding: "12px 14px" }}>
            <Text as="label" size="2" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <Switch checked={siempreActivo} onCheckedChange={setSiempreActivo} />
              <Box>
                <Text size="2" weight="bold" style={{ color: "var(--foreground)" }} as="div">
                  Siempre activo
                </Text>
                <Text size="1" color="gray" as="div">
                  Sin franja horaria: deja que la IA decida regar en cualquier momento del día.
                </Text>
              </Box>
            </Text>
          </Inset>

          {!siempreActivo && (
            <>
              <Flex gap="3" wrap="wrap" align="end">
                <label>
                  <Text size="1" as="div" mb="1" style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>
                    Hora de inicio
                  </Text>
                  <TextField.Root
                    type="time"
                    size="3"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    style={timeFieldStyle}
                  />
                </label>
                <label>
                  <Text size="1" as="div" mb="1" style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>
                    Hora de fin
                  </Text>
                  <TextField.Root
                    type="time"
                    size="3"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    style={timeFieldStyle}
                  />
                </label>
              </Flex>
              <Text size="1" color="gray" style={{ maxWidth: "70ch", marginTop: -4 }}>
                La IA podrá evaluar y regar automáticamente entre{" "}
                <strong className="control-num" style={{ color: "var(--foreground)" }}>
                  {horaInicio}
                </strong>{" "}
                y{" "}
                <strong className="control-num" style={{ color: "var(--foreground)" }}>
                  {horaFin}
                </strong>
                {(() => {
                  if (horaInicio === horaFin) return " (todo el día).";
                  const d = duracionMinutos(horaInicio, horaFin);
                  const cruzaMedianoche = horaFin <= horaInicio;
                  return ` (${d} min${cruzaMedianoche ? ", cruza la medianoche" : ""}).`;
                })()}{" "}
                Fuera de esta ventana no se evaluará ni regará automáticamente.
              </Text>
              <Box>
                <Text size="1" as="div" mb="2" style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>
                  Días de la semana
                </Text>
                {renderDias(diasSeleccionados, toggleDia)}
              </Box>
            </>
          )}

          <Flex justify="end">
            <Button onClick={handleCrear} loading={saving} disabled={saving} style={{ cursor: "pointer" }}>
              <Plus size={15} aria-hidden />
              Agregar horario
            </Button>
          </Flex>
        </Flex>
      </Panel>

      <Panel>
        <Flex direction="column" gap="4">
          <SectionHeader
            icon={CalendarClock}
            t="blue"
            title="Horarios configurados"
            aside={
              !loading &&
              horarios.length > 0 && (
                <Text size="1" color="gray" className="control-num">
                  {horarios.filter((h) => h.activo).length} de {horarios.length} activos
                </Text>
              )
            }
          />
          {loading ? (
            <Text color="gray" size="2">
              Cargando...
            </Text>
          ) : horarios.length === 0 ? (
            <Inset>
              <Text color="gray" size="2">
                No hay horarios de riego configurados para este cultivo.
              </Text>
            </Inset>
          ) : (
            <Flex direction="column" gap="2">
              {horarios.map((h) =>
                editandoId === h.id ? (
                  <Inset key={h.id} style={{ borderColor: tone("green").brd }}>
                    <Flex direction="column" gap="3">
                      <Flex gap="3" wrap="wrap" align="end">
                        <label>
                          <Text size="1" as="div" mb="1" style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>
                            Hora de inicio
                          </Text>
                          <TextField.Root
                            type="time"
                            size="3"
                            value={editHoraInicio}
                            onChange={(e) => setEditHoraInicio(e.target.value)}
                            style={timeFieldStyle}
                          />
                        </label>
                        <label>
                          <Text size="1" as="div" mb="1" style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>
                            Hora de fin
                          </Text>
                          <TextField.Root
                            type="time"
                            size="3"
                            value={editHoraFin}
                            onChange={(e) => setEditHoraFin(e.target.value)}
                            style={timeFieldStyle}
                          />
                        </label>
                        <Badge color="gray" variant="soft" size="1" mb="3" className="control-num">
                          {editHoraInicio === editHoraFin
                            ? "todo el día"
                            : `${duracionMinutos(editHoraInicio, editHoraFin)} min`}
                        </Badge>
                      </Flex>
                      {renderDias(editDias, toggleEditDia)}
                      <Flex justify="end" gap="2">
                        <Button
                          size="2"
                          variant="soft"
                          color="gray"
                          onClick={() => setEditandoId(null)}
                          disabled={guardandoEdicion}
                          style={{ cursor: "pointer" }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="2"
                          onClick={handleGuardarEdicion}
                          loading={guardandoEdicion}
                          disabled={guardandoEdicion || !editHoraInicio || !editHoraFin}
                          style={{ cursor: "pointer" }}
                        >
                          <Check size={15} aria-hidden />
                          Guardar
                        </Button>
                      </Flex>
                    </Flex>
                  </Inset>
                ) : (
                  <Inset key={h.id} style={{ opacity: h.activo ? 1 : 0.7, transition: "opacity 200ms" }}>
                    <Flex align="center" justify="between" gap="3" wrap="wrap">
                      <Box style={{ minWidth: 0, flex: "1 1 220px" }}>
                        <Flex align="center" gap="2" wrap="wrap">
                          {h.siempre_activo ? (
                            <Flex align="center" gap="2">
                              <Repeat size={15} aria-hidden style={{ color: tone("green").fg }} />
                              <Text size="3" weight="bold" style={{ color: "var(--foreground)" }}>
                                Siempre activo
                              </Text>
                            </Flex>
                          ) : (
                            <>
                              <Text size="3" weight="bold" className="control-num" style={{ color: "var(--foreground)" }}>
                                {String(h.hora_inicio).slice(0, 5)} – {String(h.hora_fin).slice(0, 5)}
                              </Text>
                              <Badge color="gray" variant="soft" size="1" className="control-num">
                                {h.hora_inicio === h.hora_fin
                                  ? "todo el día"
                                  : `${Math.round(h.duracion_segundos / 60)} min`}
                              </Badge>
                            </>
                          )}
                          <Badge color={h.activo ? "green" : "gray"} variant="soft" size="1">
                            {h.activo ? "Activo" : "Pausado"}
                          </Badge>
                        </Flex>
                        <Text size="1" color="gray" as="div" mt="1">
                          {h.siempre_activo
                            ? "La IA evalúa continuamente si conviene regar, en cualquier momento."
                            : `IA habilitada ${
                                (h.dias_semana || [])
                                  .map((d: number) => DIAS.find((x) => x.value === d)?.label)
                                  .join(", ") || "todos los días"
                              } dentro de esta ventana.`}
                        </Text>
                      </Box>
                      <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
                        <Switch
                          aria-label={h.activo ? "Pausar horario" : "Activar horario"}
                          checked={h.activo}
                          onCheckedChange={() => handleToggleActivo(h)}
                          style={{ cursor: "pointer" }}
                        />
                        {!h.siempre_activo && (
                          <Button
                            size="1"
                            variant="soft"
                            color="gray"
                            onClick={() => iniciarEdicion(h)}
                            style={{ cursor: "pointer" }}
                          >
                            <Pencil size={13} aria-hidden />
                            Editar
                          </Button>
                        )}
                        <Button
                          size="1"
                          variant="soft"
                          color="red"
                          onClick={() => handleEliminar(h.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <Trash2 size={13} aria-hidden />
                          Eliminar
                        </Button>
                      </Flex>
                    </Flex>
                  </Inset>
                )
              )}
            </Flex>
          )}
        </Flex>
      </Panel>
    </Flex>
  );
}
