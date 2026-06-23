// src/actions/alertas.ts
"use server";

import { revalidatePath } from "next/cache";
import { fetchFromFastAPI } from "@/lib/bff";

export async function guardarUmbrales(userId: number, idCultivo: number, updates: { id: number, min: number, max: number }[]) {
  try {
    const res = await fetchFromFastAPI("/control/umbrales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCultivo, updates })
    });
    if (!res.ok) {
      throw new Error(await res.text() || "Error al actualizar umbrales en FastAPI");
    }
    revalidatePath('/dashboard/agricultor/alertas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al guardar." };
  }
}

export async function guardarNotifConfig(updates: { id_tipo_alerta: number, canal_email: boolean, canal_dashboard: boolean, recordatorio_minutos: number }[]) {
  try {
    const res = await fetchFromFastAPI("/dashboard/alertas/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates })
    });
    if (!res.ok) {
      throw new Error(await res.text() || "Error al actualizar configuración de notificaciones en FastAPI");
    }
    revalidatePath('/dashboard/agricultor/alertas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al guardar." };
  }
}

export async function getVapidPublicKey() {
  try {
    const res = await fetchFromFastAPI("/webpush/public-key");
    if (!res.ok) {
      throw new Error("Error al obtener la llave pública VAPID");
    }
    const data = await res.json();
    return { success: true, publicKey: data.publicKey };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al obtener llave pública." };
  }
}

export async function registrarSuscripcionPush(subscription: any) {
  try {
    const res = await fetchFromFastAPI("/webpush/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription)
    });
    if (!res.ok) {
      throw new Error(await res.text() || "Error al registrar la suscripción push en el servidor");
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar suscripción." };
  }
}
