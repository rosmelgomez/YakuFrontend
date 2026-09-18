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
  const [horaInicio, setHoraInicio] = useState("06:00");
  const [duracionMin, setDuracionMin] = useState("10");
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
    const duracionSegundos = parseInt(duracionMin, 10) * 60;
    if (isNaN(duracionSegundos) || duracionSegundos <= 0) {
      alert("Ingrese una duración válida en minutos.");
      return;
    }
    setSaving(true);
    const res = await crearHorarioRiego({
      idAsignacion,
      horaInicio: `${horaInicio}:00`,
      duracionSegundos,
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
              <Text size="1" color="gray" as="div" mb="1">Duración (minutos)</Text>
              <TextField.Root
                type="number"
                min="1"
                max="60"
                value={duracionMin}
                onChange={(e) => setDuracionMin(e.target.value)}
                style={{ background: "var(--surface2-mockup)", border: "1px solid var(--border-mockup)", width: "120px" }}
              />
            </Box>
          </Flex>
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
                    <Text weight="bold" style={{ color: "white" }}>{String(h.hora_inicio).slice(0, 5)}</Text>
                    <Badge color="indigo" variant="soft" size="1">{h.duracion_segundos / 60} min</Badge>
                    <Badge color={h.activo ? "green" : "gray"} variant="soft" size="1">
                      {h.activo ? "Activo" : "Pausado"}
                    </Badge>
                  </Flex>
                  <Text size="1" color="gray" style={{ display: "block", marginTop: "4px" }}>
                    {(h.dias_semana || []).map((d: number) => DIAS.find((x) => x.value === d)?.label).join(", ") || "Todos los días"}
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
