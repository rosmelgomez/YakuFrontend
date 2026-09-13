"use client";

import { useState, useEffect, useCallback } from "react";
import { guardarUmbrales, obtenerDatosAlertaPorCultivo } from "@/actions/alertas";
import { filtrarUmbralesSueloAmbiente } from "../selectors";

interface UseUmbralesFormOptions {
  userId: number;
  idCultivo: number;
  initialUmbrales?: any[];
}

export function useUmbralesForm({
  userId,
  idCultivo,
  initialUmbrales = [],
}: UseUmbralesFormOptions) {
  const [umbrales, setUmbrales] = useState<any[]>(filtrarUmbralesSueloAmbiente(initialUmbrales));
  const [originalUmbrales, setOriginalUmbrales] = useState<any[]>(
    filtrarUmbralesSueloAmbiente(initialUmbrales)
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showRecommendBanner, setShowRecommendBanner] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (!idCultivo) return;

    if (initialUmbrales && initialUmbrales.length > 0) {
      const clean = filtrarUmbralesSueloAmbiente(initialUmbrales);
      setUmbrales(clean);
      setOriginalUmbrales(clean);
      return;
    }

    setIsLoading(true);
    obtenerDatosAlertaPorCultivo(idCultivo)
      .then((res: any) => {
        if (!cancelled && res.success && res.data) {
          const clean = filtrarUmbralesSueloAmbiente(res.data.umbrales || []);
          setUmbrales(clean);
          setOriginalUmbrales(clean);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idCultivo, initialUmbrales]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDefault =
      umbrales &&
      umbrales.length > 0 &&
      umbrales.every((u: any) => Number(u.min) === 10 && Number(u.max) === 90);
    const confirmed =
      localStorage.getItem(`confirmed_default_${userId}_${idCultivo}`) === "true";
    setShowRecommendBanner(isDefault && !confirmed);
  }, [umbrales, userId, idCultivo]);

  const confirmDefault = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`confirmed_default_${userId}_${idCultivo}`, "true");
    }
    setShowRecommendBanner(false);
  }, [userId, idCultivo]);

  const onSliderChange = useCallback((id: number, val: number[]) => {
    setUmbrales((prev) =>
      prev.map((u) => (u.id === id ? { ...u, min: val[0], max: val[1] } : u))
    );
  }, []);

  const onMinChange = useCallback((id: number, valStr: string) => {
    const val = valStr === "" ? "" : Number(valStr);
    setUmbrales((prev) =>
      prev.map((u) => (u.id === id ? { ...u, min: val } : u))
    );
  }, []);

  const onMaxChange = useCallback((id: number, valStr: string) => {
    const val = valStr === "" ? "" : Number(valStr);
    setUmbrales((prev) =>
      prev.map((u) => (u.id === id ? { ...u, max: val } : u))
    );
  }, []);

  const onInputBlur = useCallback((id: number, field: "min" | "max") => {
    setUmbrales((prev) => {
      const target = prev.find((u) => u.id === id);
      if (!target) return prev;

      let val = Number(target[field]);
      if (isNaN(val)) val = field === "min" ? 10 : 90;
      val = Math.max(0, Math.min(100, val));

      return prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, [field]: val };
          if (field === "min" && updated.min > updated.max) {
            updated.max = updated.min;
          } else if (field === "max" && updated.max < updated.min) {
            updated.min = updated.max;
          }
          return updated;
        }
        return u;
      });
    });
  }, []);

  const saveUmbrales = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates = umbrales.map((u: any) => ({
        id: u.id,
        min: Number(u.min) || 0,
        max: Number(u.max) || 0,
      }));
      const res = await guardarUmbrales(userId, idCultivo, updates);
      if (res.success) {
        setOriginalUmbrales(umbrales);
        setIsEditing(false);
        return { success: true };
      } else {
        alert(`Error al guardar: ${res.error}`);
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      alert("Error al conectar con el servidor.");
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  }, [userId, idCultivo, umbrales]);

  const cancelEditing = useCallback(() => {
    setUmbrales(originalUmbrales);
    setIsEditing(false);
  }, [originalUmbrales]);

  const loadUmbralesForCrop = useCallback(async (cropId: number) => {
    setIsLoading(true);
    try {
      const res: any = await obtenerDatosAlertaPorCultivo(cropId);
      if (res.success && res.data) {
        const clean = filtrarUmbralesSueloAmbiente(res.data.umbrales || []);
        setUmbrales(clean);
        setOriginalUmbrales(clean);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Error al cargar umbrales:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    umbrales,
    isEditing,
    setIsEditing,
    isSaving,
    isLoading,
    showRecommendBanner,
    confirmDefault,
    onSliderChange,
    onMinChange,
    onMaxChange,
    onInputBlur,
    saveUmbrales,
    cancelEditing,
    loadUmbralesForCrop,
  };
}
