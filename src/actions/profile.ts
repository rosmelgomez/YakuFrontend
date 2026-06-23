"use server";

import { revalidatePath } from "next/cache";
import { fetchFromFastAPI } from "@/lib/bff";

export async function obtenerPerfil() {
  const res = await fetchFromFastAPI("/auth/perfil");
  if (!res.ok) {
    throw new Error("Error al obtener el perfil");
  }
  return res.json();
}

export async function actualizarPerfil(payload: {
  nombre: string;
  apellido?: string;
  correo: string;
  telefono?: string;
  contrasena?: string;
}) {
  const res = await fetchFromFastAPI("/auth/perfil", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    let detail = "Error al actualizar el perfil";
    try {
      const errorJson = JSON.parse(errorText);
      detail = errorJson.detail || detail;
    } catch (e) {}
    throw new Error(detail);
  }
  
  try {
    revalidatePath('/dashboard/agricultor');
    revalidatePath('/dashboard/agricultor/perfil');
  } catch {}
  return res.json();
}
