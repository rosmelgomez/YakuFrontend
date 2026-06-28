// src/actions/admin.ts
"use server";

import { revalidatePath } from "next/cache";
import { fetchFromFastAPI } from "@/lib/bff";

// --- GESTIÓN DE USUARIOS (HU-30, HU-31) ---

export async function listarUsuarios() {
  const res = await fetchFromFastAPI("/admin/usuarios");
  if (!res.ok) {
    throw new Error(await res.text() || "Error al listar usuarios");
  }
  return res.json();
}

export async function cambiarEstadoUsuario(idUsuario: number, estado: boolean) {
  const res = await fetchFromFastAPI(`/admin/usuarios/${idUsuario}/estado/${estado}`, {
    method: "POST"
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al cambiar estado del usuario");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function cambiarRolUsuario(idUsuario: number, idRol: number) {
  const res = await fetchFromFastAPI(`/admin/usuarios/${idUsuario}/rol/${idRol}`, {
    method: "POST"
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al cambiar el rol del usuario");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

// --- STOCK E INVENTARIO DE HARDWARE (HU-05, HU-06, HU-07) ---

export async function listarDispositivosStock() {
  const res = await fetchFromFastAPI("/dispositivos/admin/stock");
  if (!res.ok) {
    throw new Error(await res.text() || "Error al listar dispositivos en stock");
  }
  return res.json();
}

export async function asignarDispositivoACultivo(dispositivoId: number, usuarioId: number, cultivoId: number) {
  const res = await fetchFromFastAPI(`/dispositivos/admin/asignar/${dispositivoId}/${usuarioId}/${cultivoId}`, {
    method: "POST"
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al asignar dispositivo");
  }
  revalidatePath('/dashboard/administrador');
  revalidatePath('/dashboard/agricultor/control');
  revalidatePath('/dashboard/agricultor');
  return res.json();
}

export async function liberarDispositivoAStock(dispositivoId: number) {
  const res = await fetchFromFastAPI(`/dispositivos/admin/liberar/${dispositivoId}`, {
    method: "POST"
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al liberar dispositivo a stock");
  }
  revalidatePath('/dashboard/administrador');
  revalidatePath('/dashboard/agricultor/control');
  revalidatePath('/dashboard/agricultor');
  return res.json();
}

export async function registrarRegion(nombre: string) {
  const res = await fetchFromFastAPI("/ubicacion/regiones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre })
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al registrar departamento");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function registrarProvincia(idRegion: number, nombre: string) {
  const res = await fetchFromFastAPI("/ubicacion/provincias", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_region: idRegion, nombre })
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al registrar provincia");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function registrarDistrito(idProvincia: number, nombre: string) {
  const res = await fetchFromFastAPI("/ubicacion/distritos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_provincia: idProvincia, nombre })
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al registrar distrito");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function registrarPlanta(
  nombre: string, 
  tipo?: string, 
  descripcion?: string,
  umbrales?: Array<{ id_tipo_metrica: number; valor_minimo: number | null; valor_maximo: number | null }>
) {
  const res = await fetchFromFastAPI("/plantas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, tipo, descripcion, umbrales })
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al registrar planta en el catálogo");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function actualizarParametrosPlanta(
  plantaId: number,
  umbrales: Array<{ id_tipo_metrica: number; valor_minimo: number | null; valor_maximo: number | null }>
) {
  const res = await fetchFromFastAPI(`/plantas/${plantaId}/umbrales`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(umbrales)
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al actualizar los parámetros de la planta");
  }
  revalidatePath('/dashboard/administrador/catalogo');
  return res.json();
}

export async function registrarDispositivo(payload: {
  id_tipo: number;
  nombre: string;
  mac_address?: string;
  client_id_mqtt?: string;
  topic_pub?: string;
  topic_sub?: string;
  id_almacen?: number;
  estado?: string;
  firmware_version?: string;
}) {
  const res = await fetchFromFastAPI("/dispositivos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al registrar dispositivo");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function registrarComponente(payload: {
  id_tipo_componente: number;
  numero_serie?: string;
  id_almacen?: number;
  estado?: string;
}) {
  const res = await fetchFromFastAPI("/dispositivos/componentes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al registrar componente");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function listarTiposDispositivo() {
  const res = await fetchFromFastAPI("/dispositivos/tipos");
  if (!res.ok) {
    throw new Error("Error al obtener tipos de dispositivo");
  }
  return res.json();
}

export async function listarTiposComponente() {
  const res = await fetchFromFastAPI("/dispositivos/componentes/tipos");
  if (!res.ok) {
    throw new Error("Error al obtener tipos de componente");
  }
  return res.json();
}

export async function listarComponentes() {
  const res = await fetchFromFastAPI("/dispositivos/componentes");
  if (!res.ok) {
    throw new Error("Error al obtener componentes");
  }
  return res.json();
}

export async function listarPlantas() {
  const res = await fetchFromFastAPI("/plantas");
  if (!res.ok) {
    throw new Error("Error al listar plantas");
  }
  return res.json();
}

export async function listarDispositivos() {
  const res = await fetchFromFastAPI("/dispositivos");
  if (!res.ok) {
    throw new Error("Error al listar dispositivos");
  }
  return res.json();
}

export async function registrarUsuario(payload: {
  nombre: string;
  apellido?: string;
  correo: string;
  contrasena: string;
  telefono?: string;
  id_rol: number;
}) {
  const res = await fetchFromFastAPI("/admin/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al registrar usuario");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function obtenerResumenAdmin() {
  const res = await fetchFromFastAPI("/admin/resumen");
  if (!res.ok) {
    throw new Error(await res.text() || "Error al obtener resumen de administración");
  }
  return res.json();
}

export async function asignarComponenteADispositivo(payload: {
  id_dispositivo: number;
  id_componente: number;
  pin_gpio: number;
  id_tipo_metrica?: number | number[] | null;
  id_fuente_agua?: number;
}) {
  const { id_tipo_metrica, ...rest } = payload;
  
  if (Array.isArray(id_tipo_metrica) && id_tipo_metrica.length > 0) {
    let lastRes: any = null;
    for (const metricaId of id_tipo_metrica) {
      const res = await fetchFromFastAPI("/dispositivos/admin/asignar-componente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          id_tipo_metrica: metricaId
        })
      });
      if (!res.ok) {
        throw new Error(await res.text() || "Error al asignar componente al dispositivo");
      }
      lastRes = await res.json();
    }
    revalidatePath('/dashboard/administrador');
    revalidatePath('/dashboard/agricultor/control');
    revalidatePath('/dashboard/agricultor');
    return lastRes;
  } else {
    const requestPayload = id_tipo_metrica == null
      ? rest
      : { ...rest, id_tipo_metrica };
    const res = await fetchFromFastAPI("/dispositivos/admin/asignar-componente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    });
    if (!res.ok) {
      throw new Error(await res.text() || "Error al asignar componente al dispositivo");
    }
    revalidatePath('/dashboard/administrador');
    revalidatePath('/dashboard/agricultor/control');
    revalidatePath('/dashboard/agricultor');
    return res.json();
  }
}

export async function obtenerSiguienteClientId() {
  const res = await fetchFromFastAPI("/dispositivos/siguiente-client-id");
  if (!res.ok) {
    throw new Error("Error al obtener el siguiente Client ID MQTT");
  }
  return res.json();
}

export async function listarTiposMetrica() {
  const res = await fetchFromFastAPI("/dispositivos/metricas");
  if (!res.ok) {
    throw new Error("Error al obtener tipos de métricas");
  }
  return res.json();
}

export async function liberarComponenteAStock(componenteId: number) {
  const res = await fetchFromFastAPI(`/dispositivos/admin/liberar-componente/${componenteId}`, {
    method: "POST"
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al liberar componente a stock");
  }
  revalidatePath('/dashboard/administrador');
  revalidatePath('/dashboard/agricultor/control');
  revalidatePath('/dashboard/agricultor');
  return res.json();
}

export async function actualizarAsignacionComponente(asignacionId: number, payload: {
  pin_gpio: number;
  id_tipo_metrica?: number | null;
  id_fuente_agua?: number;
}) {
  const res = await fetchFromFastAPI(`/dispositivos/admin/asignacion-componente/${asignacionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al actualizar asignación de componente");
  }
  revalidatePath('/dashboard/administrador/dispositivos');
  revalidatePath('/dashboard/agricultor/control');
  revalidatePath('/dashboard/agricultor');
  return res.json();
}

export async function desvincularComponenteDeDispositivo(dispositivoId: number, componenteId: number) {
  const res = await fetchFromFastAPI(`/dispositivos/admin/desvincular-componente/${dispositivoId}/${componenteId}`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al desvincular componente del dispositivo");
  }
  revalidatePath('/dashboard/administrador/dispositivos');
  revalidatePath('/dashboard/agricultor/control');
  revalidatePath('/dashboard/agricultor');
  return res.json();
}

export async function cambiarEstadoDispositivoStock(dispositivoId: number, nuevoEstado: string) {
  const res = await fetchFromFastAPI(`/dispositivos/admin/dispositivo/${dispositivoId}/estado/${nuevoEstado}`, {
    method: "POST"
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al cambiar estado del dispositivo");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

export async function cambiarEstadoComponenteStock(componenteId: number, nuevoEstado: string) {
  const res = await fetchFromFastAPI(`/dispositivos/admin/componente/${componenteId}/estado/${nuevoEstado}`, {
    method: "POST"
  });
  if (!res.ok) {
    throw new Error(await res.text() || "Error al cambiar estado del componente");
  }
  revalidatePath('/dashboard/administrador');
  return res.json();
}

