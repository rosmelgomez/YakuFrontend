// src/actions/feedback.ts
import { revalidatePath } from "next/cache";
import { fetchFromFastAPI } from "@/lib/bff";

export type FeedbackPregunta = {
  id: number;
  pregunta: string;
  tipo: "rating" | "text" | "select";
  obligatoria: boolean;
  opciones?: string[] | null;
  descripcion?: string | null;
  orden: number;
  activo: boolean;
  fecha_registro?: string;
  actualizado_en?: string;
};

export type FeedbackRespuestaInput = {
  id_pregunta: number;
  calificacion?: number | null;
  respuesta_texto?: string | null;
};

export type FeedbackInput = {
  id_cultivo?: number;
  comentario?: string;
  respuestas: FeedbackRespuestaInput[];
};

export type FeedbackRespuestaItem = {
  id: number;
  id_pregunta: number;
  pregunta: string;
  tipo?: "rating" | "text" | "select";
  calificacion?: number | null;
  respuesta_texto?: string | null;
};

export type FeedbackItem = {
  id: number;
  id_usuario: number;
  id_cultivo?: number | null;
  cultivo_nombre?: string | null;
  modulo: string;
  tipo: string;
  calificacion: number;
  mensaje: string;
  estado: string;
  fecha: string;
  respuestas: FeedbackRespuestaItem[];
};

export type FeedbackPreguntaKpi = {
  id_pregunta: number;
  pregunta: string;
  tipo: "rating" | "text" | "select";
  obligatoria: boolean;
  activo: boolean;
  orden: number;
  total_respuestas: number;
  tasa_respuesta_porcentaje: number;
  promedio_calificacion?: number | null;
  distribucion_calificacion?: Record<string, number> | null;
  porcentaje_positivas?: number | null;
  distribucion_opciones?: Record<string, number> | null;
  opcion_mas_votada?: string | null;
  longitud_promedio?: number | null;
  ultimas_respuestas_texto?: Array<{
    texto: string;
    fecha?: string | null;
    calificacion_general?: number | null;
  }> | null;
};

export type FeedbackKpisResponse = {
  total_feedbacks: number;
  promedio_general: number;
  preguntas_activas: number;
  preguntas_totales: number;
  tasa_completitud_promedio: number;
  preguntas_kpis: FeedbackPreguntaKpi[];
};

export type FeedbackPreguntaInput = {
  pregunta: string;
  tipo?: "rating" | "text" | "select";
  obligatoria?: boolean;
  opciones?: string[] | null;
  descripcion?: string;
  orden?: number;
  activo?: boolean;
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

export async function listarPreguntasFeedback(incluirInactivas = false): Promise<FeedbackPregunta[]> {
  const res = await fetchFromFastAPI(`/feedback/preguntas?incluir_inactivas=${incluirInactivas}`);
  if (!res.ok) {
    throw new Error("Error al obtener las preguntas de feedback.");
  }
  return res.json();
}

export async function crearPreguntaFeedback(data: FeedbackPreguntaInput): Promise<FeedbackPregunta> {
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

export async function actualizarPreguntaFeedback(id: number, data: Partial<FeedbackPreguntaInput>): Promise<FeedbackPregunta> {
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

export async function eliminarPreguntaFeedback(id: number): Promise<{ message: string; eliminada?: boolean; desactivada?: boolean }> {
  const res = await fetchFromFastAPI(`/feedback/preguntas/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al eliminar la pregunta.");
  }
  revalidatePath("/dashboard/administrador/feedback");
  revalidatePath("/dashboard/agricultor/feedback");
  return res.json();
}

export async function obtenerKpisFeedback(): Promise<FeedbackKpisResponse> {
  const res = await fetchFromFastAPI("/feedback/kpis");
  if (!res.ok) {
    throw new Error("Error al obtener las métricas y KPIs de feedback.");
  }
  return res.json();
}
