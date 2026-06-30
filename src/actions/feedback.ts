"use server";

import { revalidatePath } from "next/cache";
import { fetchFromFastAPI } from "@/lib/bff";

export type FeedbackInput = {
  id_cultivo?: number;
  comentario?: string;
  respuestas: Array<{
    id_pregunta: number;
    calificacion: number;
  }>;
};

export type FeedbackPreguntaInput = {
  pregunta: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
};

export async function crearFeedback(data: FeedbackInput) {
  try {
    const res = await fetchFromFastAPI("/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(await res.text() || "Error al guardar la retroalimentacion.");
    }

    revalidatePath("/dashboard/agricultor/feedback");
    return { success: true, data: await res.json() };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al guardar la retroalimentacion.";
    return { success: false, error: message };
  }
}

export async function listarFeedbackPropios() {
  const res = await fetchFromFastAPI("/feedback");
  if (!res.ok) {
    throw new Error("Error al obtener el historial de retroalimentacion.");
  }
  return res.json();
}

export async function listarPreguntasFeedback(incluirInactivas = false) {
  const res = await fetchFromFastAPI(`/feedback/preguntas?incluir_inactivas=${incluirInactivas}`);
  if (!res.ok) {
    throw new Error("Error al obtener las preguntas de feedback.");
  }
  return res.json();
}

export async function crearPreguntaFeedback(data: FeedbackPreguntaInput) {
  const res = await fetchFromFastAPI("/feedback/preguntas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al crear la pregunta.");
  }
  revalidatePath("/dashboard/administrador/feedback");
  revalidatePath("/dashboard/agricultor/feedback");
  return res.json();
}

export async function actualizarPreguntaFeedback(id: number, data: Partial<FeedbackPreguntaInput>) {
  const res = await fetchFromFastAPI(`/feedback/preguntas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al actualizar la pregunta.");
  }
  revalidatePath("/dashboard/administrador/feedback");
  revalidatePath("/dashboard/agricultor/feedback");
  return res.json();
}
