"use server";

import { revalidatePath } from "next/cache";
import { fetchFromFastAPI } from "@/lib/bff";

export async function listarAlmacenes() {
  const res = await fetchFromFastAPI("/almacenes");
  if (!res.ok) {
    throw new Error(await res.text() || "Error al listar almacenes");
  }
  return res.json();
}

export async function registrarAlmacen(payload: {
  nombre: string;
  id_distrito?: number;
  direccion?: string;
}) {
  const res = await fetchFromFastAPI("/almacenes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al registrar almacén");
  }
  revalidatePath("/dashboard/administrador");
  return res.json();
}

export async function eliminarAlmacen(idAlmacen: number) {
  const res = await fetchFromFastAPI(`/almacenes/${idAlmacen}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al eliminar almacén");
  }
  revalidatePath("/dashboard/administrador");
  return res.json();
}
