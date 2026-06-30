"use client";

import React, { useMemo, useState, useTransition } from "react";
import { Box, Button, Card, Flex, Grid, Text } from "@radix-ui/themes";
import { AlertCircle, CheckCircle, MessageSquareText, Send, Star } from "lucide-react";
import { crearFeedback } from "@/actions/feedback";
import type { CultivoBase } from "@/services/cultivos-base";

type FeedbackItem = {
  id: number;
  id_cultivo?: number | null;
  cultivo_nombre?: string | null;
  modulo: string;
  tipo: string;
  calificacion: number;
  mensaje: string;
  estado: string;
  fecha: string;
  respuestas?: Array<{
    id: number;
    id_pregunta: number;
    pregunta: string;
    calificacion: number;
  }>;
};

type FeedbackPregunta = {
  id: number;
  pregunta: string;
  descripcion?: string | null;
  orden: number;
  activo: boolean;
};

export default function FeedbackClient({
  cultivos,
  preguntas,
  initialFeedback,
}: {
  cultivos: CultivoBase[];
  preguntas: FeedbackPregunta[];
  initialFeedback: FeedbackItem[];
}) {
  const [idCultivo, setIdCultivo] = useState<string>("general");
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [comentario, setComentario] = useState("");
  const [feedback, setFeedback] = useState(initialFeedback);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCropName = useMemo(() => {
    if (idCultivo === "general") return "Sistema completo";
    return cultivos.find((cultivo) => String(cultivo.id) === idCultivo)?.nombre_planta || "Cultivo seleccionado";
  }, [cultivos, idCultivo]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (preguntas.length === 0) {
      setErrorMsg("Aun no hay preguntas configuradas por el administrador.");
      return;
    }

    const missingQuestion = preguntas.find((pregunta) => !respuestas[pregunta.id]);
    if (missingQuestion) {
      setErrorMsg("Responde todas las preguntas antes de enviar el feedback.");
      return;
    }

    startTransition(async () => {
      const res = await crearFeedback({
        id_cultivo: idCultivo === "general" ? undefined : Number(idCultivo),
        comentario: comentario.trim() || undefined,
        respuestas: preguntas.map((pregunta) => ({
          id_pregunta: pregunta.id,
          calificacion: respuestas[pregunta.id],
        })),
      });

      if (!res.success) {
        setErrorMsg(res.error || "No se pudo guardar la retroalimentacion.");
        return;
      }

      setFeedback((current) => [res.data, ...current].slice(0, 20));
      setRespuestas({});
      setComentario("");
      setSuccessMsg("Retroalimentacion guardada correctamente en la base de datos.");
    });
  };

  return (
    <Box style={{ width: "100%" }}>
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
            <Text size="6" weight="bold" color="indigo" as="div">
              Feedback del Agricultor
            </Text>
            <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>
              Califica las preguntas configuradas por administracion para mejorar monitoreo, alertas, riego e IA.
            </Text>
          </Box>
        </Flex>
      </Flex>

      <Grid columns={{ initial: "1", lg: "3" }} gap="6" width="100%">
        <Box style={{ gridColumn: "span 2" }}>
          <Card size="3" style={{ background: "#111827", borderColor: "#1f2937", borderRadius: "16px" }}>
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="4">
                {successMsg && (
                  <Box p="3" style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "8px" }}>
                    <Flex gap="2" align="center">
                      <CheckCircle size={16} color="#22c55e" />
                      <Text color="green" size="2">{successMsg}</Text>
                    </Flex>
                  </Box>
                )}

                {errorMsg && (
                  <Box p="3" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px" }}>
                    <Flex gap="2" align="center">
                      <AlertCircle size={16} color="#ef4444" />
                      <Text color="red" size="2">{errorMsg}</Text>
                    </Flex>
                  </Box>
                )}

                <Grid columns={{ initial: "1", sm: "2" }} gap="4">
                  <Field label="Cultivo relacionado">
                    <select value={idCultivo} onChange={(e) => setIdCultivo(e.target.value)} style={selectStyle}>
                      <option value="general">Sistema completo</option>
                      {cultivos.map((cultivo) => (
                        <option key={cultivo.id} value={cultivo.id}>{cultivo.nombre_planta}</option>
                      ))}
                    </select>
                  </Field>

                  <Box p="3" style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px" }}>
                    <Text size="2" weight="bold" style={{ color: "#e5e7eb" }} as="div">
                      Escala de calificacion
                    </Text>
                    <Text size="1" color="gray">1 es el nivel mas bajo y 5 el mas alto.</Text>
                  </Box>
                </Grid>

                {preguntas.length === 0 ? (
                  <Box p="4" style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "10px" }}>
                    <Text size="2" style={{ color: "#fbbf24" }}>
                      No hay preguntas activas. Pide al administrador configurar la encuesta de feedback.
                    </Text>
                  </Box>
                ) : (
                  <Grid columns={{ initial: "1", md: "2" }} gap="4">
                    {preguntas.map((pregunta) => (
                      <Box key={pregunta.id} p="3" style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px" }}>
                        <Text size="2" weight="bold" style={{ color: "#e5e7eb", display: "block", minHeight: "40px" }}>
                          {pregunta.pregunta}
                        </Text>
                        {pregunta.descripcion && (
                          <Text size="1" color="gray" style={{ display: "block", marginTop: "4px" }}>{pregunta.descripcion}</Text>
                        )}
                        <Flex gap="3" wrap="wrap" mt="3">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <label key={score} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1", cursor: "pointer" }}>
                              <input
                                type="radio"
                                name={`pregunta-${pregunta.id}`}
                                value={score}
                                checked={respuestas[pregunta.id] === score}
                                onChange={() => setRespuestas((current) => ({ ...current, [pregunta.id]: score }))}
                              />
                              <Text size="2">{score}</Text>
                            </label>
                          ))}
                        </Flex>
                      </Box>
                    ))}
                  </Grid>
                )}

                <Field label={`Comentario para ${selectedCropName}`}>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Cuentanos que te gusto o que podriamos mejorar."
                    rows={7}
                    maxLength={1200}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      minHeight: "156px",
                      borderRadius: "10px",
                      border: "1px solid #334155",
                      background: "#1e293b",
                      color: "white",
                      padding: "12px",
                      outline: "none",
                      lineHeight: 1.5,
                    }}
                  />
                  <Text size="1" color="gray" style={{ display: "block", textAlign: "right", marginTop: "4px" }}>
                    {comentario.length}/1200
                  </Text>
                </Field>

                <Flex justify="end">
                  <Button type="submit" color="green" size="3" disabled={isPending} style={{ cursor: "pointer", borderRadius: "8px", fontWeight: "bold" }}>
                    <Send size={16} />
                    {isPending ? "Guardando..." : "Enviar feedback"}
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Card>
        </Box>

        <Box>
          <Card size="3" style={{ background: "#111827", borderColor: "#1f2937", borderRadius: "16px", height: "100%" }}>
            <Text size="4" weight="bold" style={{ color: "white" }} as="div" mb="4">
              Historial reciente
            </Text>
            <Flex direction="column" gap="3">
              {feedback.length === 0 ? (
                <Text size="2" color="gray">Aun no hay retroalimentacion registrada.</Text>
              ) : (
                feedback.map((item) => (
                  <Box key={item.id} p="3" style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px" }}>
                    <Flex justify="between" align="center" mb="2" gap="2">
                      <Text size="2" weight="bold" style={{ color: "#e5e7eb" }}>{item.modulo}</Text>
                      <Flex gap="1" align="center" style={{ color: "#fbbf24" }}>
                        <Star size={14} fill="currentColor" />
                        <Text size="1">{item.calificacion}/5</Text>
                      </Flex>
                    </Flex>
                    <Text size="1" color="gray" style={{ display: "block", marginBottom: "6px" }}>
                      {item.cultivo_nombre || "Sistema completo"} · {new Date(item.fecha).toLocaleDateString()}
                    </Text>
                    {item.respuestas && item.respuestas.length > 0 && (
                      <Flex direction="column" gap="1" mb="2">
                        {item.respuestas.slice(0, 3).map((respuesta) => (
                          <Text key={respuesta.id} size="1" color="gray">
                            {respuesta.pregunta}: <span style={{ color: "#fbbf24" }}>{respuesta.calificacion}/5</span>
                          </Text>
                        ))}
                      </Flex>
                    )}
                    <Text size="2" style={{ color: "#cbd5e1", lineHeight: 1.45 }}>
                      {item.mensaje}
                    </Text>
                  </Box>
                ))
              )}
            </Flex>
          </Card>
        </Box>
      </Grid>
    </Box>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <label style={{ display: "block", fontSize: "0.85rem", color: "#9ca3af", marginBottom: "6px", fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </Box>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "40px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#1e293b",
  color: "white",
  padding: "0 10px",
  outline: "none",
};
