// src/actions/crops.ts
"use server";

import { revalidatePath } from "next/cache";
import { fetchFromFastAPI } from "@/lib/bff";

export async function registrarCultivo(payload: {
  id_planta?: number;
  id_fuente_agua?: number;
  id_distrito?: number;
  lugar?: string;
  nombre_planta: string;
  etapa_crecimiento?: string;
  area_m2?: number;
  fecha_siembra?: string; // yyyy-mm-dd
}) {
  const res = await fetchFromFastAPI("/ubicacion/cultivos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al registrar el cultivo");
  }
  revalidatePath('/dashboard/agricultor');
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function listarPlantas() {
  const res = await fetchFromFastAPI("/plantas");
  if (!res.ok) {
    throw new Error("Error al obtener catálogo de plantas");
  }
  return res.json();
}

export async function listarRegiones() {
  const res = await fetchFromFastAPI("/ubicacion/regiones");
  if (!res.ok) {
    throw new Error("Error al obtener departamentos");
  }
  return res.json();
}

export async function listarProvincias(idRegion: number) {
  const res = await fetchFromFastAPI(`/ubicacion/provincias/${idRegion}`);
  if (!res.ok) {
    throw new Error("Error al obtener provincias");
  }
  return res.json();
}

export async function listarDistritos(idProvincia: number) {
  const res = await fetchFromFastAPI(`/ubicacion/distritos/${idProvincia}`);
  if (!res.ok) {
    throw new Error("Error al obtener distritos");
  }
  return res.json();
}

export async function listarTodasProvincias() {
  const res = await fetchFromFastAPI("/ubicacion/provincias");
  if (!res.ok) {
    throw new Error("Error al obtener todas las provincias");
  }
  return res.json();
}

export async function listarTodosDistritos() {
  const res = await fetchFromFastAPI("/ubicacion/distritos");
  if (!res.ok) {
    throw new Error("Error al obtener todos los distritos");
  }
  return res.json();
}

export async function listarFuentesAgua() {
  const res = await fetchFromFastAPI("/ubicacion/fuentes-agua");
  if (!res.ok) {
    throw new Error("Error al obtener fuentes de agua");
  }
  return res.json();
}

export async function registrarFuenteAgua(payload: {
  nombre: string;
  tipo: string;
  capacidad_litros?: number;
  altura_tanque_cm?: number;
  altura_seguridad_cm?: number;
}) {
  const res = await fetchFromFastAPI("/ubicacion/fuentes-agua", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al registrar la fuente de agua");
  }
  revalidatePath('/dashboard/agricultor');
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function listarTodosCultivos() {
  const res = await fetchFromFastAPI("/ubicacion/cultivos");
  if (!res.ok) {
    throw new Error("Error al obtener la lista de cultivos");
  }
  return res.json();
}

