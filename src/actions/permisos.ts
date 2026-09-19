// src/actions/permisos.ts

import { fetchFromFastAPI } from "@/lib/bff";

async function parseErrorText(res: any): Promise<string> {
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.detail === "string") return parsed.detail;
    } catch {
      // Not JSON
    }
    return text || res.statusText || "Error en el servidor";
  } catch {
    return "Error desconocido";
  }
}

export async function listarCatalogoPermisos() {
  try {
    const res = await fetchFromFastAPI("/admin/permisos");
    if (!res.ok) return { success: false, error: await parseErrorText(res) };
    return { success: true, data: await res.json() };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al listar el catálogo de permisos" };
  }
}

export async function listarPermisosUsuario(idUsuario: number) {
  try {
    const res = await fetchFromFastAPI(`/admin/usuarios/${idUsuario}/permisos`);
    if (!res.ok) return { success: false, error: await parseErrorText(res) };
    return { success: true, data: await res.json() };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al listar los permisos del usuario" };
  }
}

export async function asignarPermisosUsuario(idUsuario: number, codigos: string[]) {
  try {
    const res = await fetchFromFastAPI(`/admin/usuarios/${idUsuario}/permisos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigos }),
    });
    if (!res.ok) return { success: false, error: await parseErrorText(res) };
    return { success: true, data: await res.json() };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al asignar los permisos" };
  }
}
