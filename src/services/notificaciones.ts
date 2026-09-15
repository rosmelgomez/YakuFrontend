// src/services/notificaciones.ts
import { fetchFromFastAPI } from "@/lib/bff";
import type { AppNotification } from "@/lib/notifications";

export async function getNotificaciones(): Promise<AppNotification[]> {
  const res = await fetchFromFastAPI("/notificaciones");
  if (!res.ok) throw new Error("Error al obtener notificaciones");
  return res.json();
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  const res = await fetchFromFastAPI(`/notificaciones/${id}/leida`, { method: "POST" });
  if (!res.ok) throw new Error("Error al marcar la notificación como leída");
}

export async function marcarTodasLeidas(): Promise<void> {
  const res = await fetchFromFastAPI("/notificaciones/marcar-todas-leidas", { method: "POST" });
  if (!res.ok) throw new Error("Error al marcar las notificaciones como leídas");
}

export async function limpiarNotificaciones(): Promise<void> {
  const res = await fetchFromFastAPI("/notificaciones", { method: "DELETE" });
  if (!res.ok) throw new Error("Error al limpiar las notificaciones");
}
