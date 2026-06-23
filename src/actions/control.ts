// src/actions/control.ts
"use server";

import { revalidatePath } from "next/cache";
import { fetchFromFastAPI } from "@/lib/bff";

export async function setModoOperacion(userId: number, idCultivo: number, idBomba: number, modo: 'manual' | 'predictivo' | 'programado') {
  const res = await fetchFromFastAPI("/control/modo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idCultivo, idBomba, modo })
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al establecer modo de operación");
  }
  revalidatePath('/dashboard/agricultor/control');
  revalidatePath('/dashboard/agricultor');
}

export async function toggleHorario(idHorario: number, activo: boolean) {
  const res = await fetchFromFastAPI(`/control/horario/${idHorario}/toggle`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activo })
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al cambiar estado del horario");
  }
  revalidatePath('/dashboard/agricultor/control');
}

export async function eliminarHorario(idHorario: number) {
  const res = await fetchFromFastAPI(`/control/horario/${idHorario}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al eliminar horario");
  }
  revalidatePath('/dashboard/agricultor/control');
}

export async function agregarHorario(userId: number, idBomba: number, hora: string, min: number, dias: boolean[], nombre: string) {
  const res = await fetchFromFastAPI("/control/horario", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idBomba, hora, duracionMin: min, dias, nombre })
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al agregar horario");
  }
  revalidatePath('/dashboard/agricultor/control');
}

export async function triggerBombaManual(userId: number, idBomba: number, duracionSeg: number) {
  // Enviar comando para encender la bomba
  const res = await fetchFromFastAPI("/control/bomba/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idBomba, encender: true })
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al forzar bomba");
  }
  revalidatePath('/dashboard/agricultor/control');
}

export async function toggleBombaManual(userId: number, idBomba: number, encender: boolean) {
  const res = await fetchFromFastAPI("/control/bomba/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idBomba, encender })
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al conmutar bomba");
  }
  revalidatePath('/dashboard/agricultor/control');
  revalidatePath('/dashboard/agricultor'); 
}

export async function actualizarTiempoMaximoRele(idCultivo: number, duracionMaxMinutos: number) {
  const res = await fetchFromFastAPI("/control/configuracion/rele", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idCultivo, duracionMaxMinutos })
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al actualizar el tiempo maximo del rele");
  }
  revalidatePath('/dashboard/agricultor/control');
  revalidatePath('/dashboard/agricultor');
  return res.json();
}

export async function toggleCapturaDatos(userId: number, dispositivoId: number, active: boolean) {
  try {
    const res = await fetchFromFastAPI(`/dispositivos/funcionamiento/${dispositivoId}/${active ? 'activo' : 'desactivado'}`, {
      method: 'POST'
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Error en comunicación con backend FastAPI');
    }

    revalidatePath('/dashboard/agricultor/control');
    revalidatePath('/dashboard/agricultor');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error de red o comunicación' };
  }
}

export async function calibrarSensor(dispositivoId: number, pinGpio: number, offset: number) {
  try {
    const res = await fetchFromFastAPI(`/dispositivos/calibrar/${dispositivoId}/${pinGpio}/${offset}`, {
      method: "POST"
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Error en comunicación con backend FastAPI");
    }
    revalidatePath('/dashboard/agricultor/control');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al calibrar" };
  }
}
