// src/components/agricultor/feedback/FeedbackClient.tsx
"use client";

import React, { useState } from "react";
import { Icons } from "@/components/ui/Icons";
import { crearFeedback } from "@/actions/feedback";
import type { FeedbackPregunta, FeedbackItem } from "@/actions/feedback";

interface FeedbackQuestionItem {
  id: number | string;
  question: string;
  type: "rating" | "text" | "select";
  options?: string[];
  required: boolean;
}

const fallbackQuestions: FeedbackQuestionItem[] = [
  { id: 1, question: "¿Con qué frecuencia utilizas la plataforma Yaku?", type: "select", options: ["Varias veces al día", "Una vez al día", "Varios días a la semana", "Una vez a la semana", "Menos de una vez a la semana"], required: true },
  { id: 2, question: "¿Cómo valorarías la utilidad del sistema de alertas?", type: "rating", required: true },
  { id: 3, question: "¿Las recomendaciones de riego se han ajustado a las necesidades reales de tu cultivo?", type: "rating", required: true },
  { id: 4, question: "¿Qué aspecto mejorarías de la plataforma?", type: "text", required: false },
  { id: 5, question: "¿Recomendarías Yaku a otros agricultores?", type: "rating", required: true },
];

const ratingLabels: Record<number, string> = {
  1: "Muy bajo",
  2: "Bajo",
  3: "Regular",
  4: "Bueno",
  5: "Excelente",
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1.5 items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
            (hover || value) >= n
              ? "text-amber-400 bg-amber-500/20 shadow-sm shadow-amber-500/10 scale-105"
              : "text-slate-500 bg-slate-800/90 hover:bg-slate-700/80 hover:text-slate-300"
          }`}
        >
          <svg
            className="w-5 h-5 transition-transform"
            viewBox="0 0 24 24"
            fill={(hover || value) >= n ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs font-semibold text-amber-400 ml-2 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/50">
          {ratingLabels[value] || `${value}/5`}
        </span>
      )}
    </div>
  );
}

function StarDisplay({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <svg
          key={n}
          className={`w-4 h-4 ${n <= value ? "text-amber-400 fill-amber-400" : "text-slate-600"}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function FeedbackClient({
  preguntas = [],
  cultivos = [],
  initialFeedback = [],
}: {
  preguntas?: FeedbackPregunta[];
  cultivos?: any[];
  initialFeedback?: FeedbackItem[] | any[];
}) {
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [history, setHistory] = useState<FeedbackItem[]>(initialFeedback || []);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formattedQuestions: FeedbackQuestionItem[] =
    preguntas.length > 0
      ? preguntas
          .filter((q) => q.activo)
          .sort((a, b) => a.orden - b.orden)
          .map((q) => ({
            id: q.id,
            question: q.pregunta,
            type: q.tipo || "rating",
            options: q.opciones || [],
            required: q.obligatoria !== false,
          }))
      : fallbackQuestions;

  const [answers, setAnswers] = useState<Record<string | number, string | number>>({});
  const [selectedCultivo, setSelectedCultivo] = useState<number | undefined>(undefined);
  const [generalComment, setGeneralComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setAnswer(id: string | number, value: string | number) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  const allRequired = formattedQuestions
    .filter((q) => q.required)
    .every((q) => answers[q.id] !== undefined && answers[q.id] !== "");

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!allRequired || loading) return;

    setLoading(true);
    setError(null);

    const respuestasPayload = formattedQuestions
      .filter((q) => answers[q.id] !== undefined && answers[q.id] !== "")
      .map((q) => {
        const val = answers[q.id];
        return {
          id_pregunta: Number(q.id),
          calificacion: q.type === "rating" ? Number(val) : undefined,
          respuesta_texto: q.type !== "rating" ? String(val) : undefined,
        };
      });

    try {
      const res = await crearFeedback({
        id_cultivo: selectedCultivo,
        comentario: generalComment.trim() || undefined,
        respuestas: respuestasPayload,
      });

      if (!res.success) {
        throw new Error(res.error || "No se pudo registrar la valoración.");
      }

      if (res.data) {
        setHistory((prev) => [res.data, ...prev]);
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error("Error al enviar feedback:", err);
      setError(err?.message || "Ocurrió un error al enviar la valoración. Inténtelo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  // Estadísticas del historial personal
  const totalSubmissions = history.length;
  const avgSatisfaction =
    totalSubmissions > 0
      ? (history.reduce((acc, curr) => acc + (curr.calificacion || 0), 0) / totalSubmissions).toFixed(1)
      : "0.0";
  const lastSubmission = history.length > 0 ? history[0] : null;

  return (
    <div className="w-full max-w-full space-y-6 fade-in">
      {/* Navegación por pestañas (Tabs) de ancho completo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white tracking-tight">
            Retroalimentación y Encuestas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Comparte tu experiencia para ayudarnos a optimizar el riego y monitoreo de tus cultivos.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "form"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            {Icons.message("w-4 h-4")}
            <span>Nueva Valoración</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            {Icons.clock("w-4 h-4")}
            <span>Historial de Respuestas</span>
            {totalSubmissions > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                  activeTab === "history"
                    ? "bg-emerald-800 text-emerald-100"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {totalSubmissions}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: NUEVA VALORACIÓN */}
      {activeTab === "form" && (
        <div className="space-y-6">
          {submitted ? (
            <div className="metric-card p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6 shadow-xl border-emerald-800/50">
              <div className="w-20 h-20 rounded-3xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-600/20">
                {Icons.check("w-10 h-10 text-emerald-400")}
              </div>
              <div>
                <h3 className="font-display font-bold text-2xl text-white mb-2">
                  ¡Muchas gracias por tu valoración!
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
                  Tus respuestas han sido registradas y añadidas a tu historial. Nos ayudan enormemente a calibrar los algoritmos y mejorar la experiencia de Yaku.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("history");
                    setSubmitted(false);
                    setAnswers({});
                    setGeneralComment("");
                  }}
                  className="btn-primary w-full sm:w-auto px-6 py-2.5 flex items-center justify-center gap-2"
                >
                  {Icons.clock("w-4 h-4")}
                  Ver en mi historial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setAnswers({});
                    setGeneralComment("");
                  }}
                  className="btn-secondary w-full sm:w-auto px-6 py-2.5"
                >
                  Enviar otra valoración
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Banner Informativo */}
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                <div className="text-emerald-400 shrink-0 mt-0.5 bg-emerald-900/50 p-2 rounded-xl">
                  {Icons.message("w-5 h-5")}
                </div>
                <div className="text-sm text-emerald-300 leading-relaxed space-y-1">
                  <p className="font-semibold text-emerald-200">
                    Tu opinión hace la diferencia en el campo
                  </p>
                  <p className="text-emerald-300/90 text-xs sm:text-sm">
                    Tus respuestas son confidenciales y se procesan para optimizar la precisión de los modelos de riego por IA y mejorar las notificaciones de alerta.
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex gap-3 text-rose-300 text-sm">
                  <div className="text-rose-400 shrink-0 mt-0.5">
                    {Icons.alertTriangle("w-5 h-5")}
                  </div>
                  <p>{error}</p>
                </div>
              )}

              {/* Selector de Cultivo Asociado (Opcional) */}
              {cultivos && cultivos.length > 0 && (
                <div className="metric-card p-5">
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    ¿Esta valoración está relacionada a un cultivo específico? (Opcional)
                  </label>
                  <select
                    className="select-field text-sm w-full md:w-96"
                    value={selectedCultivo || ""}
                    onChange={(e) => setSelectedCultivo(e.target.value ? Number(e.target.value) : undefined)}
                  >
                    <option value="">Evaluación general de la plataforma</option>
                    {cultivos.map((c: any) => (
                      <option key={c.id_cultivo || c.id} value={c.id_cultivo || c.id}>
                        {c.nombre_planta || c.nombre || `Cultivo #${c.id_cultivo || c.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preguntas en Grid de Ancho Completo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {formattedQuestions.map((q, i) => {
                  const isWide = q.type === "text";
                  return (
                    <div
                      key={q.id}
                      className={`metric-card p-5 sm:p-6 flex flex-col justify-between transition-all hover:border-slate-700/80 ${
                        isWide ? "lg:col-span-2" : ""
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-100 text-base leading-snug">
                                {q.question}
                              </p>
                              {q.required ? (
                                <span className="text-xs text-rose-400/90 font-medium inline-block mt-1">
                                  * Obligatoria
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium inline-block mt-1">
                                  Opcional
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="chip status-water text-xs shrink-0 hidden sm:inline-block">
                            {q.type === "rating" ? "Valoración" : q.type === "select" ? "Selección" : "Texto"}
                          </span>
                        </div>

                        {/* Input por tipo */}
                        <div className="pt-2">
                          {q.type === "rating" && (
                            <div className="space-y-2">
                              <StarRating
                                value={(answers[q.id] as number) || 0}
                                onChange={(v) => setAnswer(q.id, v)}
                              />
                            </div>
                          )}

                          {q.type === "select" && (
                            <div>
                              <select
                                className="select-field text-sm w-full"
                                value={(answers[q.id] as string) || ""}
                                onChange={(e) => setAnswer(q.id, e.target.value)}
                              >
                                <option value="">Selecciona una opción…</option>
                                {q.options?.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {q.type === "text" && (
                            <div>
                              <textarea
                                className="input-field resize-none text-sm w-full"
                                rows={4}
                                placeholder="Escribe tus comentarios o sugerencias con total libertad…"
                                maxLength={500}
                                value={(answers[q.id] as string) || ""}
                                onChange={(e) => setAnswer(q.id, e.target.value)}
                              />
                              <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                                <span>Sé tan específico como desees</span>
                                <span>{((answers[q.id] as string) || "").length}/500</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barra de Envío */}
              <div className="metric-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 text-center sm:text-left">
                  <p className="text-slate-300 font-medium mb-0.5">
                    {allRequired ? "✓ Todas las preguntas obligatorias completadas" : "Faltan preguntas obligatorias por responder"}
                  </p>
                  <p>Asegúrate de revisar tus respuestas antes de enviar.</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={!allRequired || loading}
                  className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8 text-base shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && (
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {loading ? "Enviando valoración…" : "Enviar valoración"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE RESPUESTAS */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Métricas Resumen del Historial Personal (Ancho Completo) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="metric-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                {Icons.message("w-6 h-6")}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Total Valoraciones
                </p>
                <p className="text-2xl font-bold font-display text-white mt-0.5">
                  {totalSubmissions}
                </p>
              </div>
            </div>

            <div className="metric-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Promedio de Satisfacción
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-2xl font-bold font-display text-white">
                    {avgSatisfaction}
                  </p>
                  <span className="text-xs text-slate-400">/ 5.0</span>
                </div>
              </div>
            </div>

            <div className="metric-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                {Icons.calendar("w-6 h-6")}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Último Envío
                </p>
                <p className="text-sm font-semibold text-white mt-1 truncate max-w-[200px]">
                  {lastSubmission
                    ? new Date(lastSubmission.fecha).toLocaleDateString("es-PE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Sin registros"}
                </p>
              </div>
            </div>
          </div>

          {/* Listado de Envíos Anteriores */}
          {history.length === 0 ? (
            <div className="metric-card p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                {Icons.message("w-8 h-8")}
              </div>
              <h3 className="font-display font-bold text-xl text-white">
                Aún no has enviado valoraciones
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tus comentarios ayudan a calibrar el sistema para tus necesidades de riego y cultivo.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className="btn-primary px-6 py-2.5 text-sm"
              >
                Completar mi primera encuesta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, idx) => {
                const isExpanded = expandedId === item.id;
                const formattedDate = new Date(item.fecha).toLocaleString("es-PE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <div
                    key={item.id || idx}
                    className="metric-card p-5 sm:p-6 transition-all space-y-4"
                  >
                    {/* Fila Principal del Historial */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                          #{history.length - idx}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-semibold text-white text-base">
                              Valoración del {formattedDate}
                            </h4>
                            {item.cultivo_nombre && (
                              <span className="chip status-water text-xs">
                                🌱 {item.cultivo_nombre}
                              </span>
                            )}
                            <span className="chip status-active text-xs">
                              Enviada
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <StarDisplay value={item.calificacion} />
                            <span className="text-xs font-semibold text-amber-400">
                              {ratingLabels[item.calificacion] || `${item.calificacion}/5 estrellas`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="btn-secondary text-xs px-3.5 py-2 flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
                      >
                        <span>
                          {isExpanded ? "Ocultar respuestas" : `Ver preguntas respondidas (${item.respuestas?.length || 0})`}
                        </span>
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>

                    {/* Mensaje global si existe */}
                    {item.mensaje && item.mensaje !== "Valoración registrada" && (
                      <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 italic">
                        "{item.mensaje}"
                      </p>
                    )}

                    {/* Acordeón de Preguntas y Respuestas Específicas */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-800/80 space-y-3 fade-in">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Detalle de preguntas respondidas:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {item.respuestas && item.respuestas.length > 0 ? (
                            item.respuestas.map((resp, rIdx) => (
                              <div
                                key={resp.id || rIdx}
                                className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2"
                              >
                                <p className="text-xs font-medium text-slate-300 leading-snug">
                                  {rIdx + 1}. {resp.pregunta}
                                </p>

                                {resp.calificacion !== null && resp.calificacion !== undefined && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <StarDisplay value={resp.calificacion} />
                                    <span className="text-xs font-bold text-amber-400">
                                      {ratingLabels[resp.calificacion] || `${resp.calificacion}/5`}
                                    </span>
                                  </div>
                                )}

                                {resp.respuesta_texto && (
                                  <div className="pt-1">
                                    {resp.tipo === "select" ? (
                                      <span className="chip status-water text-xs font-medium inline-block">
                                        ✓ {resp.respuesta_texto}
                                      </span>
                                    ) : (
                                      <div className="bg-slate-950/60 border-l-2 border-emerald-500 pl-3 py-1.5 rounded-r text-xs text-slate-200">
                                        "{resp.respuesta_texto}"
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500 italic">
                              No hay desglose específico de preguntas guardado para este registro.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
