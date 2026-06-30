"use client";

import React, { useState, useTransition } from "react";
import { Badge, Box, Button, Card, Flex, Grid, Switch, Text, TextField } from "@radix-ui/themes";
import { MessageSquareText, Plus, Save } from "lucide-react";
import { actualizarPreguntaFeedback, crearPreguntaFeedback } from "@/actions/feedback";

type FeedbackPregunta = {
  id: number;
  pregunta: string;
  descripcion?: string | null;
  orden: number;
  activo: boolean;
};

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Ocurrio un error inesperado";

export default function FeedbackAdminClient({ initialPreguntas = [] }: { initialPreguntas?: FeedbackPregunta[] }) {
  const [preguntas, setPreguntas] = useState(initialPreguntas);
  const [newPregunta, setNewPregunta] = useState("");
  const [newDescripcion, setNewDescripcion] = useState("");
  const [newOrden, setNewOrden] = useState(String((initialPreguntas.at(-1)?.orden ?? 0) + 1));
  const [editing, setEditing] = useState<Record<number, FeedbackPregunta>>({});
  const [isPending, startTransition] = useTransition();

  const updateEditing = (pregunta: FeedbackPregunta, changes: Partial<FeedbackPregunta>) => {
    setEditing((current) => ({
      ...current,
      [pregunta.id]: {
        ...(current[pregunta.id] || pregunta),
        ...changes,
      },
    }));
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    if (newPregunta.trim().length < 8) {
      alert("La pregunta debe tener al menos 8 caracteres.");
      return;
    }

    startTransition(async () => {
      try {
        const created = await crearPreguntaFeedback({
          pregunta: newPregunta,
          descripcion: newDescripcion || undefined,
          orden: Number(newOrden) || 0,
          activo: true,
        });
        setPreguntas((current) => [...current, created].sort((a, b) => a.orden - b.orden || a.id - b.id));
        setNewPregunta("");
        setNewDescripcion("");
        setNewOrden(String((Number(newOrden) || 0) + 1));
      } catch (error: unknown) {
        alert(`Error: ${getErrorMessage(error)}`);
      }
    });
  };

  const handleSave = (pregunta: FeedbackPregunta) => {
    const edited = editing[pregunta.id] || pregunta;
    startTransition(async () => {
      try {
        const updated = await actualizarPreguntaFeedback(pregunta.id, {
          pregunta: edited.pregunta,
          descripcion: edited.descripcion || undefined,
          orden: Number(edited.orden) || 0,
          activo: edited.activo,
        });
        setPreguntas((current) => current.map((item) => item.id === updated.id ? updated : item).sort((a, b) => a.orden - b.orden || a.id - b.id));
        setEditing((current) => {
          const next = { ...current };
          delete next[pregunta.id];
          return next;
        });
      } catch (error: unknown) {
        alert(`Error: ${getErrorMessage(error)}`);
      }
    });
  };

  return (
    <Box style={{ opacity: isPending ? 0.7 : 1, transition: "opacity 0.2s" }}>
      <Flex direction="column" gap="1" mb="6">
        <Flex align="center" gap="3">
          <Box style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(45, 212, 191, 0.12)",
            border: "1px solid rgba(45, 212, 191, 0.25)",
            color: "#2dd4bf",
          }}>
            <MessageSquareText size={22} />
          </Box>
          <Box>
            <Text size="6" weight="bold" color="indigo" as="div">Preguntas de Feedback</Text>
            <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>
              Configura las preguntas que responderan los agricultores con escala del 1 al 5.
            </Text>
          </Box>
        </Flex>
      </Flex>

      <Grid columns={{ initial: "1", lg: "3" }} gap="6">
        <Card size="3" style={{ background: "#111827", borderColor: "#1f2937", borderRadius: "16px", gridColumn: "span 1" }}>
          <form onSubmit={handleCreate}>
            <Flex direction="column" gap="3">
              <Text size="4" weight="bold" style={{ color: "white" }}>Nueva pregunta</Text>
              <TextField.Root placeholder="Pregunta para el agricultor" value={newPregunta} onChange={(e) => setNewPregunta(e.target.value)} />
              <TextField.Root placeholder="Descripcion opcional" value={newDescripcion} onChange={(e) => setNewDescripcion(e.target.value)} />
              <TextField.Root type="number" min="0" placeholder="Orden" value={newOrden} onChange={(e) => setNewOrden(e.target.value)} />
              <Button type="submit" color="green" disabled={isPending} style={{ cursor: "pointer" }}>
                <Plus size={16} />
                Agregar pregunta
              </Button>
            </Flex>
          </form>
        </Card>

        <Box style={{ gridColumn: "span 2" }}>
          <Flex direction="column" gap="3">
            {preguntas.map((pregunta) => {
              const edited = editing[pregunta.id] || pregunta;
              const hasChanges = Boolean(editing[pregunta.id]);
              return (
                <Card key={pregunta.id} size="3" style={{ background: "#111827", borderColor: "#1f2937", borderRadius: "16px" }}>
                  <Grid columns={{ initial: "1", md: "1fr 110px 120px" }} gap="3" align="center">
                    <Box>
                      <TextField.Root
                        value={edited.pregunta}
                        onChange={(e) => updateEditing(pregunta, { pregunta: e.target.value })}
                        style={{ background: "#1e293b", color: "white" }}
                      />
                      <Box mt="2">
                        <TextField.Root
                          value={edited.descripcion || ""}
                          placeholder="Descripcion opcional"
                          onChange={(e) => updateEditing(pregunta, { descripcion: e.target.value })}
                          style={{ background: "#1e293b", color: "white" }}
                        />
                      </Box>
                    </Box>
                    <TextField.Root
                      type="number"
                      min="0"
                      value={String(edited.orden)}
                      onChange={(e) => updateEditing(pregunta, { orden: Number(e.target.value) || 0 })}
                      style={{ background: "#1e293b", color: "white" }}
                    />
                    <Flex align="center" justify="between" gap="2">
                      <Badge color={edited.activo ? "green" : "gray"}>{edited.activo ? "Activa" : "Inactiva"}</Badge>
                      <Switch checked={edited.activo} onCheckedChange={(value) => updateEditing(pregunta, { activo: value })} />
                    </Flex>
                  </Grid>
                  <Flex justify="end" mt="3">
                    <Button size="2" color="indigo" variant={hasChanges ? "solid" : "soft"} disabled={!hasChanges || isPending} onClick={() => handleSave(pregunta)} style={{ cursor: hasChanges ? "pointer" : "default" }}>
                      <Save size={15} />
                      Guardar
                    </Button>
                  </Flex>
                </Card>
              );
            })}
          </Flex>
        </Box>
      </Grid>
    </Box>
  );
}
