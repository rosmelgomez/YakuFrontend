"use client";

import { useEffect } from "react";

interface UseControlEventsOptions {
  activeCropId: number;
  onControlUpdate: () => void;
}

export function useControlEvents({
  activeCropId,
  onControlUpdate,
}: UseControlEventsOptions) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleControlUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      if (!detail) return;

      if (!detail.id_cultivo || Number(detail.id_cultivo) === Number(activeCropId)) {
        onControlUpdate();
      }
    };

    window.addEventListener("yaku:control_update", handleControlUpdate);
    return () => {
      window.removeEventListener("yaku:control_update", handleControlUpdate);
    };
  }, [activeCropId, onControlUpdate]);
}
