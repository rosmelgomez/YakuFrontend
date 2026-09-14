// src/components/administrador/feedback/FeedbackAdminClient.tsx
"use client";

import React, { useState } from "react";
import { Icons } from "@/components/ui/Icons";
import {
  actualizarPreguntaFeedback,
  crearPreguntaFeedback,
  eliminarPreguntaFeedback,
  obtenerKpisFeedback,
} from "@/actions/feedback";
import type {
  FeedbackPregunta,
  FeedbackKpisResponse,
  FeedbackPreguntaKpi,
} from "@/actions/feedback";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface AdminQuestionItem {
  id: number;
  text: string;
  type: "rating" | "text" | "select";
  required: boolean;
  active: boolean;
  order: number;
  options?: string[];
  descripcion?: string;
}

const typeLabels: Record<AdminQuestionItem["type"], string> = {
  rating: "Valoración (1-5 estrellas)",
  text: "Texto libre",
  select: "Selección única",
};

const ratingTextLabels: Record<number, string> = {
  1: "Muy bajo",
  2: "Bajo",
  3: "Regular",
  4: "Bueno",
  5: "Excelente",
};

function QuestionModal({
  q,
  onClose,
  onSave,
}: {
  q: AdminQuestionItem | null;
  onClose: () => void;
  onSave: (formData: AdminQuestionItem) => Promise<void>;
}) {
  const [form, setForm] = useState<AdminQuestionItem>(
    q ?? {
      id: 0,
      text: "",
      type: "rating",
      required: false,
      active: true,
      order: 99,
      options: [],
    }
  );
  const [optInput, setOptInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.text.trim()) {
      setError("El texto de la pregunta no puede estar vacío.");
      return;
    }
    if (form.type === "select" && (!form.options || form.options.length === 0)) {
      setError("Debes añadir al menos una opción para una pregunta de selección.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      console.error("Error al guardar pregunta:", err);
      setError(err?.message || "No se pudo guardar la pregunta.");
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    const val = optInput.trim();
    if (!val) return;
    if (form.options?.includes(val)) {
      setError("Esa opción ya existe en la lista.");
      return;
    }
    setForm({ ...form, options: [...(form.options || []), val] });
    setOptInput("");
    setError(null);
  };

  const removeOption = (idx: number) => {
    setForm({
      ...form,
      options: form.options?.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box p-6 space-y-4 max-w-lg w-full">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-display font-bold text-lg text-white">
            {q ? "Editar pregunta de feedback" : "Nueva pregunta de feedback"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {Icons.x("w-5 h-5")}
          </button>
        </div>

        {error && (
          <div className="bg-rose-950/50 border border-rose-800/70 rounded-lg p-3 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Texto de la pregunta *
            </label>
            <input
              type="text"
              className="input-field text-sm w-full"
              placeholder="Ej: ¿Qué tan satisfecho estás con las alertas de riego?"
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Tipo de respuesta
            </label>
            <select
              className="select-field text-sm w-full"
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as AdminQuestionItem["type"],
                })
              }
            >
              <option value="rating">Valoración (1 a 5 estrellas)</option>
              <option value="select">Selección única con opciones</option>
              <option value="text">Texto libre / Comentarios</option>
            </select>
          </div>

          {form.type === "select" && (
            <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Opciones disponibles *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field text-xs flex-1"
                  placeholder="Escribe una opción y pulsa Agregar…"
                  value={optInput}
                  onChange={(e) => setOptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addOption}
                  className="btn-secondary text-xs px-3 py-1.5 cursor-pointer"
                >
                  Agregar
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.options?.map((opt, i) => (
                  <span
                    key={i}
                    className="chip status-water text-xs flex items-center gap-1.5 pl-2.5 pr-1.5 py-1"
                  >
                    <span>{opt}</span>
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="hover:text-rose-400 p-0.5 rounded cursor-pointer"
                    >
                      {Icons.x("w-3 h-3")}
                    </button>
                  </span>
                ))}
                {(!form.options || form.options.length === 0) && (
                  <p className="text-xs text-slate-500 italic">
                    Sin opciones añadidas todavía.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) => setForm({ ...form, required: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-slate-200">
                Respuesta obligatoria
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-slate-200">
                Visible para agricultores (Activa)
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm px-4 py-2 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary text-sm px-5 py-2 flex items-center gap-2 cursor-pointer"
          >
            {saving && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? "Guardando…" : q ? "Guardar cambios" : "Crear pregunta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tooltip personalizado para Recharts
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1 z-50">
        <p className="font-bold text-white max-w-xs">{data.fullName || label}</p>
        {data.tasa !== undefined && (
          <p className="text-emerald-400 font-semibold">
            Tasa de Respuesta: {data.tasa}% ({data.respuestas} respuestas)
          </p>
        )}
        {data.rating !== undefined && (
          <p className="text-amber-400 font-semibold">
            Calificación Promedio: {data.rating} / 5.0 ★
          </p>
        )}
      </div>
    );
  }
  return null;
}

export default function FeedbackAdminClient({
  initialPreguntas = [],
  initialKpis = null,
}: {
  initialPreguntas?: FeedbackPregunta[];
  initialKpis?: FeedbackKpisResponse | null;
}) {
  const [activeTab, setActiveTab] = useState<"kpis" | "preguntas">("kpis");
  const [questions, setQuestions] = useState<AdminQuestionItem[]>(
    initialPreguntas.map((q) => ({
      id: q.id,
      text: q.pregunta,
      type: q.tipo || "rating",
      required: q.obligatoria !== false,
      active: q.activo,
      order: q.orden,
      options: q.opciones || [],
      descripcion: q.descripcion || undefined,
    }))
  );
  const [kpis, setKpis] = useState<FeedbackKpisResponse | null>(initialKpis);
  const [typeFilter, setTypeFilter] = useState<"all" | "rating" | "select" | "text">("all");
  const [modal, setModal] = useState<AdminQuestionItem | null | undefined>(undefined);
  const [refreshingKpis, setRefreshingKpis] = useState(false);

  async function reloadKpis() {
    setRefreshingKpis(true);
    try {
      const data = await obtenerKpisFeedback();
      setKpis(data);
    } catch (err) {
      console.warn("No se pudieron refrescar los KPIs:", err);
    } finally {
      setRefreshingKpis(false);
    }
  }

  async function toggleActive(id: number) {
    const current = questions.find((q) => q.id === id);
    if (!current) return;
    const nextActive = !current.active;

    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, active: nextActive } : q))
    );

    try {
      await actualizarPreguntaFeedback(id, { activo: nextActive });
      reloadKpis();
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      setQuestions((qs) =>
        qs.map((q) => (q.id === id ? { ...q, active: current.active } : q))
      );
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Estás seguro de eliminar esta pregunta de feedback?")) return;

    try {
      const res = await eliminarPreguntaFeedback(id);
      if (res.desactivada) {
        setQuestions((qs) =>
          qs.map((q) => (q.id === id ? { ...q, active: false } : q))
        );
      } else {
        setQuestions((qs) => qs.filter((q) => q.id !== id));
      }
      reloadKpis();
    } catch (err: any) {
      console.error("Error al eliminar pregunta:", err);
      alert(err?.message || "No se pudo eliminar la pregunta.");
    }
  }

  async function handleSaveQuestion(formData: AdminQuestionItem) {
    if (formData.id) {
      const updated = await actualizarPreguntaFeedback(formData.id, {
        pregunta: formData.text,
        tipo: formData.type,
        obligatoria: formData.required,
        opciones: formData.type === "select" ? formData.options : undefined,
        activo: formData.active,
      });

      setQuestions((qs) =>
        qs
          .map((q) =>
            q.id === updated.id
              ? {
                  ...q,
                  text: updated.pregunta,
                  type: updated.tipo || "rating",
                  required: updated.obligatoria !== false,
                  active: updated.activo,
                  options: updated.opciones || [],
                }
              : q
          )
          .sort((a, b) => a.order - b.order)
      );
    } else {
      const nextOrder = (questions.at(-1)?.order ?? 0) + 1;
      const created = await crearPreguntaFeedback({
        pregunta: formData.text,
        tipo: formData.type,
        obligatoria: formData.required,
        opciones: formData.type === "select" ? formData.options : undefined,
        orden: nextOrder,
        activo: formData.active,
      });

      setQuestions((qs) =>
        [
          ...qs,
          {
            id: created.id,
            text: created.pregunta,
            type: created.tipo || "rating",
            required: created.obligatoria !== false,
            active: created.activo,
            order: created.orden,
            options: created.opciones || [],
          },
        ].sort((a, b) => a.order - b.order)
      );
    }
    reloadKpis();
  }

  const activeCount = questions.filter((q) => q.active).length;

  // Filtrado de KPIs por tipo de pregunta
  const filteredKpis = (kpis?.preguntas_kpis || []).filter((kpi) => {
    if (typeFilter === "all") return true;
    return kpi.tipo === typeFilter;
  });

  // Datos para gráficos Recharts
  const chartCompletionData = (kpis?.preguntas_kpis || []).map((k, idx) => ({
    name: `P${k.orden || idx + 1}`,
    fullName: k.pregunta,
    tasa: k.tasa_respuesta_porcentaje,
    respuestas: k.total_respuestas,
  }));

  const chartRatingData = (kpis?.preguntas_kpis || [])
    .filter((k) => k.tipo === "rating")
    .map((k, idx) => ({
      name: `P${k.orden || idx + 1}`,
      fullName: k.pregunta,
      rating: k.promedio_calificacion || 0,
      positivas: k.porcentaje_positivas || 0,
    }));

  return (
    <div className="w-full max-w-full space-y-6 fade-in">
      {/* Cabecera y Barra de Pestañas (Ancho Completo) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white tracking-tight">
            Panel de Retroalimentación de Agricultores
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Mide la satisfacción del usuario, analiza la eficiencia de cada pregunta y administra el cuestionario activo.
          </p>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("kpis")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "kpis"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            {Icons.chartBar("w-4 h-4")}
            <span>KPIs y Métricas de Eficiencia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preguntas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "preguntas"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            {Icons.settings("w-4 h-4")}
            <span>Gestión de Preguntas</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === "preguntas"
                  ? "bg-emerald-800 text-emerald-100"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {activeCount}
            </span>
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: KPIS Y MÉTRICAS DE EFICIENCIA */}
      {activeTab === "kpis" && (
        <div className="space-y-6">
          {/* Fila Superior: 4 Métricas Globales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="metric-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                {Icons.message("w-6 h-6")}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Total Valoraciones
                </p>
                <p className="text-2xl font-bold font-display text-white mt-0.5">
                  {kpis?.total_feedbacks ?? 0}
                </p>
                <p className="text-xs text-slate-400">Completadas por agricultores</p>
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
                  Satisfacción Global
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-2xl font-bold font-display text-white">
                    {kpis?.promedio_general?.toFixed(1) ?? "0.0"}
                  </p>
                  <span className="text-xs text-slate-400">/ 5.0 ★</span>
                </div>
                <p className="text-xs text-amber-400 font-semibold">
                  {kpis && kpis.promedio_general >= 4
                    ? "Nivel Excelente"
                    : kpis && kpis.promedio_general >= 3
                    ? "Nivel Regular"
                    : "Requiere atención"}
                </p>
              </div>
            </div>

            <div className="metric-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                {Icons.trendingUp("w-6 h-6")}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Tasa de Respuesta
                </p>
                <p className="text-2xl font-bold font-display text-white mt-0.5">
                  {kpis?.tasa_completitud_promedio?.toFixed(1) ?? "0.0"}%
                </p>
                <p className="text-xs text-slate-400">Completitud promedio</p>
              </div>
            </div>

            <div className="metric-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                {Icons.sliders("w-6 h-6")}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Preguntas Activas
                </p>
                <p className="text-2xl font-bold font-display text-white mt-0.5">
                  {kpis?.preguntas_activas ?? activeCount}
                  <span className="text-xs text-slate-400 font-normal">
                    {" "}/ {kpis?.preguntas_totales ?? questions.length}
                  </span>
                </p>
                <p className="text-xs text-emerald-400 font-medium">En producción</p>
              </div>
            </div>
          </div>

          {/* Fila de Gráficos Comparativos (Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Gráfico 1: Tasa de Respuesta por Pregunta (%) */}
            <div className="metric-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-base">
                    Eficiencia: Tasa de Respuesta por Pregunta (%)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Porcentaje de agricultores que respondieron cada pregunta configurada
                  </p>
                </div>
                <span className="chip status-active text-xs">Completitud</span>
              </div>

              <div className="h-64 w-full pt-2">
                {chartCompletionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartCompletionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} unit="%" />
                      <Tooltip content={<CustomChartTooltip />} cursor={false} />
                      <Bar dataKey="tasa" radius={[6, 6, 0, 0]} maxBarSize={52}>
                        {chartCompletionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.tasa >= 80
                                ? "#10b981"
                                : entry.tasa >= 50
                                ? "#f59e0b"
                                : "#ef4444"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                    Sin suficientes datos de respuesta para graficar.
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico 2: Calificación Promedio por Pregunta Rating */}
            <div className="metric-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-base">
                    Satisfacción: Calificación Promedio (1 a 5★)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Promedio de estrellas obtenido en preguntas de tipo valoración
                  </p>
                </div>
                <span className="chip status-warning text-xs">Rating</span>
              </div>

              <div className="h-64 w-full pt-2">
                {chartRatingData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRatingData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 5]} />
                      <Tooltip content={<CustomChartTooltip />} cursor={false} />
                      <Bar dataKey="rating" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={52} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                    No hay preguntas de tipo valoración para graficar.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Filtro de Detalle por Tipo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Filtrar preguntas:
              </span>
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  typeFilter === "all"
                    ? "bg-slate-700 text-white font-semibold"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                Todas ({kpis?.preguntas_kpis?.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("rating")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  typeFilter === "rating"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                Valoración ★ ({kpis?.preguntas_kpis?.filter((k) => k.tipo === "rating").length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("select")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  typeFilter === "select"
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                Selección única ({kpis?.preguntas_kpis?.filter((k) => k.tipo === "select").length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("text")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  typeFilter === "text"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                Texto libre ({kpis?.preguntas_kpis?.filter((k) => k.tipo === "text").length ?? 0})
              </button>
            </div>

            <button
              type="button"
              onClick={reloadKpis}
              disabled={refreshingKpis}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              {refreshingKpis ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                Icons.refresh("w-3.5 h-3.5")
              )}
              <span>Actualizar datos</span>
            </button>
          </div>

          {/* Grid de Tarjetas de Eficiencia por Pregunta (Ancho Completo) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filteredKpis.map((qKpi) => {
              const totalKpisFeedbacks = kpis?.total_feedbacks || 1;
              const rate = qKpi.tasa_respuesta_porcentaje;

              return (
                <div
                  key={qKpi.id_pregunta}
                  className="metric-card p-5 sm:p-6 space-y-4 flex flex-col justify-between"
                >
                  <div>
                    {/* Encabezado de la Tarjeta */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                          {qKpi.orden}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-100 text-base leading-snug">
                            {qKpi.pregunta}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span
                              className={`chip text-xs ${
                                qKpi.tipo === "rating"
                                  ? "status-warning"
                                  : qKpi.tipo === "text"
                                  ? "status-ai"
                                  : "status-water"
                              }`}
                            >
                              {typeLabels[qKpi.tipo]}
                            </span>
                            {qKpi.obligatoria && (
                              <span className="text-xs text-rose-400 font-semibold px-2 py-0.5 rounded-full bg-rose-950/40 border border-rose-800/60">
                                Obligatoria
                              </span>
                            )}
                            {!qKpi.activo && (
                              <span className="chip status-inactive text-xs">
                                Oculta
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Métrica de Eficiencia / Tasa de Respuesta */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2 mb-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Eficiencia de Respuesta:</span>
                        <span className="font-bold text-white">
                          {rate}% ({qKpi.total_respuestas} de {kpis?.total_feedbacks ?? 0} encuestas)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            rate >= 80
                              ? "bg-emerald-500"
                              : rate >= 50
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Desglose Específico para RATING */}
                    {qKpi.tipo === "rating" && (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-amber-400 font-display">
                              {qKpi.promedio_calificacion?.toFixed(1) ?? "0.0"}
                            </span>
                            <span className="text-xs text-slate-400">/ 5.0 estrellas</span>
                          </div>
                          {qKpi.porcentaje_positivas !== undefined && qKpi.porcentaje_positivas !== null && (
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/50">
                              {qKpi.porcentaje_positivas}% satisfacción positiva (4-5★)
                            </span>
                          )}
                        </div>

                        {/* Distribución de Estrellas 1-5 */}
                        <div className="space-y-1.5 pt-2">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = qKpi.distribucion_calificacion?.[String(star)] || 0;
                            const pct = qKpi.total_respuestas > 0
                              ? Math.round((count / qKpi.total_respuestas) * 100)
                              : 0;

                            const barColors: Record<number, string> = {
                              5: "bg-emerald-500",
                              4: "bg-emerald-400",
                              3: "bg-amber-400",
                              2: "bg-orange-500",
                              1: "bg-rose-500",
                            };

                            return (
                              <div key={star} className="flex items-center gap-2 text-xs">
                                <span className="w-12 text-slate-300 font-medium shrink-0">
                                  {star} ★
                                </span>
                                <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${barColors[star]}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-12 text-right text-slate-400 shrink-0 font-mono">
                                  {count} ({pct}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Desglose Específico para SELECT */}
                    {qKpi.tipo === "select" && (
                      <div className="space-y-3 pt-1">
                        {qKpi.opcion_mas_votada && (
                          <div className="flex items-center gap-2 text-xs text-blue-300 bg-blue-950/40 border border-blue-800/50 p-2.5 rounded-lg">
                            <span>🏆 Opción líder:</span>
                            <strong className="text-white">{qKpi.opcion_mas_votada}</strong>
                          </div>
                        )}

                        <div className="space-y-2 pt-1">
                          {qKpi.distribucion_opciones &&
                            Object.entries(qKpi.distribucion_opciones).map(([opc, count]) => {
                              const pct = qKpi.total_respuestas > 0
                                ? Math.round((count / qKpi.total_respuestas) * 100)
                                : 0;
                              return (
                                <div key={opc} className="space-y-1">
                                  <div className="flex justify-between text-xs text-slate-300">
                                    <span className="truncate max-w-[260px] font-medium">{opc}</span>
                                    <span className="font-mono text-slate-400 shrink-0">
                                      {count} ({pct}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-500 rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Desglose Específico para TEXT */}
                    {qKpi.tipo === "text" && (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          <span>Total comentarios recibidos: <strong className="text-white">{qKpi.total_respuestas}</strong></span>
                          <span>Longitud promedio: <strong className="text-white">{qKpi.longitud_promedio || 0} carácteres</strong></span>
                        </div>

                        <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                          {qKpi.ultimas_respuestas_texto && qKpi.ultimas_respuestas_texto.length > 0 ? (
                            qKpi.ultimas_respuestas_texto.map((item, tIdx) => (
                              <div
                                key={tIdx}
                                className="bg-slate-950/70 border-l-2 border-purple-500 p-2.5 rounded-r-lg text-xs text-slate-300 space-y-1"
                              >
                                <p className="italic">"{item.texto}"</p>
                                {item.fecha && (
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    {new Date(item.fecha).toLocaleDateString("es-PE")}
                                  </p>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500 italic py-2">
                              Aún no hay comentarios de texto para esta pregunta.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: GESTIÓN DE PREGUNTAS (ANCHO COMPLETO) */}
      {activeTab === "preguntas" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              <strong className="text-slate-100">{activeCount}</strong> preguntas activas visibles para los agricultores en el formulario de valoración
            </p>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2 cursor-pointer self-start sm:self-auto"
            >
              {Icons.plus("w-4 h-4")} Nueva pregunta
            </button>
          </div>

          <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-4 flex gap-3 text-sm text-blue-300">
            <div className="text-blue-400 shrink-0 mt-0.5">
              {Icons.info("w-4 h-4")}
            </div>
            <p className="leading-relaxed">
              Los cambios en la activación u orden de las preguntas se reflejan inmediatamente en el formulario de los agricultores. Las preguntas con respuestas históricas se desactivarán automáticamente para preservar la integridad de los datos.
            </p>
          </div>

          <div className="space-y-3">
            {questions
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((q, i) => (
                <div
                  key={q.id}
                  className={`metric-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    !q.active ? "opacity-60 bg-slate-900/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0 mt-0.5 sm:mt-0">
                      {i + 1}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="font-semibold text-slate-100 text-sm">{q.text}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`chip text-xs ${
                            q.type === "rating"
                              ? "status-warning"
                              : q.type === "text"
                              ? "status-ai"
                              : "status-water"
                          }`}
                        >
                          {typeLabels[q.type]}
                        </span>
                        {q.required && (
                          <span className="text-xs text-rose-400 font-semibold px-2 py-0.5 rounded-full bg-rose-950/40 border border-rose-800/60">
                            Obligatoria
                          </span>
                        )}
                        {!q.active && (
                          <span className="chip status-inactive text-xs">
                            Oculta
                          </span>
                        )}
                      </div>
                      {q.options && q.options.length > 0 && (
                        <p className="text-xs text-slate-400 font-mono pt-0.5 truncate">
                          Opciones: {q.options.join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 hidden sm:inline-block">
                        {q.active ? "Activa" : "Inactiva"}
                      </span>
                      <label
                        className="relative inline-flex items-center cursor-pointer"
                        title={q.active ? "Desactivar pregunta" : "Activar pregunta"}
                      >
                        <input
                          type="checkbox"
                          checked={q.active}
                          onChange={() => toggleActive(q.id)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModal(q)}
                      className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Editar pregunta"
                    >
                      {Icons.edit("w-4 h-4")}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(q.id)}
                      className="p-2 rounded-xl hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Eliminar pregunta"
                    >
                      {Icons.trash("w-4 h-4")}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {modal !== undefined && (
        <QuestionModal
          q={modal}
          onClose={() => setModal(undefined)}
          onSave={handleSaveQuestion}
        />
      )}
    </div>
  );
}
