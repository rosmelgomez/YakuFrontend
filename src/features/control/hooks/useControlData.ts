"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ControlData } from "../types";

interface UseControlDataOptions {
  initialData: ControlData;
  initialIdCultivo: number;
  activeTab: string;
}

export function useControlData({
  initialData,
  initialIdCultivo,
  activeTab,
}: UseControlDataOptions) {
  const [controlData, setControlData] = useState<ControlData>(initialData);
  const [idCultivo, setIdCultivo] = useState<number>(initialIdCultivo);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const cropIdRef = useRef<number>(initialIdCultivo);
  const isFetchingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    cropIdRef.current = idCultivo;
  }, [idCultivo]);

  useEffect(() => {
    setControlData(initialData);
    setIdCultivo(initialIdCultivo);
    cropIdRef.current = initialIdCultivo;
  }, [initialData, initialIdCultivo]);

  const fetchControlData = useCallback(async (targetCropId: number, silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!silent) setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`/api/control/${targetCropId}`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        if (cropIdRef.current === targetCropId) {
          setControlData(json.data);
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error al consultar datos de control vía GET:", err);
      }
    } finally {
      isFetchingRef.current = false;
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Polling periódico cuando la pestaña es 'actuadores'
  useEffect(() => {
    if (activeTab !== "actuadores") {
      return;
    }

    const intervalId = setInterval(() => {
      // Detener polling si la pestaña del navegador está oculta
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      fetchControlData(cropIdRef.current, true);
    }, 5000);

    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab === "actuadores") {
        fetchControlData(cropIdRef.current, true);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeTab, fetchControlData]);

  const selectCrop = useCallback(
    async (newCropId: number) => {
      setIdCultivo(newCropId);
      cropIdRef.current = newCropId;
      await fetchControlData(newCropId, false);
    },
    [fetchControlData]
  );

  const refresh = useCallback(() => {
    return fetchControlData(cropIdRef.current, true);
  }, [fetchControlData]);

  return {
    controlData,
    setControlData,
    idCultivo,
    isLoading,
    selectCrop,
    refresh,
  };
}
